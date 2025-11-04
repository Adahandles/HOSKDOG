const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config/faucet-settings.json');

const router = express.Router();

// Perform slurp (send tokens)
router.post('/slurp', async (req, res) => {
  try {
    const { address, tier } = req.body;

    if (!address || !tier) {
      return res.status(400).json({ error: 'Address and tier are required' });
    }

    console.log(`Processing slurp for ${address}, tier: ${tier}`);

    // Validate tier
    if (!['meme', 'ada'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Check rate limiting again (just to be safe)
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

    // For now, we'll simulate the transaction
    // In production, you'd integrate with Cardano transaction building
    const txHash = await simulateTokenTransfer(address, rewardAmount, tier);

    // Log the slurp
    await logSlurp({
      address,
      tier,
      amount: rewardAmount,
      txHash,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      txHash,
      amount: formatTokenAmount(rewardAmount),
      message: `Successfully sent ${formatTokenAmount(rewardAmount)} HKDG to your wallet!`
    });

  } catch (error) {
    console.error('Slurp error:', error);
    res.status(500).json({ 
      error: 'Slurp failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Simulate token transfer (replace with real Cardano integration)
async function simulateTokenTransfer(address, amount, tier) {
  // This is a placeholder - in production you would:
  // 1. Build a Cardano transaction
  // 2. Sign it with your faucet wallet
  // 3. Submit it to the network
  // 4. Return the actual transaction hash

  console.log(`[SIMULATION] Sending ${formatTokenAmount(amount)} HKDG to ${address}`);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate fake transaction hash for demo
  const fakeHash = 'demo_tx_' + Date.now() + '_' + Math.random().toString(36).substring(7);
  
  console.log(`[SIMULATION] Transaction hash: ${fakeHash}`);
  return fakeHash;
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
      date: new Date().toISOString()
    });

    await fs.writeJson(historyPath, history, { spaces: 2 });
    console.log(`Logged slurp for ${slurpData.address}`);
  } catch (error) {
    console.error('Error logging slurp:', error);
  }
}

// Check if address has claimed recently (duplicate from eligibility.js)
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
        totalDistributed: 0,
        memeHolderSlurps: 0,
        adaOnlySlurps: 0
      });
    }

    const history = await fs.readJson(historyPath);
    const uniqueAddresses = new Set(history.map(s => s.address)).size;
    const totalDistributed = history.reduce((sum, s) => sum + s.amount, 0);
    const memeHolderSlurps = history.filter(s => s.tier === 'meme').length;
    const adaOnlySlurps = history.filter(s => s.tier === 'ada').length;

    res.json({
      totalSlurps: history.length,
      uniqueAddresses,
      totalDistributed: formatTokenAmount(totalDistributed),
      memeHolderSlurps,
      adaOnlySlurps,
      lastSlurp: history.length > 0 ? history[history.length - 1].date : null
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;