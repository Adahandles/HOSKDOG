const { Lucid, Blockfrost, fromText, toUnit } = require('lucid-cardano');
const config = require('../../config/faucet-settings.json');

let lucidInstance = null;

// Initialize Lucid with Blockfrost provider
async function initializeLucid() {
  if (lucidInstance) return lucidInstance;

  try {
    const provider = new Blockfrost(
      process.env.CARDANO_NETWORK === 'mainnet' 
        ? 'https://cardano-mainnet.blockfrost.io/api/v0'
        : 'https://cardano-testnet.blockfrost.io/api/v0',
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

// Build and submit token transfer transaction
async function sendHKDGTokens(recipientAddress, amount, memo = '') {
  try {
    const lucid = await initializeLucid();
    
    // Create the asset unit (policy ID + asset name)
    const assetUnit = toUnit(
      process.env.HKDG_POLICY_ID || config.faucet.token.policyId,
      fromText(config.faucet.token.assetName)
    );
    
    console.log(`🏗️  Building transaction:`);
    console.log(`   📍 To: ${recipientAddress}`);
    console.log(`   🪙 Amount: ${amount} ${config.faucet.token.assetName}`);
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
    console.log('🚀 Transaction submitted:', txHash);
    
    // Wait for confirmation (optional - comment out for faster response)
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
    console.error('❌ Transaction failed:', error);
    
    // Parse common errors
    if (error.message.includes('insufficient funds')) {
      throw new Error('Faucet wallet has insufficient funds');
    }
    if (error.message.includes('UTxO not found')) {
      throw new Error('Faucet wallet UTxO not found - may need to wait for sync');
    }
    if (error.message.includes('invalid address')) {
      throw new Error('Invalid recipient address format');
    }
    
    throw error;
  }
}

// Get faucet wallet balance
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
    // Check if recipient address is valid
    const lucid = await initializeLucid();
    
    // This will throw if address is invalid
    try {
      lucid.utils.getAddressDetails(recipientAddress);
    } catch (error) {
      throw new Error('Invalid recipient address format');
    }
    
    // Check faucet balance
    const balance = await getFaucetBalance();
    
    if (balance.hkdg < amount) {
      throw new Error(`Insufficient HKDG balance. Available: ${balance.hkdg}, Required: ${amount}`);
    }
    
    if (balance.ada < 2) { // Need at least 2 ADA for transaction fees
      throw new Error('Insufficient ADA for transaction fees');
    }
    
    return { valid: true, balance };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = {
  initializeLucid,
  sendHKDGTokens,
  getFaucetBalance,
  validateTransaction
};