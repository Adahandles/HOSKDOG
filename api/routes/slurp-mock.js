import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, '../../config/faucet-settings.json'), 'utf8')
);

const router = express.Router();

// 🧪 MOCK SLURP IMPLEMENTATION
// This simulates transactions without requiring Lucid or Blockfrost
// Perfect for testing wallet connection, eligibility, and UI flow

// Perform slurp (send tokens) - MOCK VERSION
router.post('/slurp', async (req, res) => {
  try {
    const { address, tier } = req.body;

    if (!address || !tier) {
      return res.status(400).json({ error: 'Address and tier are required' });
    }

    console.log(`🚽 Processing MOCK slurp for ${address}, tier: ${tier}`);

    // Validate tier
    if (!['meme', 'ada'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Check rate limiting (if enabled)
    if (config.faucet.rateLimiting.enabled) {
      const hasClaimedToday = await checkRecentClaims(address);
      if (hasClaimedToday) {
        return res.status(429).json({ error: 'Already claimed today. Please wait 24 hours.' });
      }
    }

    // Determine reward amount
    const rewardAmount = tier === 'meme' 
      ? config.faucet.rewards.memeHolders 
      : config.faucet.rewards.adaOnly;

    // 🎭 SIMULATE transaction validation
    console.log('✅ [MOCK] Validating transaction parameters...');
    
    // Basic address validation
    if (!address.startsWith('addr')) {
      return res.status(400).json({ 
        error: 'Invalid address format',
        details: 'Address must start with "addr"'
      });
    }

    // 🎭 SIMULATE sending HKDG tokens
    const txResult = await mockSendHKDGTokens(address, rewardAmount, tier);

    if (!txResult.success) {
      throw new Error('Mock transaction failed');
    }

    const txHash = txResult.txHash;

    // Log the slurp
    await logSlurp({
      address,
      tier,
      amount: rewardAmount,
      txHash,
      timestamp: Date.now()
    });

    console.log(`✅ Mock slurp completed: ${formatTokenAmount(rewardAmount)} HKDG → ${address}`);

    res.json({
      success: true,
      txHash,
      explorerUrl: txResult.explorerUrl,
      amount: formatTokenAmount(rewardAmount),
      message: `Successfully sent ${formatTokenAmount(rewardAmount)} HKDG to your wallet!`,
      note: '[MOCK MODE] This is a simulated transaction for testing purposes'
    });

  } catch (error) {
    console.error('Mock slurp error:', error);
    res.status(500).json({ 
      error: 'Slurp failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🎭 Mock token transfer function
async function mockSendHKDGTokens(recipientAddress, amount, tier) {
  try {
    console.log(`🏗️  [MOCK] Building transaction:`);
    console.log(`   📍 To: ${recipientAddress}`);
    console.log(`   🪙 Amount: ${formatTokenAmount(amount)} HKDG`);
    console.log(`   🎯 Tier: ${tier}`);
    console.log(`   🔑 Policy ID: ${process.env.HKDG_POLICY_ID}`);
    
    // Simulate network processing time
    console.log('⏳ [MOCK] Simulating blockchain processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate realistic-looking mock transaction hash
    const mockTxHash = generateMockTxHash();
    
    console.log('✅ [MOCK] Transaction submitted successfully');
    console.log(`   🔗 TX Hash: ${mockTxHash}`);
    
    return {
      success: true,
      txHash: mockTxHash,
      explorerUrl: process.env.CARDANO_NETWORK === 'mainnet'
        ? `https://cardanoscan.io/transaction/${mockTxHash}`
        : `https://preprod.cardanoscan.io/transaction/${mockTxHash}`
    };
    
  } catch (error) {
    console.error('❌ Mock transaction failed:', error);
    return { success: false, error: error.message };
  }
}

// Generate realistic mock transaction hash
function generateMockTxHash() {
  // Generate a 64-character hex string that looks like a real Cardano TX hash
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

// Log slurp to history file
async function logSlurp(slurpData) {
  try {
    const historyPath = path.join(__dirname, '../../logs/slurp-history.json');
    
    let history = [];
    if (await fs.pathExists(historyPath)) {
      history = await fs.readJson(historyPath);
    }

    history.push({
      ...slurpData,
      id: history.length + 1,
      date: new Date().toISOString(),
      mode: 'mock' // Flag to indicate this was a test transaction
    });

    await fs.writeJson(historyPath, history, { spaces: 2 });
    console.log(`📝 Logged mock slurp for ${slurpData.address}`);
  } catch (error) {
    console.error('Error logging slurp:', error);
  }
}

// Check if address has claimed recently
async function checkRecentClaims(address) {
  try {
    const slurpHistoryPath = path.join(__dirname, '../../logs/slurp-history.json');
    
    if (!await fs.pathExists(slurpHistoryPath)) {
      return false;
    }

    const history = await fs.readJson(slurpHistoryPath);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentClaim = history.find(claim => 
      claim.address === address && 
      claim.timestamp > oneDayAgo
    );

    return !!recentClaim;
  } catch (error) {
    console.error('Error checking recent claims:', error);
    return false;
  }
}

// Format token amount for display
function formatTokenAmount(amount) {
  return (amount / Math.pow(10, config.faucet.token.decimals)).toLocaleString();
}

// Get faucet status endpoint - MOCK VERSION
router.get('/faucet-status', async (req, res) => {
  try {
    // Mock faucet balance
    const mockBalance = {
      ada: 25.5,
      hkdg: 100000000, // 100M HKDG tokens
      utxos: 5
    };
    
    res.json({
      status: 'operational (mock mode)',
      balance: {
        ada: mockBalance.ada,
        hkdg: formatTokenAmount(mockBalance.hkdg),
        hkdgRaw: mockBalance.hkdg,
        utxos: mockBalance.utxos
      },
      network: process.env.CARDANO_NETWORK || 'mainnet',
      canOperate: true,
      mode: 'mock',
      note: 'Using simulated transactions for testing'
    });
  } catch (error) {
    console.error('Error getting mock faucet status:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to get faucet status'
    });
  }
});

// Get slurp statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const historyPath = path.join(__dirname, '../../logs/slurp-history.json');
    
    if (!await fs.pathExists(historyPath)) {
      return res.json({
        totalSlurps: 0,
        uniqueAddresses: 0,
        totalDistributed: '0',
        memeHolderSlurps: 0,
        adaOnlySlurps: 0,
        mode: 'mock'
      });
    }

    const history = await fs.readJson(historyPath);
    const uniqueAddresses = new Set(history.map(s => s.address)).size;
    const totalDistributed = history.reduce((sum, s) => sum + s.amount, 0);
    const memeHolderSlurps = history.filter(s => s.tier === 'meme').length;
    const adaOnlySlurps = history.filter(s => s.tier === 'ada').length;
    const mockSlurps = history.filter(s => s.mode === 'mock').length;

    res.json({
      totalSlurps: history.length,
      uniqueAddresses,
      totalDistributed: formatTokenAmount(totalDistributed),
      memeHolderSlurps,
      adaOnlySlurps,
      mockSlurps,
      lastSlurp: history.length > 0 ? history[history.length - 1].date : null,
      mode: 'mock'
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;