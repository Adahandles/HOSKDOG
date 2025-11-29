/**
 * HOSKDOG Deposit Client
 * 
 * Client-side module for handling ADA deposits to the HOSKDOG treasury.
 * This script:
 *   1. Integrates with unified wallet dropdown (via walletConnected/walletDisconnected events)
 *   2. Provides deposit preview with fee estimation BEFORE signing
 *   3. Builds transactions via the server (or local fallback for testing)
 *   4. Requests wallet signature using CIP-30 signTx
 *   5. Submits signed transactions through the server
 * 
 * The Blockfrost API key is kept on the server side for security.
 * A local fallback is available for developer testing only.
 * 
 * Fee Estimation Fallback:
 *   If server is unavailable and no Blockfrost key is provided, uses a conservative
 *   fee estimate based on Cardano's fee formula:
 *   fee = (155381 + 44 * txSizeBytes + 30000 safety buffer) lovelace
 *   For a typical ~350 byte transaction: ~0.20 ADA
 */

// ============================================================================
// Configuration
// ============================================================================

const HOSKDOG_RECEIVING_ADDRESS = 'addr1q9lgquer5840jyexr52zjlpvvv33d7qkg4k35ty9f85leftvz5gkpuwt36e4h6zle5trhx3xqus8q08ac60hxe8pc4mqhuyj7k';

/**
 * Conservative fallback fee estimation
 * Formula: fallbackFeeAda = 0.17 + 0.0001 * estimatedBytes
 * Using estimatedBytes = 200 (conservative estimate for simple transfer)
 * 
 * This fallback is used when:
 * 1. Server is unavailable
 * 2. Blockfrost is not configured
 * 3. Transaction building fails
 * 
 * NOTE: Replace with accurate Blockfrost/Lucid estimation when available
 */
const FALLBACK_FEE_BASE_ADA = 0.17;
const FALLBACK_FEE_PER_BYTE = 0.0001;
const FALLBACK_ESTIMATED_BYTES = 200;

// ============================================================================
// State
// ============================================================================

let connectedWallet = null;      // { name, api, address, hexAddress, networkId }
let pendingTx = null;            // { unsignedTxCborHex, estimatedFee, lovelace, adaAmount }
let isProcessing = false;        // Prevent double-click
let previewGenerated = false;    // Track if preview has been generated

// ============================================================================
// Fee Estimation
// ============================================================================

/**
 * Calculate conservative fallback fee when server/Blockfrost unavailable
 * Formula: 0.17 + 0.0001 * 200 = ~0.19 ADA
 * 
 * @returns {number} Estimated fee in ADA
 */
function calculateFallbackFee() {
  // FALLBACK: Conservative fee estimation
  // Replace with accurate estimation when Blockfrost integration is complete
  const fallbackFeeAda = FALLBACK_FEE_BASE_ADA + (FALLBACK_FEE_PER_BYTE * FALLBACK_ESTIMATED_BYTES);
  return fallbackFeeAda;
}

/**
 * Estimate transaction fee
 * Priority order:
 * 1. Use server's /api/estimate-fee endpoint if available
 * 2. Use Blockfrost + cardano-serialization-lib if configured
 * 3. Fall back to conservative estimate
 * 
 * @param {string} senderAddress - Sender's bech32 address
 * @param {string} lovelace - Amount in lovelace
 * @returns {Promise<{feeLovelace: string, source: string}>}
 */
async function estimateFee(senderAddress, lovelace) {
  const serverUrl = document.getElementById('server-url')?.value || 'http://localhost:4000';
  
  // Try server estimation first
  try {
    const response = await fetch(`${serverUrl}/api/build-tx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderAddress, lovelace })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        feeLovelace: result.estimatedFee,
        source: 'server',
        unsignedTxCborHex: result.unsignedTxCborHex,
        recipient: result.recipient,
        network: result.network
      };
    }
  } catch (err) {
    console.warn('Server fee estimation failed:', err.message);
  }
  
  // Try local Blockfrost fallback if key is provided
  const blockfrostKey = document.getElementById('blockfrost-key')?.value;
  if (blockfrostKey && typeof Lucid !== 'undefined' && typeof Blockfrost !== 'undefined') {
    try {
      const network = document.getElementById('network-select')?.value || 'Mainnet';
      const result = await buildTxLocally(senderAddress, lovelace, network, blockfrostKey);
      return {
        feeLovelace: result.estimatedFee,
        source: 'blockfrost',
        unsignedTxCborHex: result.unsignedTxCborHex,
        recipient: result.recipient,
        network: result.network
      };
    } catch (err) {
      console.warn('Blockfrost fee estimation failed:', err.message);
    }
  }
  
  // FALLBACK: Use conservative fee estimate
  // NOTE: This is a fallback when server and Blockfrost are unavailable
  const fallbackFeeAda = calculateFallbackFee();
  const fallbackFeeLovelace = Math.floor(fallbackFeeAda * 1000000).toString();
  
  return {
    feeLovelace: fallbackFeeLovelace,
    source: 'fallback',
    unsignedTxCborHex: null,
    recipient: HOSKDOG_RECEIVING_ADDRESS,
    network: document.getElementById('network-select')?.value || 'Mainnet'
  };
}

// ============================================================================
// Deposit Preview Flow
// ============================================================================

/**
 * Generate and display deposit preview
 * Shows: amount, estimated fee, total deduction, expected receipt
 */
async function generatePreview() {
  if (isProcessing) return;
  
  const amountInput = document.getElementById('amount-input');
  const previewBtn = document.getElementById('preview-btn');
  const prepareBtn = document.getElementById('prepare-btn');
  const previewEl = document.getElementById('deposit-preview');
  const previewError = document.getElementById('preview-error');
  const statusEl = document.getElementById('prepare-status');
  
  // Validate wallet connection
  if (!connectedWallet) {
    showPreviewError('Please connect your wallet first.');
    return;
  }
  
  // Validate amount
  const adaAmount = parseFloat(amountInput?.value);
  if (isNaN(adaAmount) || adaAmount < 1) {
    showPreviewError('Please enter a valid amount (minimum 1 ADA).');
    return;
  }
  
  if (adaAmount > 1000000) {
    showPreviewError('Amount seems too large. Please double-check.');
    return;
  }
  
  try {
    isProcessing = true;
    previewBtn.disabled = true;
    previewBtn.textContent = '⏳ Estimating...';
    hidePreviewError();
    
    const lovelace = Math.floor(adaAmount * 1000000).toString();
    
    // Estimate fee
    const feeResult = await estimateFee(connectedWallet.address, lovelace);
    const feeAda = parseInt(feeResult.feeLovelace) / 1000000;
    const totalDeductionAda = adaAmount + feeAda;
    
    // Calculate expected receipt
    // NOTE: For now, this is just the deposit amount
    // TODO: Replace with actual pricing/getAmountOut when pool integration is complete
    const expectedReceipt = `${adaAmount.toFixed(2)} ADA deposited`;
    
    // Store fee result for later use
    pendingTx = {
      unsignedTxCborHex: feeResult.unsignedTxCborHex,
      estimatedFee: feeResult.feeLovelace,
      lovelace: lovelace,
      adaAmount: adaAmount,
      network: feeResult.network,
      recipient: feeResult.recipient || HOSKDOG_RECEIVING_ADDRESS,
      feeSource: feeResult.source
    };
    
    // Update preview UI
    document.getElementById('preview-amount').textContent = `${adaAmount.toFixed(2)} ADA`;
    document.getElementById('preview-fee').textContent = `~${feeAda.toFixed(4)} ADA`;
    if (feeResult.source === 'fallback') {
      document.getElementById('preview-fee').textContent += ' (estimated)';
    }
    document.getElementById('preview-total').textContent = `${totalDeductionAda.toFixed(4)} ADA`;
    document.getElementById('preview-receipt').textContent = expectedReceipt;
    
    // Display tx size and serialized tx hex when available
    const txSizeRow = document.getElementById('preview-tx-size-row');
    const txHexContainer = document.getElementById('preview-tx-hex-container');
    const txSizeEl = document.getElementById('preview-tx-size');
    const txHexEl = document.getElementById('preview-tx-hex');
    
    if (feeResult.unsignedTxCborHex && txSizeRow && txHexContainer && txSizeEl && txHexEl) {
      // Calculate tx size in bytes (hex string length / 2)
      const txSizeBytes = Math.floor(feeResult.unsignedTxCborHex.length / 2);
      txSizeEl.textContent = `${txSizeBytes} bytes`;
      txSizeRow.style.display = 'flex';
      
      // Show serialized tx hex
      txHexEl.textContent = feeResult.unsignedTxCborHex;
      txHexContainer.style.display = 'block';
    } else {
      // Hide tx size and hex when not available (fallback mode)
      if (txSizeRow) txSizeRow.style.display = 'none';
      if (txHexContainer) txHexContainer.style.display = 'none';
    }
    
    // Show preview section
    previewEl.style.display = 'block';
    
    // Enable confirm button
    prepareBtn.style.display = 'block';
    prepareBtn.disabled = false;
    previewGenerated = true;
    
    // Add note about fee estimation source
    if (feeResult.source === 'fallback') {
      showStatus(statusEl, '⚠️ Using estimated fee (server unavailable). Actual fee may differ.', 'warning');
    } else {
      showStatus(statusEl, '✅ Preview ready. Review details and click Confirm & Sign.', 'success');
    }
    
    // Update deposit preview with wallet connected
    updateDepositPreview();
    
  } catch (error) {
    console.error('Preview generation error:', error);
    showPreviewError(`Failed to generate preview: ${error.message}`);
    previewGenerated = false;
  } finally {
    isProcessing = false;
    previewBtn.disabled = false;
    previewBtn.textContent = '👁️ Generate Preview';
  }
}

function showPreviewError(message) {
  const previewError = document.getElementById('preview-error');
  if (previewError) {
    previewError.textContent = `❌ ${message}`;
    previewError.style.display = 'block';
  }
  
  const previewEl = document.getElementById('deposit-preview');
  if (previewEl) {
    previewEl.style.display = 'block';
  }
  
  const prepareBtn = document.getElementById('prepare-btn');
  if (prepareBtn) {
    prepareBtn.disabled = true;
  }
}

function hidePreviewError() {
  const previewError = document.getElementById('preview-error');
  if (previewError) {
    previewError.style.display = 'none';
  }
}

// ============================================================================
// Wallet Connection (via unified dropdown events)
// ============================================================================

/**
 * Initialize wallet dropdown on page load
 */
function initWalletDropdown() {
  // Check if wallet dropdown module is loaded
  if (window.WalletDropdown) {
    WalletDropdown.init('deposit-wallet-dropdown');
  }
}

/**
 * Handle wallet connected event from unified dropdown
 */
function handleWalletConnected(event) {
  const { walletId, walletName, address, hexAddress, networkId, api } = event.detail;
  
  connectedWallet = {
    name: walletName,
    id: walletId,
    api: api,
    address: address,
    hexAddress: hexAddress,
    networkId: networkId
  };
  
  const statusEl = document.getElementById('wallet-status');
  showStatus(statusEl, `✅ Connected to ${walletName}<br><small>${truncateAddress(address)}</small>`, 'success');
  
  // Enable preview button
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.disabled = false;
  }
  
  // Check network match
  checkNetworkMatch();
}

/**
 * Handle wallet disconnected event
 */
function handleWalletDisconnected() {
  connectedWallet = null;
  pendingTx = null;
  previewGenerated = false;
  
  const statusEl = document.getElementById('wallet-status');
  statusEl.classList.remove('show');
  
  const previewBtn = document.getElementById('preview-btn');
  const prepareBtn = document.getElementById('prepare-btn');
  const previewEl = document.getElementById('deposit-preview');
  
  if (previewBtn) previewBtn.disabled = true;
  if (prepareBtn) {
    prepareBtn.disabled = true;
    prepareBtn.style.display = 'none';
  }
  if (previewEl) previewEl.style.display = 'none';
}

/**
 * Check if wallet network matches selected network
 */
async function checkNetworkMatch() {
  if (!connectedWallet) return;
  
  const selectedNetwork = document.getElementById('network-select')?.value;
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
// Deposit Preview with Fee Estimation
// ============================================================================

/**
 * Calculate conservative fee estimate when server is unavailable
 * Uses Cardano fee formula: fee = a + b * txSize
 * 
 * @param {number} estimatedTxSize - Estimated transaction size in bytes (default: 350)
 * @returns {number} - Estimated fee in lovelace
 */
function calculateFallbackFee(estimatedTxSize = ESTIMATED_TX_SIZE_BYTES) {
  // fee = 155381 + 44 * txSize (in lovelace)
  // For a typical simple transfer (~350 bytes): ~170,781 lovelace (~0.17 ADA)
  // We add a small buffer for safety
  const baseFee = FEE_CONSTANT_LOVELACE + (FEE_PER_BYTE_LOVELACE * estimatedTxSize);
  const safetyBuffer = 30000; // ~0.03 ADA buffer
  return baseFee + safetyBuffer;
}

/**
 * Update the deposit preview based on current input
 * Called when amount changes or wallet connects
 */
async function updateDepositPreview() {
  const previewBox = document.getElementById('deposit-preview');
  const amountInput = document.getElementById('amount-input');
  const previewAmount = document.getElementById('preview-amount');
  const previewFee = document.getElementById('preview-fee');
  const previewTotal = document.getElementById('preview-total');
  const previewReceipt = document.getElementById('preview-receipt');
  const previewError = document.getElementById('preview-error');
  const prepareBtn = document.getElementById('prepare-btn');
  
  if (!previewBox) return;
  
  // Clear any pending debounce
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }
  
  // Debounce to avoid too many updates
  previewDebounceTimer = setTimeout(async () => {
    const adaAmount = parseFloat(amountInput?.value);
    
    // Hide preview if no valid amount
    if (isNaN(adaAmount) || adaAmount < 1) {
      previewBox.style.display = 'none';
      if (prepareBtn) prepareBtn.disabled = true;
      return;
    }
    
    // Show preview box
    previewBox.style.display = 'block';
    previewError.style.display = 'none';
    
    // Update deposit amount
    if (previewAmount) {
      previewAmount.textContent = `${adaAmount.toFixed(2)} ADA`;
    }
    
    // Estimate fee
    let estimatedFeeLovelace;
    let feeSource = 'fallback';
    
    // Try to get fee from server if available and wallet connected
    const serverUrl = document.getElementById('server-url')?.value || 'http://localhost:4000';
    
    if (connectedWallet) {
      try {
        // Try to get a real fee estimate from the server
        // Use AbortController for browser compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`${serverUrl}/api/health`, { 
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // Server is available, we'll get real fee during prepareDeposit
          // For now, use a reasonable estimate based on typical Cardano fees
          estimatedFeeLovelace = calculateFallbackFee(350);
          feeSource = 'estimate';
        }
      } catch {
        // Server unavailable, use fallback
        estimatedFeeLovelace = calculateFallbackFee(350);
      }
    } else {
      // No wallet connected, use fallback estimate
      estimatedFeeLovelace = calculateFallbackFee(350);
    }
    
    if (!estimatedFeeLovelace) {
      estimatedFeeLovelace = calculateFallbackFee(350);
    }
    
    const estimatedFeeAda = estimatedFeeLovelace / 1000000;
    const totalDeduction = adaAmount + estimatedFeeAda;
    
    // Update fee display
    if (previewFee) {
      const feeLabel = feeSource === 'fallback' ? '~' : '≈';
      previewFee.textContent = `${feeLabel}${estimatedFeeAda.toFixed(4)} ADA`;
    }
    
    // Update total
    if (previewTotal) {
      previewTotal.textContent = `≈${totalDeduction.toFixed(4)} ADA`;
    }
    
    // Update expected receipt (placeholder - tokens credited based on deposit)
    if (previewReceipt) {
      // Note: This is a placeholder. Real receipt depends on the token sale mechanics
      previewReceipt.innerHTML = `${adaAmount.toFixed(2)} ADA credited to treasury<br><small style="color:var(--muted);">HKDG tokens sent manually after verification</small>`;
    }
    
    // Enable prepare button only if wallet is connected and amount is valid
    if (prepareBtn) {
      prepareBtn.disabled = !connectedWallet || isNaN(adaAmount) || adaAmount < 1;
    }
    
    // Show warning if no wallet connected
    if (!connectedWallet) {
      previewError.style.display = 'block';
      previewError.textContent = '⚠️ Connect your wallet to proceed with deposit';
    }
    
  }, 300); // 300ms debounce
}

// ============================================================================
// Transaction Building and Submission
// ============================================================================

/**
 * Prepare the deposit transaction (called after preview is confirmed)
 */
async function prepareDeposit() {
  if (isProcessing || !connectedWallet) return;
  
  // Check if preview has been generated
  if (!previewGenerated || !pendingTx) {
    showPreviewError('Please generate a preview first.');
    return;
  }
  
  const statusEl = document.getElementById('prepare-status');
  const prepareBtn = document.getElementById('prepare-btn');
  
  try {
    isProcessing = true;
    prepareBtn.disabled = true;
    prepareBtn.textContent = '⏳ Preparing...';
    
    // If we don't have a pre-built transaction (fallback fee was used), build it now
    if (!pendingTx.unsignedTxCborHex) {
      showStatus(statusEl, '🔄 Building transaction...', 'info');
      
      const serverUrl = document.getElementById('server-url')?.value || 'http://localhost:4000';
      const network = document.getElementById('network-select')?.value || 'Mainnet';
      
      let result = null;
      
      try {
        result = await buildTxViaServer(serverUrl, connectedWallet.address, pendingTx.lovelace);
        pendingTx.unsignedTxCborHex = result.unsignedTxCborHex;
        pendingTx.estimatedFee = result.estimatedFee;
      } catch (serverErr) {
        console.warn('Server unavailable:', serverErr.message);
        
        // Try local fallback if Blockfrost key is provided
        const blockfrostKey = document.getElementById('blockfrost-key')?.value;
        if (blockfrostKey) {
          showStatus(statusEl, '⚠️ Server unavailable, using local fallback...', 'warning');
          result = await buildTxLocally(connectedWallet.address, pendingTx.lovelace, network, blockfrostKey);
          pendingTx.unsignedTxCborHex = result.unsignedTxCborHex;
          pendingTx.estimatedFee = result.estimatedFee;
        } else {
          throw new Error(`Server unavailable: ${serverErr.message}. Start the deposit server or provide a Blockfrost key.`);
        }
      }
    }
    
    // Show confirmation modal
    showConfirmModal();
    
    showStatus(statusEl, '✅ Transaction ready. Please review and confirm.', 'success');
    
  } catch (error) {
    console.error('Prepare error:', error);
    showStatus(statusEl, `❌ ${error.message}`, 'error');
  } finally {
    isProcessing = false;
    prepareBtn.disabled = !previewGenerated;
    prepareBtn.textContent = '✅ Confirm & Sign';
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
    const serverUrl = document.getElementById('server-url')?.value || 'http://localhost:4000';
    let result = null;
    
    try {
      result = await submitTxViaServer(serverUrl, signedTxCborHex);
    } catch (serverErr) {
      // Try local fallback
      const blockfrostKey = document.getElementById('blockfrost-key')?.value;
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
      previewGenerated = false;
      
      // Reset preview UI
      const previewEl = document.getElementById('deposit-preview');
      const prepareBtn = document.getElementById('prepare-btn');
      if (previewEl) previewEl.style.display = 'none';
      if (prepareBtn) {
        prepareBtn.style.display = 'none';
        prepareBtn.disabled = true;
      }
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
  if (!element) return;
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
// NOTE: These utilities are intentionally duplicated from wallet-dropdown.js
// to keep this module self-contained and functional independently.
// If the wallet dropdown is loaded, it provides hexToBech32 via WalletDropdown.hexToBech32
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

// Initialize on page load
window.addEventListener('load', () => {
  // Initialize wallet dropdown
  initWalletDropdown();
});

// Listen for wallet connection events from unified dropdown
document.addEventListener('walletConnected', handleWalletConnected);
document.addEventListener('walletDisconnected', handleWalletDisconnected);

// Check network match when network selection changes
document.getElementById('network-select')?.addEventListener('change', () => {
  checkNetworkMatch();
  // Reset preview when network changes
  previewGenerated = false;
  const previewEl = document.getElementById('deposit-preview');
  const prepareBtn = document.getElementById('prepare-btn');
  if (previewEl) previewEl.style.display = 'none';
  if (prepareBtn) {
    prepareBtn.style.display = 'none';
    prepareBtn.disabled = true;
  }
});

// Reset preview when amount changes
document.getElementById('amount-input')?.addEventListener('input', () => {
  previewGenerated = false;
  const prepareBtn = document.getElementById('prepare-btn');
  if (prepareBtn) {
    prepareBtn.style.display = 'none';
    prepareBtn.disabled = true;
  }
});

// Handle keyboard navigation in dropdown
document.addEventListener('keydown', (e) => {
  // Close modal on escape
  if (e.key === 'Escape') {
    closeModal();
    closeWalletDropdown();
    return;
  }
  
  // Dropdown keyboard navigation
  const menu = document.getElementById('wallet-dropdown-menu');
  if (!menu || menu.style.display !== 'block') return;
  
  const items = menu.querySelectorAll('.wallet-dropdown-item');
  const focused = document.activeElement;
  const idx = Array.from(items).indexOf(focused);
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (idx < items.length - 1) items[idx + 1].focus();
    else items[0].focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx > 0) items[idx - 1].focus();
    else items[items.length - 1].focus();
  }
});

// Close modal when clicking outside
document.getElementById('confirm-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'confirm-modal') closeModal();
});
