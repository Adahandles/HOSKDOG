/**
 * HOSKDOG Deposit Server
 * 
 * This Express server provides secure proxy endpoints for building and submitting
 * Cardano transactions for ADA deposits. It keeps the Blockfrost API key secret
 * on the server side so the client never needs to know it.
 * 
 * Endpoints:
 *   POST /api/build-tx  - Build an unsigned transaction for the wallet to sign
 *   POST /api/submit    - Submit a signed transaction to the network
 *   GET  /api/health    - Health check
 * 
 * IMPORTANT: Do not expose this server publicly without proper authentication,
 * rate limiting, and origin restrictions. See README.md for security notes.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Lucid, Blockfrost } = require('lucid-cardano');

// Import database modules (optional - will gracefully handle if not available)
let db, redisClient;
try {
  db = require('../database/db');
  redisClient = require('../database/redis');
  console.log('✅ Database modules loaded');
} catch (err) {
  console.log('ℹ️  Database modules not available - running without DB/Redis');
}

const app = express();
const PORT = process.env.PORT || 4000;

// The HOSKDOG receiving address for deposits
// In production, lock this down so the API can only build transactions to this address
const HOSKDOG_RECEIVING_ADDRESS = process.env.HOSKDOG_RECEIVING_ADDRESS || 
  'addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k';

// Network configuration
const NETWORK = process.env.NETWORK || 'Mainnet';
const BLOCKFROST_KEY = process.env.BLOCKFROST_KEY;

// Validate configuration at startup
if (!BLOCKFROST_KEY || BLOCKFROST_KEY.includes('YOUR_BLOCKFROST')) {
  console.error('❌ ERROR: BLOCKFROST_KEY is not configured properly in .env');
  console.error('   Get a free key from https://blockfrost.io');
  console.error('   Copy server/.env.example to server/.env and fill in your key.');
  // Don't exit, allow server to start for development, but endpoints will fail
}

// CORS configuration
// For production, restrict to your frontend domain only!
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // ⚠️ Change to your domain in production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Lucid with Blockfrost provider
let lucidPromise = null;

async function getLucid() {
  if (lucidPromise) return lucidPromise;
  
  lucidPromise = (async () => {
    const blockfrostUrl = NETWORK === 'Mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : 'https://cardano-preprod.blockfrost.io/api/v0';
    
    const provider = new Blockfrost(blockfrostUrl, BLOCKFROST_KEY);
    const lucid = await Lucid.new(provider, NETWORK);
    return lucid;
  })();
  
  return lucidPromise;
}

/**
 * Health Check Endpoint
 * 
 * Note: This endpoint is intentionally NOT rate-limited at the application level
 * because it's used by monitoring systems and load balancers. Rate limiting is
 * handled at the Nginx level via separate configuration (see nginx/conf.d/hoskdog.conf).
 * The database queries here are minimal (SELECT NOW()) and pose no security risk.
 */
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    service: 'HOSKDOG Deposit Server',
    network: NETWORK,
    timestamp: new Date().toISOString(),
    configured: !!BLOCKFROST_KEY && !BLOCKFROST_KEY.includes('YOUR_BLOCKFROST')
  };

  // Check database health if available
  if (db) {
    try {
      const dbHealth = await db.healthCheck();
      health.database = dbHealth;
    } catch (err) {
      health.database = { healthy: false, error: err.message };
      health.status = 'DEGRADED';
    }
  }

  // Check Redis health if available
  if (redisClient && redisClient.client.isOpen) {
    try {
      await redisClient.client.ping();
      health.redis = { healthy: true };
    } catch (err) {
      health.redis = { healthy: false, error: err.message };
      health.status = 'DEGRADED';
    }
  }

  res.json(health);
});

/**
 * Build Transaction Endpoint
 * 
 * Accepts a sender address and amount, builds an unsigned transaction
 * sending ADA to the HOSKDOG receiving address.
 * 
 * Request body:
 *   { senderAddress: string, lovelace: string }
 * 
 * Response:
 *   { unsignedTxCborHex: string, estimatedFee: string, recipient: string }
 */
app.post('/api/build-tx', async (req, res) => {
  try {
    const { senderAddress, lovelace } = req.body;
    
    // Validate inputs
    if (!senderAddress || typeof senderAddress !== 'string') {
      return res.status(400).json({ error: 'senderAddress is required' });
    }
    
    if (!lovelace || typeof lovelace !== 'string') {
      return res.status(400).json({ error: 'lovelace amount is required as string' });
    }
    
    const lovelaceNum = BigInt(lovelace);
    if (lovelaceNum <= 0n) {
      return res.status(400).json({ error: 'lovelace must be positive' });
    }
    
    // Minimum ADA check (1 ADA = 1,000,000 lovelace)
    const MIN_LOVELACE = 1000000n; // 1 ADA minimum
    if (lovelaceNum < MIN_LOVELACE) {
      return res.status(400).json({ error: 'Minimum deposit is 1 ADA (1000000 lovelace)' });
    }
    
    // Check if Blockfrost is configured
    if (!BLOCKFROST_KEY || BLOCKFROST_KEY.includes('YOUR_BLOCKFROST')) {
      return res.status(503).json({ 
        error: 'Server not configured', 
        details: 'Blockfrost API key not set. See server/.env.example' 
      });
    }
    
    const lucid = await getLucid();
    
    // Select sender's wallet (use their address to query UTxOs)
    lucid.selectWalletFrom({ address: senderAddress });
    
    // Validate sender address format
    try {
      lucid.utils.getAddressDetails(senderAddress);
    } catch (addrErr) {
      return res.status(400).json({ error: 'Invalid sender address format' });
    }
    
    // Validate that the sender address network matches our network
    const senderNetworkId = senderAddress.startsWith('addr_test') || senderAddress.startsWith('addr_test1') ? 0 : 1;
    const expectedNetworkId = NETWORK === 'Mainnet' ? 1 : 0;
    if (senderNetworkId !== expectedNetworkId) {
      return res.status(400).json({ 
        error: 'Network mismatch',
        details: `Server is on ${NETWORK}, but sender address is for ${senderNetworkId === 0 ? 'Testnet' : 'Mainnet'}`
      });
    }
    
    // Build the transaction
    const tx = await lucid
      .newTx()
      .payToAddress(HOSKDOG_RECEIVING_ADDRESS, { lovelace: lovelaceNum })
      .complete();
    
    // Get the unsigned transaction CBOR
    const unsignedTxCborHex = tx.toString();
    
    // Estimate fee from the transaction body
    const estimatedFee = tx.txComplete.body().fee().to_str();
    
    console.log(`[build-tx] Sender: ${senderAddress.substring(0, 20)}...`);
    console.log(`[build-tx] Amount: ${lovelace} lovelace, Fee: ${estimatedFee}`);
    
    res.json({
      unsignedTxCborHex,
      estimatedFee,
      recipient: HOSKDOG_RECEIVING_ADDRESS,
      network: NETWORK
    });
    
  } catch (error) {
    console.error('[build-tx] Error:', error.message);
    
    // Handle common errors
    if (error.message.includes('UTxO')) {
      return res.status(400).json({ 
        error: 'Insufficient funds or no UTxOs available',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to build transaction',
      details: error.message 
    });
  }
});

/**
 * Submit Transaction Endpoint
 * 
 * Accepts a signed transaction CBOR and submits it to the Cardano network.
 * 
 * Request body:
 *   { signedTxCborHex: string, senderAddress?: string, amount?: string }
 * 
 * Response:
 *   { txHash: string, explorerUrl: string }
 */
app.post('/api/submit', async (req, res) => {
  try {
    const { signedTxCborHex, senderAddress, amount } = req.body;
    
    if (!signedTxCborHex || typeof signedTxCborHex !== 'string') {
      return res.status(400).json({ error: 'signedTxCborHex is required' });
    }
    
    // Check if Blockfrost is configured
    if (!BLOCKFROST_KEY || BLOCKFROST_KEY.includes('YOUR_BLOCKFROST')) {
      return res.status(503).json({ 
        error: 'Server not configured', 
        details: 'Blockfrost API key not set. See server/.env.example' 
      });
    }
    
    const lucid = await getLucid();
    
    // Create a signed transaction object from CBOR
    const signedTx = lucid.fromTx(signedTxCborHex);
    
    // Submit the transaction
    const txHash = await signedTx.submit();
    
    console.log(`[submit] Transaction submitted: ${txHash}`);
    
    // Log deposit to database if available
    if (db && senderAddress && amount) {
      try {
        const tx = signedTx.txComplete;
        const fee = tx.body().fee().to_str();
        
        await db.query(
          `INSERT INTO deposit_history (wallet_address, tx_hash, amount_ada, fee_ada, status) 
           VALUES ($1, $2, $3, $4, $5)`,
          [senderAddress, txHash, amount, fee, 'completed']
        );
        console.log(`[submit] Deposit logged to database for ${senderAddress}`);
      } catch (dbErr) {
        console.error('[submit] Failed to log deposit to database:', dbErr.message);
        // Don't fail the request if DB logging fails
      }
    }
    
    const explorerUrl = NETWORK === 'Mainnet'
      ? `https://cardanoscan.io/transaction/${txHash}`
      : `https://preprod.cardanoscan.io/transaction/${txHash}`;
    
    res.json({
      txHash,
      explorerUrl,
      network: NETWORK
    });
    
  } catch (error) {
    console.error('[submit] Error:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to submit transaction',
      details: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log('\n🚽 HOSKDOG Deposit Server');
  console.log('========================');
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  
  if (!BLOCKFROST_KEY || BLOCKFROST_KEY.includes('YOUR_BLOCKFROST')) {
    console.log('\n⚠️  WARNING: Blockfrost API key not configured!');
    console.log('   Copy server/.env.example to server/.env and add your key.');
  } else {
    console.log(`✅ Blockfrost configured`);
  }
  
  console.log(`📥 Receiving address: ${HOSKDOG_RECEIVING_ADDRESS.substring(0, 30)}...`);
  console.log('\n');
});

module.exports = app;
