// Extension Settings Page
// Allows changing the API base URL for development purposes

document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const statusDiv = document.getElementById('status');

  // Load current URL
  chrome.storage.local.get(['apiBaseUrl'], (result) => {
    if (result.apiBaseUrl) {
      apiUrlInput.value = result.apiBaseUrl;
    } else {
      apiUrlInput.value = 'https://mail.readytorelease.online';
    }
  });

  // Save URL
  saveBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim();
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      showStatus('❌ Invalid URL format', 'error');
      return;
    }

    chrome.storage.local.set({ apiBaseUrl: url }, () => {
      showStatus('✅ API URL saved: ' + url, 'success');
    });
  });

  // Reset to default
  resetBtn.addEventListener('click', () => {
    const defaultUrl = 'https://mail.readytorelease.online';
    chrome.storage.local.remove(['apiBaseUrl'], () => {
      apiUrlInput.value = defaultUrl;
      showStatus('🔄 Reset to default: ' + defaultUrl, 'success');
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }
});
