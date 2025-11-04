const express = require('express');
const axios = require('axios');
const config = require('../../config/faucet-settings.json');

const router = express.Router();

// Check if user is eligible for faucet
router.post('/check-eligibility', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    console.log(`Checking eligibility for address: ${address}`);

    // Check if address has already claimed today (if rate limiting enabled)
    if (config.faucet.rateLimiting.enabled) {
      const hasClaimedToday = await checkRecentClaims(address);
      if (hasClaimedToday) {
        return res.json({
          eligible: false,
          reason: 'Already claimed today. Please wait 24 hours.',
          tier: null
        });
      }
    }

    // Check for meme tokens (HOSKY/SNEK)
    const hasMemeTokens = await checkMemeTokens(address);
    if (hasMemeTokens) {
      return res.json({
        eligible: true,
        tier: 'meme',
        reward: config.faucet.rewards.memeHolders,
        deposit: config.faucet.deposits.memeHolders,
        reason: 'HOSKY or SNEK token detected'
      });
    }

    // Check ADA balance
    const adaBalance = await checkAdaBalance(address);
    if (adaBalance >= config.faucet.deposits.adaOnly) {
      return res.json({
        eligible: true,
        tier: 'ada',
        reward: config.faucet.rewards.adaOnly,
        deposit: config.faucet.deposits.adaOnly,
        reason: 'Sufficient ADA balance'
      });
    }

    // Not eligible
    return res.json({
      eligible: false,
      tier: null,
      reason: 'Need HOSKY/SNEK tokens or 3+ ADA balance'
    });

  } catch (error) {
    console.error('Eligibility check error:', error);
    res.status(500).json({ 
      error: 'Failed to check eligibility',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check for HOSKY or SNEK tokens using Koios API
async function checkMemeTokens(address) {
  try {
    const koiosUrl = process.env.KOIOS_API || config.api.koiosUrl;
    const response = await axios.post(`${koiosUrl}/address_assets`, {
      _addresses: [address]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return false;
    }

    const assets = response.data[0]?.asset_list || [];
    
    // Check for each eligible token
    for (const token of config.faucet.eligibilityTokens) {
      const hasToken = assets.some(asset => 
        asset.policy_id === token.policyId && 
        parseInt(asset.quantity) >= token.minAmount
      );
      
      if (hasToken) {
        console.log(`Found ${token.name} token for address ${address}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking meme tokens:', error.message);
    // If API fails, we'll fall back to ADA check
    return false;
  }
}

// Check ADA balance using Koios API
async function checkAdaBalance(address) {
  try {
    const koiosUrl = process.env.KOIOS_API || config.api.koiosUrl;
    const response = await axios.post(`${koiosUrl}/address_info`, {
      _addresses: [address]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return 0;
    }

    const addressInfo = response.data[0];
    const balance = parseInt(addressInfo.balance || 0);
    
    console.log(`ADA balance for ${address}: ${balance / 1000000} ADA`);
    return balance;
  } catch (error) {
    console.error('Error checking ADA balance:', error.message);
    return 0;
  }
}

// Check if address has claimed recently
async function checkRecentClaims(address) {
  try {
    const fs = require('fs-extra');
    const slurpHistoryPath = require('path').join(__dirname, '../../logs/slurp-history.json');
    
    if (!await fs.pathExists(slurpHistoryPath)) {
      return false;
    }

    const history = await fs.readJson(slurpHistoryPath);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    // Check if this address has slurped in the last 24 hours
    const recentClaim = history.find(claim => 
      claim.address === address && 
      claim.timestamp > oneDayAgo
    );

    return !!recentClaim;
  } catch (error) {
    console.error('Error checking recent claims:', error);
    return false; // If we can't check, allow the claim
  }
}

module.exports = router;