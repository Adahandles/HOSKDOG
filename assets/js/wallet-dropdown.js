/**
 * HOSKDOG Unified Wallet Dropdown
 * 
 * This module provides a single "Connect Wallet" button with a dropdown menu
 * to select wallet type (Eternl, Lace, or Other wallets).
 * 
 * Emits 'walletConnected' and 'walletDisconnected' events on document for
 * cross-component communication.
 */

(function() {
  'use strict';

  // ============================================================================
  // Configuration - Supported Wallets
  // ============================================================================
  
  const SUPPORTED_WALLETS = [
    { id: 'eternl', name: 'Eternl', emoji: '♾️', priority: 1 },
    { id: 'lace', name: 'Lace', emoji: '🦀', priority: 2 },
    { id: 'nami', name: 'Nami', emoji: '🌊', priority: 3 },
    { id: 'flint', name: 'Flint', emoji: '🔥', priority: 4 },
    { id: 'typhon', name: 'Typhon', emoji: '🌪️', priority: 5 },
    { id: 'nufi', name: 'NuFi', emoji: '🔐', priority: 6 }
  ];

  // ============================================================================
  // State
  // ============================================================================
  
  let connectedWalletState = null;
  let isDropdownOpen = false;

  // ============================================================================
  // Bech32 Utilities (for address conversion)
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
    if (!hexAddr || typeof hexAddr !== 'string') return hexAddr;
    // If already bech32, return as is
    if (hexAddr.startsWith('addr')) return hexAddr;
    
    const bytes = hexToBytes(hexAddr);
    const networkByte = bytes[0];
    const isTestnet = (networkByte & 0x0F) === 0x00;
    const hrp = isTestnet ? 'addr_test' : 'addr';
    const words = convertBits(bytes, 8, 5, true);
    return bech32Encode(hrp, words);
  }

  // ============================================================================
  // Wallet Detection
  // ============================================================================
  
  function getAvailableWallets() {
    if (!window.cardano) return [];
    
    return SUPPORTED_WALLETS.filter(wallet => {
      return window.cardano[wallet.id] !== undefined;
    });
  }

  // ============================================================================
  // Wallet Connection
  // ============================================================================
  
  async function connectToWallet(walletId) {
    const walletConfig = SUPPORTED_WALLETS.find(w => w.id === walletId);
    if (!walletConfig) {
      throw new Error(`Unknown wallet: ${walletId}`);
    }

    if (!window.cardano || !window.cardano[walletId]) {
      throw new Error(`${walletConfig.name} wallet not found. Please install the browser extension.`);
    }

    try {
      const api = await window.cardano[walletId].enable();
      
      // Get network ID to verify mainnet
      const networkId = await api.getNetworkId();
      
      // Get wallet address
      let addresses = await api.getUsedAddresses();
      if (!addresses || addresses.length === 0) {
        addresses = await api.getUnusedAddresses();
      }
      
      if (!addresses || addresses.length === 0) {
        throw new Error('No addresses found in wallet. Please create an address first.');
      }

      const hexAddress = addresses[0];
      const bech32Address = hexToBech32Address(hexAddress);

      connectedWalletState = {
        id: walletId,
        name: walletConfig.name,
        emoji: walletConfig.emoji,
        api: api,
        address: bech32Address,
        hexAddress: hexAddress,
        networkId: networkId,
        isMainnet: networkId === 1
      };

      // Emit wallet connected event
      const event = new CustomEvent('walletConnected', {
        detail: {
          walletId: walletId,
          walletName: walletConfig.name,
          address: bech32Address,
          hexAddress: hexAddress,
          networkId: networkId,
          api: api
        }
      });
      document.dispatchEvent(event);

      return connectedWalletState;
    } catch (error) {
      console.error(`Failed to connect to ${walletConfig.name}:`, error);
      throw error;
    }
  }

  function disconnectWallet() {
    const previousWallet = connectedWalletState;
    connectedWalletState = null;

    // Emit wallet disconnected event
    const event = new CustomEvent('walletDisconnected', {
      detail: previousWallet ? {
        walletId: previousWallet.id,
        walletName: previousWallet.name
      } : null
    });
    document.dispatchEvent(event);
  }

  function getConnectedWallet() {
    return connectedWalletState;
  }

  function isWalletConnected() {
    return connectedWalletState !== null;
  }

  // ============================================================================
  // Dropdown UI
  // ============================================================================
  
  function createDropdownHTML(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Wallet dropdown container not found: ${containerId}`);
      return;
    }

    const html = `
      <div class="wallet-dropdown" id="wallet-dropdown-${containerId}">
        <button 
          class="wallet-dropdown-btn" 
          id="wallet-dropdown-btn-${containerId}"
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-label="Connect Wallet"
        >
          <span class="wallet-dropdown-btn-text">🔗 Connect Wallet</span>
          <span class="wallet-dropdown-arrow">▼</span>
        </button>
        <div 
          class="wallet-dropdown-menu" 
          id="wallet-dropdown-menu-${containerId}"
          role="listbox"
          aria-label="Select wallet"
        >
          <div class="wallet-dropdown-header">Select Wallet</div>
          <div class="wallet-dropdown-options" id="wallet-dropdown-options-${containerId}">
            <!-- Options will be populated dynamically -->
          </div>
        </div>
        <div class="wallet-connected-info" id="wallet-connected-info-${containerId}" style="display: none;">
          <span class="wallet-connected-address" id="wallet-connected-address-${containerId}"></span>
          <button 
            class="wallet-disconnect-btn" 
            id="wallet-disconnect-btn-${containerId}"
            aria-label="Disconnect wallet"
          >
            ✕
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    initializeDropdown(containerId);
  }

  function initializeDropdown(containerId) {
    const dropdown = document.getElementById(`wallet-dropdown-${containerId}`);
    const btn = document.getElementById(`wallet-dropdown-btn-${containerId}`);
    const menu = document.getElementById(`wallet-dropdown-menu-${containerId}`);
    const optionsContainer = document.getElementById(`wallet-dropdown-options-${containerId}`);
    const connectedInfo = document.getElementById(`wallet-connected-info-${containerId}`);
    const connectedAddress = document.getElementById(`wallet-connected-address-${containerId}`);
    const disconnectBtn = document.getElementById(`wallet-disconnect-btn-${containerId}`);

    if (!dropdown || !btn || !menu || !optionsContainer) return;

    // Populate wallet options
    const availableWallets = getAvailableWallets();
    
    if (availableWallets.length === 0) {
      optionsContainer.innerHTML = `
        <div class="wallet-dropdown-no-wallets">
          No Cardano wallets detected.<br>
          <small>Install Eternl, Lace, or another CIP-30 wallet.</small>
        </div>
      `;
    } else {
      optionsContainer.innerHTML = availableWallets.map(wallet => `
        <button 
          class="wallet-dropdown-option" 
          data-wallet-id="${wallet.id}"
          role="option"
          aria-label="Connect ${wallet.name} wallet"
        >
          <span class="wallet-option-emoji">${wallet.emoji}</span>
          <span class="wallet-option-name">${wallet.name}</span>
        </button>
      `).join('');
    }

    // Toggle dropdown on button click
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDropdown(containerId);
    });

    // Handle wallet selection
    optionsContainer.addEventListener('click', async function(e) {
      const option = e.target.closest('.wallet-dropdown-option');
      if (!option) return;

      const walletId = option.dataset.walletId;
      closeDropdown(containerId);
      
      // Show connecting state
      btn.querySelector('.wallet-dropdown-btn-text').textContent = '⏳ Connecting...';
      btn.disabled = true;

      try {
        const wallet = await connectToWallet(walletId);
        updateDropdownUI(containerId, wallet);
      } catch (error) {
        btn.querySelector('.wallet-dropdown-btn-text').textContent = '🔗 Connect Wallet';
        btn.disabled = false;
        alert(`Failed to connect: ${error.message}`);
      }
    });

    // Handle disconnect
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        disconnectWallet();
        resetDropdownUI(containerId);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!dropdown.contains(e.target)) {
        closeDropdown(containerId);
      }
    });

    // Keyboard navigation
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown(containerId);
      } else if (e.key === 'Escape') {
        closeDropdown(containerId);
      }
    });

    // If wallet is already connected, update UI
    if (connectedWalletState) {
      updateDropdownUI(containerId, connectedWalletState);
    }
  }

  function toggleDropdown(containerId) {
    const menu = document.getElementById(`wallet-dropdown-menu-${containerId}`);
    const btn = document.getElementById(`wallet-dropdown-btn-${containerId}`);
    
    if (!menu || !btn) return;

    isDropdownOpen = !isDropdownOpen;
    menu.classList.toggle('open', isDropdownOpen);
    btn.setAttribute('aria-expanded', isDropdownOpen.toString());
  }

  function closeDropdown(containerId) {
    const menu = document.getElementById(`wallet-dropdown-menu-${containerId}`);
    const btn = document.getElementById(`wallet-dropdown-btn-${containerId}`);
    
    if (menu) menu.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    isDropdownOpen = false;
  }

  function updateDropdownUI(containerId, wallet) {
    const btn = document.getElementById(`wallet-dropdown-btn-${containerId}`);
    const connectedInfo = document.getElementById(`wallet-connected-info-${containerId}`);
    const connectedAddress = document.getElementById(`wallet-connected-address-${containerId}`);

    if (btn) {
      btn.style.display = 'none';
    }

    if (connectedInfo && connectedAddress) {
      const shortAddress = wallet.address 
        ? `${wallet.address.substring(0, 10)}...${wallet.address.substring(wallet.address.length - 6)}`
        : 'Connected';
      
      connectedAddress.innerHTML = `${wallet.emoji} ${wallet.name}: <span class="wallet-address-text">${shortAddress}</span>`;
      connectedInfo.style.display = 'flex';
    }
  }

  function resetDropdownUI(containerId) {
    const btn = document.getElementById(`wallet-dropdown-btn-${containerId}`);
    const connectedInfo = document.getElementById(`wallet-connected-info-${containerId}`);

    if (btn) {
      btn.style.display = 'flex';
      btn.disabled = false;
      btn.querySelector('.wallet-dropdown-btn-text').textContent = '🔗 Connect Wallet';
    }

    if (connectedInfo) {
      connectedInfo.style.display = 'none';
    }
  }

  // ============================================================================
  // CSS Injection (minimal inline styles)
  // ============================================================================
  
  function injectStyles() {
    if (document.getElementById('wallet-dropdown-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'wallet-dropdown-styles';
    styles.textContent = `
      .wallet-dropdown {
        position: relative;
        display: inline-block;
        font-family: 'Rubik', sans-serif;
      }

      .wallet-dropdown-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 24px;
        background: linear-gradient(45deg, #08fdd8, #05e3c4);
        color: #000;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(8, 253, 216, 0.4);
        min-width: 180px;
      }

      .wallet-dropdown-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 0 25px rgba(8, 253, 216, 0.6);
      }

      .wallet-dropdown-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      .wallet-dropdown-arrow {
        font-size: 0.7rem;
        transition: transform 0.3s ease;
      }

      .wallet-dropdown-btn[aria-expanded="true"] .wallet-dropdown-arrow {
        transform: rotate(180deg);
      }

      .wallet-dropdown-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        min-width: 200px;
        background: rgba(12, 18, 28, 0.98);
        border: 2px solid rgba(8, 253, 216, 0.3);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
      }

      .wallet-dropdown-menu.open {
        opacity: 1;
        visibility: visible;
      }

      .wallet-dropdown-header {
        padding: 12px 16px;
        font-size: 0.9rem;
        color: #88ffe0;
        border-bottom: 1px solid rgba(8, 253, 216, 0.2);
        text-align: center;
      }

      .wallet-dropdown-options {
        padding: 8px;
      }

      .wallet-dropdown-option {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: #e0faff;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }

      .wallet-dropdown-option:hover {
        background: rgba(8, 253, 216, 0.15);
        color: #08fdd8;
      }

      .wallet-dropdown-option:focus {
        outline: 2px solid #08fdd8;
        outline-offset: 2px;
      }

      .wallet-option-emoji {
        font-size: 1.2rem;
      }

      .wallet-dropdown-no-wallets {
        padding: 16px;
        text-align: center;
        color: #88ffe0;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .wallet-connected-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        background: rgba(8, 253, 216, 0.1);
        border: 2px solid rgba(8, 253, 216, 0.3);
        border-radius: 8px;
        color: #e0faff;
        font-size: 0.95rem;
      }

      .wallet-connected-address {
        flex: 1;
      }

      .wallet-address-text {
        font-family: monospace;
        font-size: 0.85rem;
        color: #08fdd8;
      }

      .wallet-disconnect-btn {
        background: transparent;
        border: 1px solid rgba(255, 100, 100, 0.5);
        color: #ff6b6b;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .wallet-disconnect-btn:hover {
        background: rgba(255, 100, 100, 0.2);
        border-color: #ff6b6b;
      }
    `;
    document.head.appendChild(styles);
  }

  // ============================================================================
  // Public API
  // ============================================================================
  
  window.WalletDropdown = {
    // Initialize dropdown in a container
    init: function(containerId) {
      injectStyles();
      createDropdownHTML(containerId);
    },

    // Connect to a specific wallet programmatically
    connect: connectToWallet,

    // Disconnect wallet
    disconnect: disconnectWallet,

    // Get connected wallet info
    getConnected: getConnectedWallet,

    // Check if wallet is connected
    isConnected: isWalletConnected,

    // Get list of available wallets
    getAvailable: getAvailableWallets,

    // Utility functions
    hexToBech32: hexToBech32Address
  };

  // Auto-init on DOMContentLoaded for elements with data-wallet-dropdown attribute
  document.addEventListener('DOMContentLoaded', function() {
    injectStyles();
    
    const autoInitContainers = document.querySelectorAll('[data-wallet-dropdown]');
    autoInitContainers.forEach(container => {
      if (container.id) {
        createDropdownHTML(container.id);
      }
    });
  });

})();
