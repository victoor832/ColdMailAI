// Configuration
const API_BASE_URL = 'https://coldmailai.com'; // Cambiar en prod
const EXTENSION_ID = chrome.runtime.id;

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const loginBtn = document.getElementById('loginBtn');
const currentUrlElement = document.getElementById('currentUrl');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const mainDiv = document.getElementById('main');
const loadingDiv = document.getElementById('loading');

// Show error message
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Show success message
function showSuccess(message) {
  successDiv.textContent = message;
  successDiv.style.display = 'block';
  setTimeout(() => {
    successDiv.style.display = 'none';
  }, 3000);
}

// Show loading state
function setLoading(isLoading) {
  if (isLoading) {
    mainDiv.style.display = 'none';
    loadingDiv.style.display = 'block';
  } else {
    mainDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
  }
}

// Get current tab URL
function getCurrentTabUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      resolve(url);
    });
  });
}

// Initialize popup
async function init() {
  const currentUrl = await getCurrentTabUrl();

  if (!currentUrl) {
    showError('Could not detect current URL');
    return;
  }

  // Display current URL
  try {
    const urlObj = new URL(currentUrl);
    currentUrlElement.textContent = urlObj.hostname || currentUrl;
  } catch {
    currentUrlElement.textContent = currentUrl;
  }

  // Check if user is logged in
  const token = await chrome.storage.local.get('authToken');
  if (!token.authToken) {
    analyzeBtn.style.display = 'none';
    loginBtn.style.display = 'flex';
  }
}

// Handle analyze button click
analyzeBtn.addEventListener('click', async () => {
  const currentUrl = await getCurrentTabUrl();

  if (!currentUrl) {
    showError('Could not detect current URL');
    return;
  }

  setLoading(true);

  try {
    // Extract company name from URL
    const urlObj = new URL(currentUrl);
    const companyName = urlObj.hostname.replace('www.', '').split('.')[0];

    // Send to ColdMailAI
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await chrome.storage.local.get('authToken')).authToken}`,
      },
      body: JSON.stringify({
        url: currentUrl,
        service: companyName,
      }),
    });

    if (!response.ok) {
      throw new Error('Analysis failed. Please try again.');
    }

    const data = await response.json();

    // Show success and store result
    showSuccess('✅ Analysis complete! Opening dashboard...');

    // Store result and open dashboard
    await chrome.storage.local.set({
      lastAnalysis: {
        url: currentUrl,
        service: companyName,
        data: data,
        timestamp: new Date().toISOString(),
      },
    });

    // Open dashboard in new tab
    setTimeout(() => {
      chrome.tabs.create({
        url: `${API_BASE_URL}/dashboard?from=extension`,
      });
    }, 1500);
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
});

// Handle login button click
loginBtn.addEventListener('click', () => {
  chrome.tabs.create({
    url: `${API_BASE_URL}/auth/signin?redirect=extension`,
  });
});

// Initialize on load
init();
