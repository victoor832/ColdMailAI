// Service Worker for ColdMailAI Extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ColdMailAI extension installed');
  
  // Set default storage values
  chrome.storage.local.set({
    settings: {
      notifications: true,
      autoAnalyze: false,
    },
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    chrome.storage.local.get('authToken', (result) => {
      sendResponse({ token: result.authToken || null });
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ authToken: request.token }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove('authToken', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Context menu for quick analysis
chrome.contextMenus.create({
  id: 'analyzeWithColdMailAI',
  title: 'Analyze with ColdMailAI',
  contexts: ['page'],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyzeWithColdMailAI') {
    // Send message to popup or open analysis
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzeCurrentPage',
    });
  }
});
