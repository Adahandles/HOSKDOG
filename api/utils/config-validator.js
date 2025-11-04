// Configuration validation utility
function validateConfiguration() {
  const required = [
    'FAUCET_ADDRESS',
    'FAUCET_SKEY', 
    'HKDG_POLICY_ID',
    'KOIOS_API'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\n📝 Please update your .env file with the missing values.');
    console.error('📖 See PRODUCTION_SETUP.md for configuration guide.');
    return false;
  }

  // Validate address format
  if (process.env.FAUCET_ADDRESS && !process.env.FAUCET_ADDRESS.startsWith('addr')) {
    console.error('❌ FAUCET_ADDRESS must be a valid Cardano address (starts with addr)');
    return false;
  }

  // Validate policy ID format (56 hex characters)
  if (process.env.HKDG_POLICY_ID && !/^[a-f0-9]{56}$/i.test(process.env.HKDG_POLICY_ID)) {
    console.error('❌ HKDG_POLICY_ID must be 56 hex characters');
    return false;
  }

  // Validate Koios URL
  if (process.env.KOIOS_API && !process.env.KOIOS_API.startsWith('http')) {
    console.error('❌ KOIOS_API must be a valid URL');
    return false;
  }

  console.log('✅ Configuration validation passed');
  console.log(`🔗 Network: ${process.env.CARDANO_NETWORK || 'mainnet'}`);
  console.log(`🏦 Faucet: ${process.env.FAUCET_ADDRESS}`);
  console.log(`🪙 Token: ${process.env.HKDG_POLICY_ID}`);
  console.log(`📡 API: ${process.env.KOIOS_API}`);
  
  return true;
}

module.exports = { validateConfiguration };