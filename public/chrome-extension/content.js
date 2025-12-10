// Content script - runs in context of web pages
// 
// SECURITY MODEL:
// - Injected on all HTTP/HTTPS pages (via content_scripts.matches)
// - Core functionality (analyzeCurrentPage) is read-only (extracts domain name)
// - Privileged operations (auth token handling) validate origin strictly
// - postMessage listeners reject cross-origin messages (event.origin check)
// - No sensitive data is sent from content script to untrusted contexts
//
// This allows the extension to work on any website for company research
// while maintaining security for authentication token operations.

console.log('ColdMailAI content script loaded');

/**
 * Common two-part TLDs (country-code domains with second-level structure)
 * Examples: co.uk, co.in, com.au, etc.
 * This list covers the most common cases without requiring external dependencies
 */
const COMMON_TWO_PART_TLDS = new Set([
  'co.uk', 'co.jp', 'co.in', 'co.nz', 'co.za', 'co.kr', 'co.il', 'co.id',
  'com.au', 'com.br', 'com.mx', 'com.cn', 'com.my', 'com.sg', 'com.ar',
  'com.ua', 'com.tr', 'com.pk', 'com.vn', 'co.th',
  'ac.uk', 'ac.jp', 'ac.nz', 'ac.kr', 'ac.za',
  'gov.uk', 'gov.au', 'gov.in', 'gov.br', 'gov.mx',
  'org.uk', 'org.au', 'org.in', 'org.br', 'org.nz', 'org.mx',
  'net.au', 'net.nz', 'net.br',
]);

/**
 * Extract registered domain/company name from hostname
 * Handles multi-level subdomains and country-code TLDs correctly
 * e.g., blog.company.com -> "company"
 *       blog.company.co.uk -> "company" (uses common two-part TLD list)
 *       blog.company.example.co.uk -> falls back to second-to-last if not recognized
 */
function extractCompanyName(hostname) {
  try {
    // Remove www. prefix if present
    let cleanHost = hostname.replace(/^www\./, '');
    
    // Split into labels
    const labels = cleanHost.split('.');
    
    if (labels.length === 1) {
      // Single label (rare, edge case)
      return cleanHost;
    } else if (labels.length === 2) {
      // Simple case: company.com -> return "company"
      return labels[0];
    } else {
      // 3+ labels: need to detect if the TLD is two-part
      // e.g., company.co.uk (3 labels), blog.company.co.uk (4 labels)
      const lastTwoParts = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
      
      if (COMMON_TWO_PART_TLDS.has(lastTwoParts.toLowerCase())) {
        // Recognized two-part TLD: return the label before it (the registered domain)
        // e.g., company.co.uk -> labels[0] = "company"
        //       blog.company.co.uk -> labels[1] = "company"
        if (labels.length === 3) {
          return labels[0];
        } else {
          // For subdomains like blog.company.co.uk, return labels[labels.length - 3]
          return labels[labels.length - 3];
        }
      } else {
        // Unrecognized TLD structure, fallback to second-to-last label
        // This handles edge cases and unrecognized multi-part TLDs
        return labels[labels.length - 2];
      }
    }
  } catch (error) {
    console.error('Error extracting company name:', error);
    return 'unknown';
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCurrentPage') {
    const currentUrl = window.location.href;
    
    // Extract company name from domain
    try {
      const urlObj = new URL(currentUrl);
      const companyName = extractCompanyName(urlObj.hostname);
      
      sendResponse({
        success: true,
        url: currentUrl,
        companyName: companyName,
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message,
      });
    }
    return true;
  }
  
  // Handle popup requesting current page URL
  if (request.action === 'getPageUrl') {
    try {
      const currentUrl = window.location.href;
      console.log('Content script sending page URL to popup:', currentUrl);
      sendResponse({
        success: true,
        url: currentUrl,
      });
    } catch (error) {
      console.error('Error getting page URL:', error);
      sendResponse({
        success: false,
        error: error.message,
      });
    }
    return true;
  }
});

// Detect when user logs in via the extension
window.addEventListener('message', (event) => {
  // Security: Only accept messages from same window (not other frames/origins)
  if (event.source !== window) {
    console.warn('Ignoring message from unexpected source');
    return;
  }

  // Security: Validate origin matches current window
  if (event.origin !== window.location.origin) {
    console.warn('Ignoring message from unexpected origin:', event.origin);
    return;
  }

  // Security: Ensure event.data is an object
  if (!event.data || typeof event.data !== 'object') {
    console.warn('Ignoring malformed message - data is not an object');
    return;
  }

  // Security: Ensure type is a string
  const messageType = event.data.type;
  if (typeof messageType !== 'string') {
    console.warn('Ignoring message with invalid type field');
    return;
  }

  // Handle authenticated actions with strict type checking
  if (messageType === 'COLDMAILAI_AUTH_SUCCESS') {
    // Validate token is a non-empty string
    if (typeof event.data.token === 'string' && event.data.token.trim()) {
      chrome.runtime.sendMessage({
        action: 'setAuthToken',
        token: event.data.token,
      });
    } else {
      console.warn('Auth success message has invalid token');
    }
    return;
  }

  if (messageType === 'COLDMAILAI_AUTH_LOGOUT') {
    // Clear auth token (no additional validation needed for logout)
    chrome.runtime.sendMessage({
      action: 'clearAuthToken',
    });
    return;
  }

  // Ignore unknown message types silently
});

// Add visual indicator when on a company website
function addExtensionIndicator() {
  // Check if indicator already exists
  if (document.getElementById('coldmailai-indicator')) {
    return;
  }

  const indicator = document.createElement('div');
  indicator.id = 'coldmailai-indicator';
  indicator.innerHTML = `
    <div style="position: fixed; top: 12px; right: 12px; z-index: 10000; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25); user-select: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; overflow: hidden; backdrop-filter: blur(8px); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <img id="coldmailai-favicon" src="chrome://favicon/size/20@1x/https://mail.readytorelease.online/" alt="ColdMailAI" style="width: 20px; height: 20px; margin-right: 8px; border-radius: 4px; flex-shrink: 0;" /> ColdMailAI Active
    </div>
  `;

  // Add error handling for favicon
  const faviconImg = indicator.querySelector('#coldmailai-favicon');
  if (faviconImg) {
    faviconImg.onerror = function() {
      // Fallback: use a simple emoji/unicode character as favicon
      this.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.textContent = '💌';
      fallback.style.fontSize = '14px';
      fallback.style.marginRight = '8px';
      fallback.style.display = 'inline-flex';
      this.parentNode.insertBefore(fallback, this);
    };
  }

  // Helper function to reset indicator state on error
  const resetIndicatorState = (innerDiv) => {
    if (!innerDiv) return;
    
    // Restore original state: favicon + "ColdMailAI Active"
    innerDiv.innerHTML = `
      <img id="coldmailai-favicon" src="chrome://favicon/size/20@1x/https://mail.readytorelease.online/" alt="ColdMailAI" style="width: 20px; height: 20px; margin-right: 8px; border-radius: 4px; flex-shrink: 0;" /> ColdMailAI Active
    `;
    
    // Re-attach error handler for favicon
    const faviconImg = innerDiv.querySelector('#coldmailai-favicon');
    if (faviconImg) {
      faviconImg.onerror = function() {
        this.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.textContent = '💌';
        fallback.style.fontSize = '14px';
        fallback.style.marginRight = '8px';
        fallback.style.display = 'inline-flex';
        this.parentNode.insertBefore(fallback, this);
      };
    }
    
    // Restore original blue gradient
    innerDiv.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    
    // Restore opacity to full
    innerDiv.style.opacity = '1';
  };

  indicator.addEventListener('click', () => {
    // Change indicator to show analyzing state
    const innerDiv = indicator.querySelector('div');
    if (innerDiv) {
      innerDiv.textContent = '⏳ Opening ColdMailAI...';
      innerDiv.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      innerDiv.style.opacity = '0.8';
    }
    
    // First, analyze the current page
    const currentUrl = window.location.href;
    
    try {
      const urlObj = new URL(currentUrl);
      const companyName = extractCompanyName(urlObj.hostname);
      
      console.log('Storing analysis:', { url: currentUrl, companyName, timestamp: Date.now() });
      
      // Store the analysis result in storage so popup can access it
      chrome.storage.local.set({
        lastAnalysis: {
          url: currentUrl,
          companyName: companyName,
          timestamp: Date.now()
        }
      }, () => {
        // Check for storage errors
        if (chrome.runtime.lastError) {
          console.error('Failed to store analysis:', chrome.runtime.lastError.message);
          // Reset indicator state on storage error
          resetIndicatorState(innerDiv);
          // Still open popup but without analysis data
          chrome.runtime.sendMessage({ 
            action: 'openPopup',
            storageError: true 
          });
        } else {
          // Storage successful, open popup with analysis data available
          console.log('Analysis stored successfully, opening popup');
          chrome.runtime.sendMessage({ action: 'openPopup' });
        }
      });
    } catch (error) {
      console.error('Error analyzing page:', error);
      // Reset indicator state on analysis error
      resetIndicatorState(innerDiv);
      chrome.runtime.sendMessage({ 
        action: 'openPopup',
        analysisError: true 
      });
    }
  });

  // Add hover effect (using pointer-events to prevent disappearing)
  const innerDiv = indicator.querySelector('div');
  if (innerDiv) {
    innerDiv.addEventListener('mouseenter', function() {
      this.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
      this.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.35)';
      this.style.transform = 'translateY(-2px)';
    });

    innerDiv.addEventListener('mouseleave', function() {
      this.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      this.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)';
      this.style.transform = 'translateY(0)';
    });
  }

  // Safely append indicator when document.body is available
  if (document.body) {
    document.body.appendChild(indicator);
  } else {
    // If body is not yet available, wait for DOMContentLoaded
    const handleDOMReady = () => {
      if (document.body && !document.getElementById('coldmailai-indicator')) {
        document.body.appendChild(indicator);
      }
      // Remove listener after execution
      document.removeEventListener('DOMContentLoaded', handleDOMReady);
    };
    document.addEventListener('DOMContentLoaded', handleDOMReady);
  }
}

// Add indicator on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}
