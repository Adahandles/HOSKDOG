# 🚽 HOSKDOG Faucet - Production Setup Guide

## 🔧 REQUIRED: Final Configuration Steps

### Step 1: Get Your HKDG Policy ID
```bash
# If you haven't minted HKDG yet, you'll need to:
# 1. Create the token policy
# 2. Mint your HKDG tokens  
# 3. Get the policy ID from the minting transaction

# Your policy ID will look like:
# a1b2c3d4e5f6789012345678901234567890123456789012345678901234
```

### Step 2: Setup Blockfrost API
```bash
# 1. Go to: https://blockfrost.io
# 2. Create free account
# 3. Create new project (mainnet or testnet)
# 4. Copy your API key (looks like: mainnet_abc123...)
```

### Step 3: Configure Production Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values:
nano .env
```

**Required .env values:**
```bash
# 🚽 HOSKDOG FAUCET CONFIGURATION

# Faucet wallet configuration (REQUIRED)
FAUCET_WALLET_ADDRESS=addr1_your_actual_faucet_wallet_address_here
FAUCET_WALLET_PRIVATE_KEY=ed25519_sk1_your_actual_private_key_here

# Token configuration (REQUIRED)  
HKDG_POLICY_ID=your_actual_hkdg_policy_id_here

# Cardano Network (mainnet or testnet)
CARDANO_NETWORK=mainnet

# Blockfrost API Key (REQUIRED)
BLOCKFROST_API_KEY=mainnet_your_actual_blockfrost_key_here

# Security
JWT_SECRET=generate_a_strong_random_secret_key_here
NODE_ENV=production
```

### Step 4: Update Token Configuration
Edit `config/faucet-settings.json`:
```json
{
  "faucet": {
    "name": "HOSKDOG Faucet",
    "token": {
      "name": "HKDG", 
      "policyId": "your_actual_hkdg_policy_id_here",
      "assetName": "HKDG",
      "decimals": 6
    },
    "rewards": {
      "memeHolders": 690000000000,
      "adaOnly": 420000000000  
    },
    "deposits": {
      "memeHolders": 250000,
      "adaOnly": 3000000
    }
  }
}
```

### Step 5: Fund Your Faucet Wallet
```bash
# Your faucet wallet needs:
# 1. Sufficient HKDG tokens for distribution
# 2. At least 10+ ADA for transaction fees

# Example for 1000 slurps:
# - 690M HKDG tokens (assuming all meme holders)
# - 20 ADA for transaction fees
```

## 🚀 Production Deployment

### Option 1: Local Production Server
```bash
# Install dependencies
npm install

# Set environment to production
export NODE_ENV=production

# Start the server
npm start

# Or use PM2 for process management:
npm install -g pm2
pm2 start api/server.js --name "hoskdog-faucet"
pm2 save
pm2 startup
```

### Option 2: Deploy to VPS/Cloud
```bash
# Example for Ubuntu server:

# 1. Setup Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone your repository
git clone https://github.com/yourusername/HOSKDOG.git
cd HOSKDOG

# 3. Install dependencies  
npm install --production

# 4. Setup environment
cp .env.example .env
nano .env  # Fill in your values

# 5. Install PM2
npm install -g pm2

# 6. Start application
pm2 start api/server.js --name "hoskdog-faucet"
pm2 save
pm2 startup

# 7. Setup nginx reverse proxy (optional)
sudo apt install nginx
# Configure nginx to proxy port 3000
```

### Option 3: Deploy to Heroku/Railway/Similar
```bash
# 1. Create new app on your platform
# 2. Set environment variables in dashboard
# 3. Connect GitHub repository
# 4. Deploy automatically
```

## 🔒 Security Checklist

- [ ] **Private Key Security**: Store faucet private key securely
- [ ] **Environment Variables**: Never commit .env to git
- [ ] **Firewall**: Only expose necessary ports (80, 443, SSH)
- [ ] **SSL Certificate**: Enable HTTPS for production
- [ ] **Rate Limiting**: Verify rate limits are working
- [ ] **Monitoring**: Setup uptime monitoring
- [ ] **Backups**: Backup slurp history logs regularly

## 🎯 Testing Checklist

### Pre-Launch Testing:
- [ ] **Faucet Status**: `GET /api/faucet-status` shows operational
- [ ] **Balance Check**: Verify HKDG and ADA balances are sufficient  
- [ ] **Wallet Connection**: Test all supported wallets (Lace, Nami, etc.)
- [ ] **Eligibility Check**: Test both meme holders and ADA-only users
- [ ] **Transaction Flow**: Complete end-to-end slurp on testnet first
- [ ] **Rate Limiting**: Verify 1 slurp per day restriction works
- [ ] **Error Handling**: Test with insufficient funds, invalid addresses
- [ ] **Mobile Interface**: Test on mobile devices

### Launch Day Commands:
```bash
# Check faucet status
curl https://yourdomain.com/api/faucet-status

# Monitor logs
pm2 logs hoskdog-faucet

# Check statistics
curl https://yourdomain.com/api/stats
```

## 📊 Monitoring URLs

After deployment, monitor these endpoints:

- **Main Faucet**: `https://yourdomain.com`
- **Admin Dashboard**: `https://yourdomain.com/admin.html`
- **Health Check**: `https://yourdomain.com/api/health`
- **Faucet Status**: `https://yourdomain.com/api/faucet-status`
- **Statistics**: `https://yourdomain.com/api/stats`

## 🆘 Troubleshooting

**"Insufficient Funds" Error:**
- Check faucet wallet ADA balance (need 2+ ADA)
- Check HKDG token balance in wallet
- Verify policy ID matches your actual token

**"Transaction Failed" Error:**
- Verify Blockfrost API key is correct
- Check network setting (mainnet vs testnet)
- Ensure wallet private key is valid

**"Wallet Not Detected" Error:**
- User needs to install wallet extension
- Wallet needs to be unlocked
- Try refreshing page after wallet installation

## 🎉 You're Ready!

Once configured with real values:
1. ✅ **Real HKDG tokens will be distributed**
2. ✅ **Transactions will appear on Cardano blockchain**
3. ✅ **Users get blockchain explorer links**
4. ✅ **Full audit trail in logs**
5. ✅ **Professional production-ready system**

**The faucet is ready for your community! 🚽💎**