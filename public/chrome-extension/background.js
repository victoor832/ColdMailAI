// Service Worker for ColdMailAI Extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ColdMailAI extension installed');
  
  // Set default storage values
  const defaultSettings = {
    settings: {
      notifications: true,
      autoAnalyze: false,
    },
  };

  chrome.storage.local.set(defaultSettings, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.error(
        'Failed to initialize extension storage:',
        error.message,
        'Attempted to set:',
        defaultSettings
      );
    } else {
      console.log('Extension storage initialized successfully');
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get('authToken', (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('Failed to retrieve auth token:', error.message);
        sendResponse({ token: null, error: error.message });
      } else {
        sendResponse({ token: result.authToken || null, error: null });
      }
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'setAuthToken') {
    // Validate token is a non-empty string
    if (!request.token || typeof request.token !== 'string' || !request.token.trim()) {
      sendResponse({ success: false, error: 'Invalid token: must be a non-empty string' });
      return true;
    }

    chrome.storage.local.set({ authToken: request.token }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('Failed to set auth token:', error.message);
        sendResponse({ success: false, error: error.message });
      } else {
        console.log('Auth token set successfully');
        sendResponse({ success: true, error: null });
      }
    });
    return true;
  }

  if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove('authToken', () => {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error('Failed to clear auth token:', error.message);
        sendResponse({ success: false, error: error.message });
      } else {
        console.log('Auth token cleared successfully');
        sendResponse({ success: true, error: null });
      }
    });
    return true;
  }

  if (request.action === 'openPopup') {
    // Open the extension popup programmatically
    // Note: openPopup requires a user gesture (click, keyboard shortcut, etc.)
    try {
      chrome.action.openPopup(() => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.error('Failed to open popup:', error.message);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to open popup' 
          });
        } else {
          console.log('Popup opened successfully');
          sendResponse({ success: true, error: null });
        }
      });
    } catch (error) {
      console.error('Unexpected error opening popup:', error.message);
      sendResponse({ 
        success: false, 
        error: error.message || 'Unexpected error' 
      });
    }
    return true; // Indicate asynchronous response
  }
});
