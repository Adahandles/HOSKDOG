import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { Lucid, Blockfrost, fromText, toUnit } from 'lucid-cardano';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, '../config/faucet-settings.json'), 'utf8')
);

// 💰 Check faucet wallet balance
async function checkWalletBalance() {
  try {
    console.log('🔍 Checking faucet wallet balance...\n');

    // Initialize Lucid with Blockfrost
    const provider = new Blockfrost(
      process.env.CARDANO_NETWORK === 'mainnet' 
        ? 'https://cardano-mainnet.blockfrost.io/api/v0'
        : 'https://cardano-preprod.blockfrost.io/api/v0',
      process.env.BLOCKFROST_API_KEY
    );

    const lucid = await Lucid.new(provider, process.env.CARDANO_NETWORK || 'mainnet');
    lucid.selectWalletFromPrivateKey(process.env.FAUCET_SKEY);

    console.log('✅ Connected to Cardano network');
    console.log('🔗 Network:', process.env.CARDANO_NETWORK || 'mainnet');
    
    const faucetAddress = await lucid.wallet.address();
    console.log('📍 Faucet Address:', faucetAddress);
    console.log('');

    // Get all UTXOs
    const utxos = await lucid.wallet.getUtxos();
    
    let adaBalance = 0n;
    let hkdgBalance = 0n;
    
    const assetUnit = toUnit(
      process.env.HKDG_POLICY_ID || config.faucet.token.policyId,
      fromText(config.faucet.token.assetName)
    );
    
    console.log('🏦 UTXOs Analysis:');
    console.log(`   Total UTXOs: ${utxos.length}`);
    
    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      const utxoAda = Number(utxo.assets.lovelace) / 1000000;
      const utxoHkdg = utxo.assets[assetUnit] ? Number(utxo.assets[assetUnit]) : 0;
      
      adaBalance += utxo.assets.lovelace;
      if (utxo.assets[assetUnit]) {
        hkdgBalance += utxo.assets[assetUnit];
      }
      
      console.log(`   UTXO ${i + 1}: ${utxoAda.toFixed(6)} ADA${utxoHkdg > 0 ? ` + ${formatTokenAmount(utxoHkdg)} HKDG` : ''}`);
    }
    
    console.log('');
    console.log('💰 WALLET BALANCES:');
    console.log('═══════════════════');
    console.log(`ADA:  ${(Number(adaBalance) / 1000000).toFixed(6)} ADA`);
    console.log(`HKDG: ${formatTokenAmount(Number(hkdgBalance))} HKDG`);
    console.log('');
    
    // Check operational status
    const canOperate = Number(hkdgBalance) > 0 && Number(adaBalance) > 2000000; // Need > 2 ADA for fees
    
    console.log('🔧 OPERATIONAL STATUS:');
    console.log('═══════════════════════');
    console.log(`Status: ${canOperate ? '✅ OPERATIONAL' : '❌ NOT OPERATIONAL'}`);
    
    if (!canOperate) {
      console.log('');
      console.log('⚠️  ISSUES DETECTED:');
      if (Number(hkdgBalance) === 0) {
        console.log('   - No HKDG tokens available for distribution');
      }
      if (Number(adaBalance) <= 2000000) {
        console.log('   - Insufficient ADA for transaction fees (need > 2 ADA)');
      }
    }
    
    console.log('');
    console.log('📊 DISTRIBUTION CAPACITY:');
    console.log('══════════════════════════');
    
    const memeReward = config.faucet.rewards.memeHolders;
    const adaReward = config.faucet.rewards.adaOnly;
    
    const maxMemeSlurps = Math.floor(Number(hkdgBalance) / memeReward);
    const maxAdaSlurps = Math.floor(Number(hkdgBalance) / adaReward);
    
    console.log(`Meme Holder Rewards (${formatTokenAmount(memeReward)} HKDG): ${maxMemeSlurps} slurps available`);
    console.log(`ADA Only Rewards (${formatTokenAmount(adaReward)} HKDG): ${maxAdaSlurps} slurps available`);
    
    console.log('');
    console.log('🔑 WALLET DETAILS:');
    console.log('═══════════════════');
    console.log(`Policy ID: ${process.env.HKDG_POLICY_ID || config.faucet.token.policyId}`);
    console.log(`Asset Name: ${config.faucet.token.assetName}`);
    console.log(`Asset Unit: ${assetUnit}`);
    
  } catch (error) {
    console.error('❌ Error checking wallet balance:', error.message);
    
    if (error.message.includes('Invalid project_id')) {
      console.error('   💡 Check your BLOCKFROST_API_KEY in .env file');
    }
    if (error.message.includes('Invalid private key')) {
      console.error('   💡 Check your FAUCET_SKEY in .env file');
    }
    if (error.message.includes('Network error')) {
      console.error('   💡 Check your internet connection and Blockfrost service status');
    }
    
    process.exit(1);
  }
}

function formatTokenAmount(amount) {
  return (amount / Math.pow(10, config.faucet.token.decimals)).toLocaleString();
}

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Run the balance check
checkWalletBalance();