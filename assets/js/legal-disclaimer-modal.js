/**
 * Legal Disclaimer Modal
 * Shows on first visit and requires acceptance before continuing
 * Uses localStorage to track acceptance
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'hoskdog_legal_accepted';
  const STORAGE_VERSION = '1.0';

  /**
   * Check if user has already accepted the disclaimer
   */
  function hasAcceptedDisclaimer() {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      return accepted === STORAGE_VERSION;
    } catch (e) {
      console.warn('localStorage not available, assuming not accepted');
      return false;
    }
  }

  /**
   * Mark disclaimer as accepted
   */
  function acceptDisclaimer() {
    try {
      localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
      return true;
    } catch (e) {
      console.error('Failed to save acceptance to localStorage:', e);
      return false;
    }
  }

  /**
   * Create and inject the modal HTML
   */
  function createModal() {
    const overlay = document.createElement('div');
    overlay.className = 'legal-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'legal-modal-title');

    overlay.innerHTML = `
      <div class="legal-modal">
        <div class="legal-modal-header">
          <div class="legal-modal-icon" aria-hidden="true">⚠️</div>
          <h2 class="legal-modal-title" id="legal-modal-title">IMPORTANT DISCLAIMER</h2>
          <p class="legal-modal-subtitle">Please read carefully before continuing</p>
        </div>
        <div class="legal-modal-content">
          <p><strong>HOSKDOG is a meme token created for entertainment and community purposes only.</strong></p>
          <ul class="legal-disclaimer-list">
            <li>This is NOT an investment product</li>
            <li>No expectation of profit or financial return</li>
            <li>Token may lose all value at any time</li>
            <li>Not financial, legal, or tax advice</li>
            <li>You may lose everything you put in</li>
            <li>All transactions are final and irreversible</li>
          </ul>
          <div class="legal-links">
            <p>By continuing, you acknowledge you have read and accept:</p>
            <a href="/terms-of-service.html" target="_blank">Terms of Service</a>
            <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
            <a href="/risk-disclosure.html" target="_blank">Risk Disclosure</a>
          </div>
        </div>
        <div class="legal-modal-footer">
          <button class="legal-accept-btn" id="legal-accept-btn">
            I Understand and Accept the Risks
          </button>
          <button class="legal-decline-btn" id="legal-decline-btn">
            I Do Not Accept
          </button>
        </div>
      </div>
    `;

    return overlay;
  }

  /**
   * Show the modal
   */
  function showModal(modal) {
    document.body.appendChild(modal);
    // Small delay to ensure CSS transition works
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Focus the accept button for accessibility
    const acceptBtn = modal.querySelector('#legal-accept-btn');
    if (acceptBtn) {
      acceptBtn.focus();
    }
  }

  /**
   * Hide and remove the modal
   */
  function hideModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Wait for animation to complete before removing
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }

  /**
   * Handle acceptance
   */
  function handleAccept(modal) {
    if (acceptDisclaimer()) {
      hideModal(modal);
      // Dispatch custom event for other scripts to listen to
      window.dispatchEvent(new CustomEvent('hoskdog:legalAccepted'));
    } else {
      alert('Unable to save your acceptance. Please check your browser settings and try again.');
    }
  }

  /**
   * Handle decline
   */
  function handleDecline() {
    const confirmed = confirm(
      'If you do not accept the terms, you cannot use this website. ' +
      'You will be redirected away from this site. Continue?'
    );
    
    if (confirmed) {
      // Redirect to a neutral page
      window.location.href = 'about:blank';
    }
  }

  /**
   * Initialize the legal disclaimer modal
   */
  function init() {
    // Check if already accepted
    if (hasAcceptedDisclaimer()) {
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Create and show modal
    const modal = createModal();
    
    // Set up event listeners
    const acceptBtn = modal.querySelector('#legal-accept-btn');
    const declineBtn = modal.querySelector('#legal-decline-btn');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => handleAccept(modal));
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', handleDecline);
    }

    // Prevent closing modal by clicking overlay
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        // Optional: shake animation or alert
        const modalContent = modal.querySelector('.legal-modal');
        if (modalContent) {
          modalContent.style.animation = 'none';
          setTimeout(() => {
            modalContent.style.animation = 'slideUp 0.4s ease-out';
          }, 10);
        }
      }
    });

    // Handle ESC key (but don't allow closing)
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        e.preventDefault();
        alert('You must accept or decline the disclaimer to continue.');
      }
    });

    // Show the modal
    showModal(modal);
  }

  // Start initialization
  init();

  // Expose reset function for testing
  window.hoskdogLegal = {
    reset: function() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('Legal acceptance reset');
      } catch (e) {
        console.error('Failed to reset:', e);
      }
    },
    hasAccepted: hasAcceptedDisclaimer
  };
})();
