// Configuration
const API_BASE_URL = 'https://mail.readytorelease.online';
const EXTENSION_ID = chrome.runtime.id;

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const loginBtn = document.getElementById('loginBtn');
const currentUrlElement = document.getElementById('currentUrl');
const serviceInput = document.getElementById('serviceInput');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const errorText = document.getElementById('errorText');
const successText = document.getElementById('successText');
const mainDiv = document.getElementById('main');
const loadingDiv = document.getElementById('loading');

// Show error message
function showError(message) {
  if (errorDiv) {
    if (errorText) errorText.textContent = message;
    errorDiv.style.display = 'flex';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
}

// Show success message
function showSuccess(message) {
  if (successDiv) {
    if (successText) successText.textContent = message;
    successDiv.style.display = 'flex';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }
}

// Show loading state
function setLoading(isLoading) {
  if (isLoading) {
    if (mainDiv) mainDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';
  } else {
    if (mainDiv) mainDiv.style.display = 'block';
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

// Get current tab URL - IMPROVED
async function getCurrentTabUrl() {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome error:', chrome.runtime.lastError);
          resolve('');
          return;
        }
        
        if (!tabs || tabs.length === 0) {
          console.error('No tabs found');
          resolve('');
          return;
        }
        
        const tab = tabs[0];
        const url = tab.url || '';
        
        // Don't analyze chrome:// or extension:// URLs
        if (url.startsWith('chrome://') || url.startsWith('extension://') || url.startsWith('about:')) {
          console.warn('Cannot analyze browser pages');
          resolve('');
          return;
        }
        
        resolve(url);
      });
    } catch (error) {
      console.error('Error getting tab URL:', error);
      resolve('');
    }
  });
}

// Check if user is logged in by verifying session
async function checkUserSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      console.log('Not logged in:', response.status);
      return false;
    }

    const session = await response.json();
    return !!session?.user;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

// Initialize popup
async function init() {
  // Restore last service from localStorage if available
  const lastService = localStorage.getItem('lastService');
  if (lastService && serviceInput) {
    serviceInput.value = lastService;
  }
  
  // Check if there's a stored analysis from the indicator click
  let currentUrl = null;
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get('lastAnalysis', (result) => {
        resolve(result.lastAnalysis);
      });
    });
    
    // Verify stored data has a numeric timestamp and is recent (< 5 seconds old)
    if (stored && typeof stored.timestamp === 'number' && (Date.now() - stored.timestamp) < 5000) {
      // Use stored analysis if it's less than 5 seconds old
      currentUrl = stored.url;
      if (currentUrlElement) {
        try {
          const hostname = new URL(stored.url).hostname || stored.url;
          currentUrlElement.textContent = stored.companyName || hostname;
        } catch (parseError) {
          // Fallback if URL is malformed
          currentUrlElement.textContent = stored.companyName || stored.url || '-';
        }
      }
      
      // Clear the stored analysis
      chrome.storage.local.remove('lastAnalysis');
    }
  } catch (error) {
    console.error('Error checking stored analysis:', error);
  }
  
  // If no stored analysis, get current tab URL
  if (!currentUrl) {
    currentUrl = await getCurrentTabUrl();

    if (!currentUrl) {
      showError('Cannot analyze this page. Try a regular website.');
      if (currentUrlElement) {
        currentUrlElement.textContent = '-';
      }
      // Disable analyze button on unsupported pages
      if (analyzeBtn) analyzeBtn.disabled = true;
      // Don't return - continue to check login status below
    } else {
      // Display current URL only if we have a valid URL
      try {
        const urlObj = new URL(currentUrl);
        const displayUrl = urlObj.hostname || currentUrl;
        if (currentUrlElement) {
          currentUrlElement.textContent = displayUrl;
        }
      } catch (error) {
        if (currentUrlElement) {
          currentUrlElement.textContent = currentUrl.substring(0, 50) + '...';
        }
      }
    }
  }

  // Check if user is logged in
  const isLoggedIn = await checkUserSession();
  
  if (!isLoggedIn) {
    if (analyzeBtn) analyzeBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'block';
  } else {
    if (analyzeBtn) analyzeBtn.style.display = 'block';
    if (loginBtn) loginBtn.style.display = 'none';
  }
}

// Handle analyze button click
if (analyzeBtn) {
  analyzeBtn.addEventListener('click', async () => {
    console.log('Analyze button clicked');
    
    const currentUrl = await getCurrentTabUrl();

    if (!currentUrl) {
      showError('Could not detect current URL');
      return;
    }

    setLoading(true);

    try {
      // Get service from user input or extract from domain
      let service = serviceInput?.value?.trim() || '';
      
      if (!service) {
        // Fallback: Extract company name from URL if user didn't enter service
        const urlObj = new URL(currentUrl);
        service = urlObj.hostname.replace('www.', '').split('.')[0];
      }

      console.log('Sending analysis request:', { url: currentUrl, service });

      // Send to ColdMailAI - using session cookies
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          service: service,
        }),
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        
        if (response.status === 401) {
          showError('Your session expired. Please log in again.');
          // Show login button
          if (analyzeBtn) analyzeBtn.style.display = 'none';
          if (loginBtn) loginBtn.style.display = 'block';
          setLoading(false);
          return;
        }
        
        throw new Error(errorData.error || errorData.message || `Analysis failed (${response.status})`);
      }

      const data = await response.json();
      console.log('Analysis successful:', data);

      // Save service to localStorage for persistence
      if (serviceInput?.value?.trim()) {
        localStorage.setItem('lastService', serviceInput.value.trim());
      }

      // Show success and store result
      showSuccess('✅ Analysis complete! Opening dashboard...');

      // Store result and open dashboard
      try {
        await chrome.storage.local.set({
          lastAnalysis: {
            url: currentUrl,
            service: service,
            data: data,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (storageError) {
        console.error('Storage failure:', storageError);
        showError(`Failed to save analysis: ${storageError.message}. Check extension storage quota and permissions.`);
        return;
      }

      // Open dashboard in new tab
      setTimeout(() => {
        chrome.tabs.create({
          url: `${API_BASE_URL}/dashboard?from=extension`,
        });
        // Close popup
        window.close();
      }, 1500);
    } catch (error) {
      console.error('Error during analysis:', error);
      showError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  });
}

// Handle login button click
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    console.log('Login button clicked');
    chrome.tabs.create({
      url: `${API_BASE_URL}/auth/signin?redirect=extension`,
    });
    // Close popup after opening login
    setTimeout(() => {
      window.close();
    }, 500);
  });
}

// Initialize on load
console.log('Document ready, calling init()');
init();


