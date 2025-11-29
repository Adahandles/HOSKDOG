/**
 * HOSKDOG Deposit Local Fallback
 * 
 * ⚠️ WARNING: This file is for LOCAL DEVELOPMENT TESTING ONLY!
 * ⚠️ DO NOT use in production as it exposes your Blockfrost API key to the client.
 * 
 * This file provides a standalone way to test the deposit flow without running
 * the server proxy. It includes Lucid library loading and direct Blockfrost
 * communication.
 * 
 * HOW TO USE (development only):
 * 1. Add this script to deposit.html AFTER deposit-client.js:
 *    <script src="https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"></script>
 *    <script src="deposit-local-fallback.js"></script>
 * 2. Enter your Blockfrost API key in the "Advanced Options" section
 * 3. The client will use local Lucid if the server is unavailable
 * 
 * SECURITY NOTES:
 * - Never commit a Blockfrost key in this file
 * - Never deploy this file to production with an embedded key
 * - The server proxy (server/index.js) is the secure way to handle deposits
 */

(function() {
  'use strict';

  // Check if we're in a development environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:';

  if (!isDevelopment) {
    console.warn('⚠️ deposit-local-fallback.js should only be loaded in development!');
    return;
  }

  console.log('🔧 Deposit local fallback loaded (development mode)');

  /**
   * Override buildTxLocally from deposit-client.js to use the global Lucid
   * loaded from CDN
   */
  window.buildTxLocally = async function(senderAddress, lovelace, network, blockfrostKey) {
    console.warn('⚠️ LOCAL FALLBACK: Building transaction client-side');
    console.warn('⚠️ This exposes your Blockfrost API key. Use server proxy in production!');

    // Check if Lucid is loaded from CDN
    if (typeof window.Lucid === 'undefined') {
      throw new Error(
        'Lucid library not loaded. Add this to deposit.html:\n' +
        '<script src="https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"></script>'
      );
    }

    const { Lucid, Blockfrost } = window;
    
    const blockfrostUrl = network === 'Mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : 'https://cardano-preprod.blockfrost.io/api/v0';

    const provider = new Blockfrost(blockfrostUrl, blockfrostKey);
    const lucid = await Lucid.new(provider, network);

    // Select sender's wallet context
    lucid.selectWalletFrom({ address: senderAddress });

    // HOSKDOG receiving address
    const HOSKDOG_ADDRESS = 'addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k';

    // Build the transaction
    const tx = await lucid
      .newTx()
      .payToAddress(HOSKDOG_ADDRESS, { lovelace: BigInt(lovelace) })
      .complete();

    return {
      unsignedTxCborHex: tx.toString(),
      estimatedFee: tx.txComplete.body().fee().to_str(),
      network: network,
      recipient: HOSKDOG_ADDRESS
    };
  };

  /**
   * Override submitTxLocally from deposit-client.js
   */
  window.submitTxLocally = async function(signedTxCborHex, network, blockfrostKey) {
    console.warn('⚠️ LOCAL FALLBACK: Submitting transaction client-side');

    if (typeof window.Lucid === 'undefined') {
      throw new Error('Lucid library not loaded.');
    }

    const { Lucid, Blockfrost } = window;

    const blockfrostUrl = network === 'Mainnet'
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : 'https://cardano-preprod.blockfrost.io/api/v0';

    const provider = new Blockfrost(blockfrostUrl, blockfrostKey);
    const lucid = await Lucid.new(provider, network);

    // Create signed transaction from CBOR and submit
    const signedTx = lucid.fromTx(signedTxCborHex);
    const txHash = await signedTx.submit();

    const explorerUrl = network === 'Mainnet'
      ? `https://cardanoscan.io/transaction/${txHash}`
      : `https://preprod.cardanoscan.io/transaction/${txHash}`;

    return { txHash, explorerUrl };
  };

  /**
   * Add visual indicator that local fallback is available
   */
  document.addEventListener('DOMContentLoaded', function() {
    const advancedSection = document.querySelector('.advanced-toggle');
    if (advancedSection) {
      const indicator = document.createElement('span');
      indicator.style.cssText = 'color: #f9a825; font-size: 0.8rem; margin-left: 10px;';
      indicator.textContent = '(local fallback loaded)';
      advancedSection.querySelector('summary')?.appendChild(indicator);
    }
  });

})();
