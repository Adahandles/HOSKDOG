/**
 * HOSKDOG Deposit Client
 * 
 * Client-side module for handling ADA deposits to the HOSKDOG treasury.
 * This script:
 *   1. Detects and connects to Cardano wallets (Eternl, Nami, Flint)
 *   2. Builds transactions via the server (or local fallback for testing)
 *   3. Requests wallet signature using CIP-30 signTx
 *   4. Submits signed transactions through the server
 * 
 * The Blockfrost API key is kept on the server side for security.
 * A local fallback is available for developer testing only.
 */

// ============================================================================
// Configuration
// ============================================================================

const HOSKDOG_RECEIVING_ADDRESS = 'addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k';

// ============================================================================
// State
// ============================================================================

let connectedWallet = null;      // { name, api, address }
let pendingTx = null;            // { unsignedTxCborHex, estimatedFee, lovelace }
let isProcessing = false;        // Prevent double-click

// ============================================================================
// Wallet Detection and Connection
// ============================================================================

/**
 * Detect available wallets on page load
 */
function detectWallets() {
  setTimeout(() => {
    const wallets = [
      { id: 'eternl', check: () => window.cardano?.eternl },
      { id: 'nami', check: () => window.cardano?.nami },
      { id: 'flint', check: () => window.cardano?.flint },
    ];

    wallets.forEach(wallet => {
      const btn = document.getElementById(`btn-${wallet.id}`);
      if (btn) {
        if (!wallet.check()) {
          btn.style.opacity = '0.5';
          btn.title = `${wallet.id} wallet not detected`;
        }
      }
    });
  }, 500);
}

/**
 * Connect to a specific wallet
 */
async function connectWallet(walletName) {
  if (isProcessing) return;
  
  const statusEl = document.getElementById('wallet-status');
  const prepareBtn = document.getElementById('prepare-btn');
  
  try {
    showStatus(statusEl, `Connecting to ${walletName}...`, 'info');
    
    // Get wallet API
    let walletApi = null;
    
    if (walletName === 'eternl' && window.cardano?.eternl) {
      walletApi = await window.cardano.eternl.enable();
    } else if (walletName === 'nami' && window.cardano?.nami) {
      walletApi = await window.cardano.nami.enable();
    } else if (walletName === 'flint' && window.cardano?.flint) {
      walletApi = await window.cardano.flint.enable();
    }
    
    if (!walletApi) {
      throw new Error(`${walletName} wallet not found. Please install the browser extension.`);
    }
    
    // Get wallet address
    let addresses = await walletApi.getUsedAddresses();
    if (!addresses || addresses.length === 0) {
      addresses = await walletApi.getUnusedAddresses();
    }
    
    if (!addresses || addresses.length === 0) {
      throw new Error('No addresses found in wallet. Please create an address first.');
    }
    
    // Convert hex address to bech32
    const hexAddress = addresses[0];
    const bech32Address = hexToBech32Address(hexAddress);
    
    // Store connected wallet
    connectedWallet = {
      name: walletName,
      api: walletApi,
      address: bech32Address,
      hexAddress: hexAddress
    };
    
    // Update UI
    document.querySelectorAll('.wallet-btn').forEach(btn => {
      btn.classList.remove('connected');
    });
    document.getElementById(`btn-${walletName}`).classList.add('connected');
    
    showStatus(statusEl, `✅ Connected to ${walletName}<br><small>${truncateAddress(bech32Address)}</small>`, 'success');
    
    prepareBtn.disabled = false;
    
    // Check network match
    checkNetworkMatch();
    
  } catch (error) {
    console.error('Wallet connection error:', error);
    showStatus(statusEl, `❌ ${error.message}`, 'error');
    prepareBtn.disabled = true;
  }
}

/**
 * Check if wallet network matches selected network
 */
async function checkNetworkMatch() {
  if (!connectedWallet) return;
  
  const selectedNetwork = document.getElementById('network-select').value;
  const address = connectedWallet.address;
  
  // Check address prefix to determine network
  const isTestnetAddress = address.startsWith('addr_test');
  const isTestnetSelected = selectedNetwork === 'Preprod';
  
  if (isTestnetAddress !== isTestnetSelected) {
    const statusEl = document.getElementById('wallet-status');
    const currentStatus = statusEl.innerHTML;
    showStatus(statusEl, 
      `${currentStatus}<br><span style="color: #f9a825;">⚠️ Network mismatch: Wallet is on ${isTestnetAddress ? 'Testnet' : 'Mainnet'}, but you selected ${selectedNetwork}</span>`,
      'warning'
    );
  }
}

// ============================================================================
// Transaction Building and Submission
// ============================================================================

/**
 * Prepare the deposit transaction
 */
async function prepareDeposit() {
  if (isProcessing || !connectedWallet) return;
  
  const statusEl = document.getElementById('prepare-status');
  const prepareBtn = document.getElementById('prepare-btn');
  const amountInput = document.getElementById('amount-input');
  
  try {
    isProcessing = true;
    prepareBtn.disabled = true;
    prepareBtn.textContent = '⏳ Preparing...';
    
    // Validate amount
    const adaAmount = parseFloat(amountInput.value);
    if (isNaN(adaAmount) || adaAmount < 1) {
      throw new Error('Please enter a valid amount (minimum 1 ADA)');
    }
    
    if (adaAmount > 1000000) {
      throw new Error('Amount seems too large. Please double-check.');
    }
    
    const lovelace = Math.floor(adaAmount * 1000000).toString();
    
    showStatus(statusEl, '🔄 Building transaction...', 'info');
    
    // Try server first, then local fallback
    let result = null;
    const serverUrl = document.getElementById('server-url').value || 'http://localhost:4000';
    const network = document.getElementById('network-select').value;
    
    try {
      result = await buildTxViaServer(serverUrl, connectedWallet.address, lovelace);
    } catch (serverErr) {
      console.warn('Server unavailable:', serverErr.message);
      
      // Try local fallback if Blockfrost key is provided
      const blockfrostKey = document.getElementById('blockfrost-key').value;
      if (blockfrostKey) {
        showStatus(statusEl, '⚠️ Server unavailable, using local fallback...', 'warning');
        result = await buildTxLocally(connectedWallet.address, lovelace, network, blockfrostKey);
      } else {
        throw new Error(`Server unavailable: ${serverErr.message}. Start the deposit server or provide a Blockfrost key for local fallback.`);
      }
    }
    
    // Store pending transaction
    pendingTx = {
      unsignedTxCborHex: result.unsignedTxCborHex,
      estimatedFee: result.estimatedFee,
      lovelace: lovelace,
      adaAmount: adaAmount,
      network: result.network || network,
      recipient: result.recipient || HOSKDOG_RECEIVING_ADDRESS
    };
    
    // Show confirmation modal
    showConfirmModal();
    
    showStatus(statusEl, '✅ Transaction ready. Please review and confirm.', 'success');
    
  } catch (error) {
    console.error('Prepare error:', error);
    showStatus(statusEl, `❌ ${error.message}`, 'error');
  } finally {
    isProcessing = false;
    prepareBtn.disabled = !connectedWallet;
    prepareBtn.textContent = '🔄 Prepare Deposit';
  }
}

/**
 * Build transaction via server
 */
async function buildTxViaServer(serverUrl, senderAddress, lovelace) {
  const response = await fetch(`${serverUrl}/api/build-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderAddress, lovelace })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Server error' }));
    throw new Error(error.details || error.error || 'Failed to build transaction');
  }
  
  return await response.json();
}

/**
 * Sign and submit the transaction
 */
async function signAndSubmit() {
  if (isProcessing || !pendingTx || !connectedWallet) return;
  
  const statusEl = document.getElementById('modal-status');
  const signBtn = document.getElementById('sign-btn');
  
  try {
    isProcessing = true;
    signBtn.disabled = true;
    signBtn.textContent = '⏳ Signing...';
    
    showStatus(statusEl, '✍️ Please sign the transaction in your wallet...', 'info');
    
    // Request wallet signature
    // CIP-30 signTx expects the transaction CBOR hex and a boolean for partial signing
    const signedTxCborHex = await connectedWallet.api.signTx(pendingTx.unsignedTxCborHex, true);
    
    showStatus(statusEl, '📤 Submitting transaction...', 'info');
    
    // Submit via server
    const serverUrl = document.getElementById('server-url').value || 'http://localhost:4000';
    let result = null;
    
    try {
      result = await submitTxViaServer(serverUrl, signedTxCborHex);
    } catch (serverErr) {
      // Try local fallback
      const blockfrostKey = document.getElementById('blockfrost-key').value;
      if (blockfrostKey) {
        showStatus(statusEl, '⚠️ Server unavailable, submitting locally...', 'warning');
        result = await submitTxLocally(signedTxCborHex, pendingTx.network, blockfrostKey);
      } else {
        throw new Error(`Submission failed: ${serverErr.message}`);
      }
    }
    
    // Success!
    showStatus(statusEl, 
      `✅ <strong>Transaction submitted!</strong><br>
       <br>
       <strong>TX Hash:</strong><br>
       <code style="font-size: 0.8rem; word-break: break-all;">${result.txHash}</code><br>
       <br>
       <a href="${result.explorerUrl}" target="_blank" style="color: #08fdd8;">View on Explorer →</a>`,
      'success'
    );
    
    signBtn.textContent = '✅ Submitted!';
    signBtn.style.background = '#27ae60';
    
    // Reset after delay
    setTimeout(() => {
      closeModal();
      pendingTx = null;
    }, 10000);
    
  } catch (error) {
    console.error('Sign/submit error:', error);
    
    let errorMsg = error.message;
    if (errorMsg.includes('user') || errorMsg.includes('declined') || errorMsg.includes('cancel')) {
      errorMsg = 'Transaction cancelled by user';
    }
    
    showStatus(statusEl, `❌ ${errorMsg}`, 'error');
    signBtn.disabled = false;
    signBtn.textContent = '✍️ Sign & Send';
  } finally {
    isProcessing = false;
  }
}

/**
 * Submit transaction via server
 */
async function submitTxViaServer(serverUrl, signedTxCborHex) {
  const response = await fetch(`${serverUrl}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedTxCborHex })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Submission failed' }));
    throw new Error(error.details || error.error || 'Failed to submit transaction');
  }
  
  return await response.json();
}

// ============================================================================
// Local Fallback (for developer testing only)
// ============================================================================

/**
 * Build transaction locally using Lucid (for testing only!)
 * 
 * ⚠️ WARNING: This exposes the Blockfrost API key to the client.
 * Only use for local development testing!
 */
async function buildTxLocally(senderAddress, lovelace, network, blockfrostKey) {
  console.warn('⚠️ Using local fallback - Blockfrost key is exposed to client!');
  
  // Dynamically import Lucid if not available
  if (typeof Lucid === 'undefined' || typeof Blockfrost === 'undefined') {
    throw new Error('Lucid library not loaded. Local fallback requires loading Lucid in the page.');
  }
  
  const blockfrostUrl = network === 'Mainnet'
    ? 'https://cardano-mainnet.blockfrost.io/api/v0'
    : 'https://cardano-preprod.blockfrost.io/api/v0';
  
  const provider = new Blockfrost(blockfrostUrl, blockfrostKey);
  const lucid = await Lucid.new(provider, network);
  
  lucid.selectWalletFrom({ address: senderAddress });
  
  const tx = await lucid
    .newTx()
    .payToAddress(HOSKDOG_RECEIVING_ADDRESS, { lovelace: BigInt(lovelace) })
    .complete();
  
  return {
    unsignedTxCborHex: tx.toString(),
    estimatedFee: tx.txComplete.body().fee().to_str(),
    network: network,
    recipient: HOSKDOG_RECEIVING_ADDRESS
  };
}

/**
 * Submit transaction locally (for testing only!)
 */
async function submitTxLocally(signedTxCborHex, network, blockfrostKey) {
  console.warn('⚠️ Submitting locally - Blockfrost key is exposed!');
  
  if (typeof Lucid === 'undefined' || typeof Blockfrost === 'undefined') {
    throw new Error('Lucid library not loaded.');
  }
  
  const blockfrostUrl = network === 'Mainnet'
    ? 'https://cardano-mainnet.blockfrost.io/api/v0'
    : 'https://cardano-preprod.blockfrost.io/api/v0';
  
  const provider = new Blockfrost(blockfrostUrl, blockfrostKey);
  const lucid = await Lucid.new(provider, network);
  
  const signedTx = lucid.fromTx(signedTxCborHex);
  const txHash = await signedTx.submit();
  
  const explorerUrl = network === 'Mainnet'
    ? `https://cardanoscan.io/transaction/${txHash}`
    : `https://preprod.cardanoscan.io/transaction/${txHash}`;
  
  return { txHash, explorerUrl };
}

// ============================================================================
// UI Helpers
// ============================================================================

/**
 * Show confirmation modal
 */
function showConfirmModal() {
  if (!pendingTx) return;
  
  const feeAda = parseInt(pendingTx.estimatedFee) / 1000000;
  const totalAda = pendingTx.adaAmount + feeAda;
  
  document.getElementById('modal-amount').textContent = `${pendingTx.adaAmount.toFixed(2)} ADA`;
  document.getElementById('modal-fee').textContent = `~${feeAda.toFixed(4)} ADA`;
  document.getElementById('modal-total').textContent = `${totalAda.toFixed(4)} ADA`;
  document.getElementById('modal-network').textContent = pendingTx.network;
  document.getElementById('modal-recipient').textContent = truncateAddress(pendingTx.recipient, 15);
  
  document.getElementById('confirm-modal').classList.add('show');
  
  // Reset modal state
  const statusEl = document.getElementById('modal-status');
  statusEl.classList.remove('show');
  
  const signBtn = document.getElementById('sign-btn');
  signBtn.disabled = false;
  signBtn.textContent = '✍️ Sign & Send';
  signBtn.style.background = '';
}

/**
 * Close confirmation modal
 */
function closeModal() {
  document.getElementById('confirm-modal').classList.remove('show');
}

/**
 * Show status message
 */
function showStatus(element, message, type) {
  element.innerHTML = message;
  element.className = 'status-area show';
  if (type) element.classList.add(type);
}

/**
 * Truncate address for display
 */
function truncateAddress(address, chars = 10) {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

// ============================================================================
// Address Utilities (Bech32 encoding for Cardano addresses)
// ============================================================================

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
}

function bech32HrpExpand(hrp) {
  const ret = [];
  for (const c of hrp) ret.push(c.charCodeAt(0) >> 5);
  ret.push(0);
  for (const c of hrp) ret.push(c.charCodeAt(0) & 31);
  return ret;
}

function bech32CreateChecksum(hrp, data) {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const ret = [];
  for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
  return ret;
}

function bech32Encode(hrp, data) {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + '1';
  for (const d of combined) ret += BECH32_ALPHABET[d];
  return ret;
}

function convertBits(data, fromBits, toBits, pad) {
  let acc = 0, bits = 0;
  const ret = [], maxv = (1 << toBits) - 1;
  for (const d of data) {
    acc = (acc << fromBits) | d;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad && bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  return ret;
}

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

function hexToBech32Address(hexAddr) {
  const bytes = hexToBytes(hexAddr);
  // Determine prefix based on network byte (first byte)
  // Mainnet addresses start with 0x01, 0x11, etc.
  // Testnet addresses start with 0x00, 0x10, etc.
  const networkByte = bytes[0];
  const isTestnet = (networkByte & 0x0F) === 0x00;
  const hrp = isTestnet ? 'addr_test' : 'addr';
  const words = convertBits(bytes, 8, 5, true);
  return bech32Encode(hrp, words);
}

// ============================================================================
// Event Listeners
// ============================================================================

// Detect wallets on page load
window.addEventListener('load', detectWallets);

// Check network match when network selection changes
document.getElementById('network-select')?.addEventListener('change', checkNetworkMatch);

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Close modal when clicking outside
document.getElementById('confirm-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') closeModal();
});
