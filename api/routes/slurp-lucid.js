import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { Lucid, Blockfrost, fromText, toUnit } from 'lucid-cardano';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Load config (need to use JSON import in ES modules)
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, '../../config/faucet-settings.json'), 'utf8')
);

// 💸 PRODUCTION SLURP IMPLEMENTATION
// Real Cardano transactions using Lucid + Blockfrost/Koios

let lucidInstance = null;

// Initialize Lucid with Blockfrost provider
async function initializeLucid() {
  if (lucidInstance) return lucidInstance;

  try {
    const provider = new Blockfrost(
      process.env.CARDANO_NETWORK === 'mainnet' 
        ? 'https://cardano-mainnet.blockfrost.io/api/v0'
        : 'https://cardano-preprod.blockfrost.io/api/v0',
      process.env.BLOCKFROST_API_KEY
    );

    lucidInstance = await Lucid.new(provider, process.env.CARDANO_NETWORK || 'mainnet');
    
    // Set the faucet wallet
    lucidInstance.selectWalletFromPrivateKey(process.env.FAUCET_SKEY);
    
    console.log('✅ Lucid initialized successfully');
    console.log('🔗 Network:', process.env.CARDANO_NETWORK || 'mainnet');
    console.log('💰 Faucet Address:', await lucidInstance.wallet.address());
    
    return lucidInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Lucid:', error.message);
    throw error;
  }
}

// Perform slurp (send tokens) - PRODUCTION VERSION
router.post('/slurp', async (req, res) => {
  try {
    const { address, tier } = req.body;

    if (!address || !tier) {
      return res.status(400).json({ error: 'Address and tier are required' });
    }

    console.log(`🚽 Processing REAL slurp for ${address}, tier: ${tier}`);

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

    // 🔍 Validate transaction before attempting
    const validation = await validateTransaction(address, rewardAmount);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Transaction validation failed',
        details: validation.error
      });
    }

    // 💸 Send real HKDG tokens using Lucid + Cardano
    const txResult = await sendHKDGTokens(
      address, 
      rewardAmount, 
      `HOSKDOG Faucet - ${tier} tier reward`
    );

    if (!txResult.success) {
      throw new Error('Transaction failed');
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

    console.log(`✅ Real slurp completed: ${formatTokenAmount(rewardAmount)} HKDG → ${address}`);
    console.log(`   🔗 TX Hash: ${txHash}`);

    res.json({
      success: true,
      txHash,
      explorerUrl: txResult.explorerUrl,
      amount: formatTokenAmount(rewardAmount),
      message: `Successfully sent ${formatTokenAmount(rewardAmount)} HKDG to your wallet!`,
      note: 'Real Cardano transaction - tokens will appear in your wallet within 1-2 minutes'
    });

  } catch (error) {
    console.error('Production slurp error:', error);
    res.status(500).json({ 
      error: 'Slurp failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 💸 Real token transfer using Lucid
async function sendHKDGTokens(recipientAddress, amount, memo = '') {
  try {
    const lucid = await initializeLucid();
    
    // Create the asset unit (policy ID + asset name)
    const assetUnit = toUnit(
      process.env.HKDG_POLICY_ID || config.faucet.token.policyId,
      fromText(config.faucet.token.assetName)
    );
    
    console.log(`🏗️  Building REAL transaction:`);
    console.log(`   📍 To: ${recipientAddress}`);
    console.log(`   🪙 Amount: ${formatTokenAmount(amount)} ${config.faucet.token.assetName}`);
    console.log(`   🔑 Asset Unit: ${assetUnit}`);
    
    // Build transaction
    const tx = await lucid
      .newTx()
      .payToAddress(recipientAddress, { 
        [assetUnit]: BigInt(amount)
      })
      .addSigner(await lucid.wallet.address()) // Sign with faucet wallet
      .complete();

    console.log('📝 Transaction built successfully');
    
    // Sign transaction
    const signedTx = await tx.sign().complete();
    console.log('✍️  Transaction signed');
    
    // Submit transaction
    const txHash = await signedTx.submit();
    console.log('🚀 Transaction submitted to Cardano network:', txHash);
    
    // Optional: Wait for confirmation (comment out for faster response)
    // console.log('⏳ Waiting for blockchain confirmation...');
    // await lucid.awaitTx(txHash);
    // console.log('✅ Transaction confirmed on blockchain');
    
    return {
      success: true,
      txHash,
      explorerUrl: process.env.CARDANO_NETWORK === 'mainnet'
        ? `https://cardanoscan.io/transaction/${txHash}`
        : `https://preprod.cardanoscan.io/transaction/${txHash}`
    };
    
  } catch (error) {
    console.error('❌ Real transaction failed:', error);
    
    // Parse common Cardano errors
    if (error.message.includes('insufficient funds')) {
      throw new Error('Faucet wallet has insufficient funds');
    }
    if (error.message.includes('UTxO not found')) {
      throw new Error('Faucet wallet UTxO not found - may need to wait for sync');
    }
    if (error.message.includes('invalid address')) {
      throw new Error('Invalid recipient address format');
    }
    if (error.message.includes('collateral')) {
      throw new Error('Insufficient collateral in faucet wallet');
    }
    
    throw error;
  }
}

// Get real faucet wallet balance
async function getFaucetBalance() {
  try {
    const lucid = await initializeLucid();
    const utxos = await lucid.wallet.getUtxos();
    
    let adaBalance = 0n;
    let hkdgBalance = 0n;
    
    const assetUnit = toUnit(
      process.env.HKDG_POLICY_ID || config.faucet.token.policyId,
      fromText(config.faucet.token.assetName)
    );
    
    for (const utxo of utxos) {
      adaBalance += utxo.assets.lovelace;
      if (utxo.assets[assetUnit]) {
        hkdgBalance += utxo.assets[assetUnit];
      }
    }
    
    return {
      ada: Number(adaBalance) / 1000000, // Convert lovelace to ADA
      hkdg: Number(hkdgBalance),
      utxoCount: utxos.length
    };
    
  } catch (error) {
    console.error('Error getting faucet balance:', error);
    throw error;
  }
}

// Validate if we can perform the transaction
async function validateTransaction(recipientAddress, amount) {
  try {
    // Initialize Lucid for address validation
    const lucid = await initializeLucid();
    
    // Validate recipient address format
    try {
      lucid.utils.getAddressDetails(recipientAddress);
    } catch (error) {
      throw new Error('Invalid recipient address format');
    }
    
    // Check faucet balance
    const balance = await getFaucetBalance();
    
    if (balance.hkdg < amount) {
      throw new Error(`Insufficient HKDG balance. Available: ${formatTokenAmount(balance.hkdg)}, Required: ${formatTokenAmount(amount)}`);
    }
    
    if (balance.ada < 2) { // Need at least 2 ADA for transaction fees
      throw new Error('Insufficient ADA for transaction fees');
    }
    
    console.log('✅ Transaction validation passed');
    return { valid: true, balance };
    
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
    return { valid: false, error: error.message };
  }
}

// Get faucet status endpoint - PRODUCTION VERSION
router.get('/faucet-status', async (req, res) => {
  try {
    const balance = await getFaucetBalance();
    
    res.json({
      status: 'operational (production mode)',
      balance: {
        ada: balance.ada,
        hkdg: formatTokenAmount(balance.hkdg),
        hkdgRaw: balance.hkdg,
        utxos: balance.utxoCount
      },
      network: process.env.CARDANO_NETWORK || 'mainnet',
      canOperate: balance.hkdg > 0 && balance.ada > 2,
      mode: 'production',
      note: 'Using real Cardano transactions'
    });
  } catch (error) {
    console.error('Error getting faucet status:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to get faucet status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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
      mode: 'production' // Flag to indicate this was a real transaction
    });

    await fs.writeJson(historyPath, history, { spaces: 2 });
    console.log(`📝 Logged production slurp for ${slurpData.address}`);
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
        mode: 'production'
      });
    }

    const history = await fs.readJson(historyPath);
    const uniqueAddresses = new Set(history.map(s => s.address)).size;
    const totalDistributed = history.reduce((sum, s) => sum + s.amount, 0);
    const memeHolderSlurps = history.filter(s => s.tier === 'meme').length;
    const adaOnlySlurps = history.filter(s => s.tier === 'ada').length;
    const productionSlurps = history.filter(s => s.mode === 'production').length;

    res.json({
      totalSlurps: history.length,
      uniqueAddresses,
      totalDistributed: formatTokenAmount(totalDistributed),
      memeHolderSlurps,
      adaOnlySlurps,
      productionSlurps,
      lastSlurp: history.length > 0 ? history[history.length - 1].date : null,
      mode: 'production'
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;