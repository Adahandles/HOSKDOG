/**
 * Cookie Consent Banner
 * GDPR/CCPA compliant cookie consent management
 * Shows before legal disclaimer modal
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'hoskdog_cookie_consent';
  const STORAGE_VERSION = '1.0';

  /**
   * Default cookie preferences
   */
  const defaultPreferences = {
    version: STORAGE_VERSION,
    essential: true,      // Always true, cannot be disabled
    functional: false,
    analytics: false,
    timestamp: null
  };

  /**
   * Get current cookie preferences
   */
  function getPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.version === STORAGE_VERSION) {
          return prefs;
        }
      }
    } catch (e) {
      console.warn('Failed to load cookie preferences:', e);
    }
    return null;
  }

  /**
   * Save cookie preferences
   */
  function savePreferences(prefs) {
    try {
      prefs.timestamp = new Date().toISOString();
      prefs.version = STORAGE_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      return true;
    } catch (e) {
      console.error('Failed to save cookie preferences:', e);
      return false;
    }
  }

  /**
   * Check if consent has been given
   */
  function hasConsent() {
    return getPreferences() !== null;
  }

  /**
   * Create banner HTML
   */
  function createBanner() {
    const banner = document.createElement('div');
    banner.className = 'cookie-consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent banner');

    banner.innerHTML = `
      <div class="cookie-consent-container">
        <div class="cookie-consent-content">
          <h3 class="cookie-consent-title">🍪 Cookie Consent</h3>
          <p class="cookie-consent-text">
            We use essential cookies to make our site work. We'd also like to use optional cookies 
            to improve your experience and analyze site traffic.
          </p>
          <div class="cookie-consent-links">
            <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
            <a href="/terms-of-service.html" target="_blank">Terms of Service</a>
          </div>
        </div>
        <div class="cookie-consent-actions">
          <button class="cookie-btn cookie-btn-accept" id="cookie-accept-all">
            Accept All
          </button>
          <button class="cookie-btn cookie-btn-reject" id="cookie-reject-all">
            Reject Non-Essential
          </button>
          <button class="cookie-btn cookie-btn-customize" id="cookie-customize">
            Customize
          </button>
        </div>
      </div>
    `;

    return banner;
  }

  /**
   * Create preferences modal HTML
   */
  function createPreferencesModal() {
    const modal = document.createElement('div');
    modal.className = 'cookie-preferences-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'cookie-prefs-title');

    modal.innerHTML = `
      <div class="cookie-preferences-content">
        <div class="cookie-preferences-header">
          <h2 id="cookie-prefs-title">Cookie Preferences</h2>
          <p>Manage your cookie settings. Essential cookies are required for the site to function.</p>
        </div>
        <div class="cookie-preferences-body">
          <div class="cookie-category">
            <div class="cookie-category-header">
              <h3 class="cookie-category-title">Essential Cookies</h3>
              <label class="cookie-toggle">
                <input type="checkbox" checked disabled id="pref-essential">
                <span class="cookie-toggle-slider"></span>
              </label>
            </div>
            <p class="cookie-category-description">
              Required for the website to function. These include legal disclaimer acceptance, 
              cookie consent status, and basic functionality. Cannot be disabled.
            </p>
          </div>
          <div class="cookie-category">
            <div class="cookie-category-header">
              <h3 class="cookie-category-title">Functional Cookies</h3>
              <label class="cookie-toggle">
                <input type="checkbox" id="pref-functional">
                <span class="cookie-toggle-slider"></span>
              </label>
            </div>
            <p class="cookie-category-description">
              Remember your preferences and settings to enhance your experience, such as 
              language preferences and UI customizations.
            </p>
          </div>
          <div class="cookie-category">
            <div class="cookie-category-header">
              <h3 class="cookie-category-title">Analytics Cookies</h3>
              <label class="cookie-toggle">
                <input type="checkbox" id="pref-analytics">
                <span class="cookie-toggle-slider"></span>
              </label>
            </div>
            <p class="cookie-category-description">
              Help us understand how visitors use our site through anonymized data collection. 
              This helps us improve the user experience.
            </p>
          </div>
        </div>
        <div class="cookie-preferences-footer">
          <button class="cookie-btn cookie-btn-reject" id="cookie-prefs-cancel">
            Cancel
          </button>
          <button class="cookie-btn cookie-btn-accept" id="cookie-prefs-save">
            Save Preferences
          </button>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Show banner
   */
  function showBanner(banner) {
    document.body.appendChild(banner);
    setTimeout(() => {
      banner.classList.add('active');
    }, 10);
  }

  /**
   * Hide banner
   */
  function hideBanner(banner) {
    banner.classList.remove('active');
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 400);
  }

  /**
   * Show preferences modal
   */
  function showPreferencesModal(modal) {
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Load current preferences
    const prefs = getPreferences() || defaultPreferences;
    const functionalCheckbox = modal.querySelector('#pref-functional');
    const analyticsCheckbox = modal.querySelector('#pref-analytics');
    
    if (functionalCheckbox) functionalCheckbox.checked = prefs.functional;
    if (analyticsCheckbox) analyticsCheckbox.checked = prefs.analytics;

    setTimeout(() => {
      modal.classList.add('active');
    }, 10);

    // Focus save button
    const saveBtn = modal.querySelector('#cookie-prefs-save');
    if (saveBtn) saveBtn.focus();
  }

  /**
   * Hide preferences modal
   */
  function hidePreferencesModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }

  /**
   * Handle accept all
   */
  function handleAcceptAll(banner) {
    const prefs = {
      ...defaultPreferences,
      functional: true,
      analytics: true
    };
    
    if (savePreferences(prefs)) {
      hideBanner(banner);
      applyCookiePreferences(prefs);
      dispatchConsentEvent('accepted', prefs);
    }
  }

  /**
   * Handle reject non-essential
   */
  function handleRejectAll(banner) {
    const prefs = {
      ...defaultPreferences,
      functional: false,
      analytics: false
    };
    
    if (savePreferences(prefs)) {
      hideBanner(banner);
      applyCookiePreferences(prefs);
      dispatchConsentEvent('rejected', prefs);
    }
  }

  /**
   * Handle customize button
   */
  function handleCustomize(banner) {
    const modal = createPreferencesModal();
    
    const cancelBtn = modal.querySelector('#cookie-prefs-cancel');
    const saveBtn = modal.querySelector('#cookie-prefs-save');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        hidePreferencesModal(modal);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const functionalCheckbox = modal.querySelector('#pref-functional');
        const analyticsCheckbox = modal.querySelector('#pref-analytics');
        
        const prefs = {
          ...defaultPreferences,
          functional: functionalCheckbox ? functionalCheckbox.checked : false,
          analytics: analyticsCheckbox ? analyticsCheckbox.checked : false
        };
        
        if (savePreferences(prefs)) {
          hidePreferencesModal(modal);
          hideBanner(banner);
          applyCookiePreferences(prefs);
          dispatchConsentEvent('customized', prefs);
        }
      });
    }

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hidePreferencesModal(modal);
      }
    });

    showPreferencesModal(modal);
  }

  /**
   * Apply cookie preferences (placeholder for actual cookie management)
   */
  function applyCookiePreferences(prefs) {
    // In a real implementation, this would:
    // - Enable/disable analytics scripts
    // - Enable/disable functional features
    // - Clean up cookies if user revokes consent
    
    console.log('Cookie preferences applied:', prefs);
    
    // Example: Load analytics only if consented
    if (prefs.analytics) {
      // loadAnalytics();
    }
  }

  /**
   * Dispatch consent event for other scripts
   */
  function dispatchConsentEvent(action, prefs) {
    window.dispatchEvent(new CustomEvent('hoskdog:cookieConsent', {
      detail: { action, preferences: prefs }
    }));
  }

  /**
   * Initialize cookie consent
   */
  function init() {
    // Check if consent already given
    if (hasConsent()) {
      const prefs = getPreferences();
      applyCookiePreferences(prefs);
      return;
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Create and show banner
    const banner = createBanner();
    
    const acceptBtn = banner.querySelector('#cookie-accept-all');
    const rejectBtn = banner.querySelector('#cookie-reject-all');
    const customizeBtn = banner.querySelector('#cookie-customize');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => handleAcceptAll(banner));
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => handleRejectAll(banner));
    }

    if (customizeBtn) {
      customizeBtn.addEventListener('click', () => handleCustomize(banner));
    }

    showBanner(banner);
  }

  // Start initialization
  init();

  // Expose API for testing and management
  window.hoskdogCookies = {
    reset: function() {
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('Cookie consent reset');
      } catch (e) {
        console.error('Failed to reset:', e);
      }
    },
    getPreferences: getPreferences,
    hasConsent: hasConsent,
    showPreferences: function() {
      const modal = createPreferencesModal();
      const cancelBtn = modal.querySelector('#cookie-prefs-cancel');
      const saveBtn = modal.querySelector('#cookie-prefs-save');

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => hidePreferencesModal(modal));
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const functionalCheckbox = modal.querySelector('#pref-functional');
          const analyticsCheckbox = modal.querySelector('#pref-analytics');
          
          const prefs = {
            ...defaultPreferences,
            functional: functionalCheckbox ? functionalCheckbox.checked : false,
            analytics: analyticsCheckbox ? analyticsCheckbox.checked : false
          };
          
          if (savePreferences(prefs)) {
            hidePreferencesModal(modal);
            applyCookiePreferences(prefs);
            dispatchConsentEvent('customized', prefs);
          }
        });
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          hidePreferencesModal(modal);
        }
      });

      showPreferencesModal(modal);
    }
  };
})();
