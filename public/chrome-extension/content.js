// Content script - runs in context of web pages

console.log('ColdMailAI content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCurrentPage') {
    const currentUrl = window.location.href;
    
    // Extract company name from domain
    try {
      const urlObj = new URL(currentUrl);
      const companyName = urlObj.hostname.replace('www.', '').split('.')[0];
      
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
});

// Detect when user logs in via the extension
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'COLDMAILAI_AUTH_SUCCESS') {
    // Store auth token
    chrome.runtime.sendMessage({
      action: 'setAuthToken',
      token: event.data.token,
    });
  }
  
  if (event.data.type === 'COLDMAILAI_AUTH_LOGOUT') {
    // Clear auth token
    chrome.runtime.sendMessage({
      action: 'clearAuthToken',
    });
  }
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
    <div style="position: fixed; top: 10px; right: 10px; z-index: 10000; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); user-select: none; transition: all 0.3s ease;">
      🚀 ColdMailAI Active
    </div>
  `;

  indicator.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'analyzeCurrentPage' });
  });

  document.body.appendChild(indicator);
}

// Add indicator on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addExtensionIndicator);
} else {
  addExtensionIndicator();
}
