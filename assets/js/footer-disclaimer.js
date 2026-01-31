/**
 * Footer Disclaimer Component
 * Adds a persistent legal disclaimer to the bottom of every page
 */

(function() {
  'use strict';

  /**
   * Create footer disclaimer HTML
   */
  function createFooterDisclaimer() {
    const footer = document.createElement('div');
    footer.id = 'hoskdog-footer-disclaimer';
    footer.style.cssText = `
      background: linear-gradient(135deg, rgba(12, 18, 28, 0.95), rgba(11, 15, 26, 0.95));
      border-top: 2px solid rgba(8, 253, 216, 0.3);
      padding: 20px;
      text-align: center;
      font-family: 'Rubik', sans-serif;
      color: #88ffe0;
      font-size: 0.9rem;
      line-height: 1.6;
      position: relative;
      z-index: 100;
      margin-top: 40px;
    `;

    footer.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <p style="margin: 0 0 12px 0; color: #ff6b6b; font-weight: 600;">
          ⚠️ NOT FINANCIAL ADVICE
        </p>
        <p style="margin: 0 0 12px 0;">
          HOSKDOG is a meme token for entertainment purposes only. 
          Cryptocurrency involves extreme risk. You may lose everything. 
          This is not an investment product.
        </p>
        <div style="margin-top: 12px;">
          <a href="/terms-of-service.html" style="color: #08fdd8; text-decoration: none; margin: 0 10px; transition: color 0.2s;" onmouseover="this.style.color='#05e3c4'" onmouseout="this.style.color='#08fdd8'">Terms of Service</a>
          <span style="color: rgba(8, 253, 216, 0.3);">|</span>
          <a href="/privacy-policy.html" style="color: #08fdd8; text-decoration: none; margin: 0 10px; transition: color 0.2s;" onmouseover="this.style.color='#05e3c4'" onmouseout="this.style.color='#08fdd8'">Privacy Policy</a>
          <span style="color: rgba(8, 253, 216, 0.3);">|</span>
          <a href="/risk-disclosure.html" style="color: #08fdd8; text-decoration: none; margin: 0 10px; transition: color 0.2s;" onmouseover="this.style.color='#05e3c4'" onmouseout="this.style.color='#08fdd8'">Risk Disclosure</a>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 0.8rem; color: rgba(136, 255, 224, 0.6);">
          © ${new Date().getFullYear()} HOSKDOG. All rights reserved. Not affiliated with any financial institution.
        </p>
      </div>
    `;

    return footer;
  }

  /**
   * Insert footer disclaimer at the end of the body
   */
  function insertFooter() {
    // Check if footer already exists
    if (document.getElementById('hoskdog-footer-disclaimer')) {
      return;
    }

    const footer = createFooterDisclaimer();
    document.body.appendChild(footer);
  }

  /**
   * Initialize footer disclaimer
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', insertFooter);
    } else {
      insertFooter();
    }
  }

  // Start initialization
  init();

  // Expose for programmatic access
  window.hoskdogFooter = {
    insert: insertFooter
  };
})();
