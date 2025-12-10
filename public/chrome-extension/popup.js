// Configuration - Detect environment
let API_BASE_URL = 'https://mail.readytorelease.online'; // Default to production
const HISTORY_KEY = 'coldmailai_analysis_history';
const MAX_HISTORY_ITEMS = 20;

// Initialize API URL from storage
async function initializeApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiBaseUrl'], (result) => {
      if (result.apiBaseUrl) {
        API_BASE_URL = result.apiBaseUrl;
        console.log('📍 Using API URL from storage:', API_BASE_URL);
      } else {
        console.log('📍 Using default API URL:', API_BASE_URL);
      }
      resolve();
    });
  });
}

const EXTENSION_ID = chrome.runtime.id;

// DOM Elements
const analyzeBtn = document.getElementById('analyzeBtn');
const loginBtn = document.getElementById('loginBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const currentUrlElement = document.getElementById('currentUrl');
const serviceInput = document.getElementById('serviceInput');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const errorText = document.getElementById('errorText');
const successText = document.getElementById('successText');
const mainDiv = document.getElementById('main');
const loadingDiv = document.getElementById('loading');

// Tab management
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Settings elements
const apiUrlInput = document.getElementById('apiUrlInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');

// Show error message
function showError(message) {
  console.error('ERROR:', message);
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
  console.log('SUCCESS:', message);
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
  console.log('Loading state:', isLoading);
  if (isLoading) {
    if (mainDiv) mainDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';
  } else {
    if (mainDiv) mainDiv.style.display = 'block';
    if (loadingDiv) loadingDiv.style.display = 'none';
  }
}

// Request optional permissions for content script injection
async function requestWebPermissions() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'requestWebPermissions' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error requesting permissions:', chrome.runtime.lastError);
        resolve(false);
      } else {
        resolve(response?.granted || false);
      }
    });
  });
}

// Get current tab URL - using content script as primary method
async function getCurrentTabUrl() {
  return new Promise((resolve) => {
    try {
      // Step 1: Get the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome error in tabs.query:', chrome.runtime.lastError);
          resolve('');
          return;
        }
        
        if (!tabs || tabs.length === 0) {
          console.error('No tabs found');
          resolve('');
          return;
        }
        
        const tab = tabs[0];
        console.log('Tab object:', { id: tab.id, url: tab.url, title: tab.title, status: tab.status });
        
        // Step 2: Try tab.url first (most reliable)
        if (tab.url && tab.url.startsWith('http')) {
          console.log('Using tab.url:', tab.url);
          resolve(tab.url);
          return;
        }
        
        // Step 3: If tab.url is not available, try content script
        if (tab.id) {
          console.log('tab.url empty or unavailable, requesting from content script...');
          chrome.tabs.sendMessage(tab.id, { action: 'getPageUrl' }, { frameId: 0 }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Content script error:', chrome.runtime.lastError.message);
              resolve('');
            } else if (response && response.url) {
              console.log('Got URL from content script:', response.url);
              resolve(response.url);
            } else {
              console.error('No valid response from content script');
              resolve('');
            }
          });
        } else {
          console.error('No tab ID available');
          resolve('');
        }
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
    console.log('Checking session with API URL:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      credentials: 'include', // Include cookies for session
    });

    console.log('Session check response status:', response.status);

    if (!response.ok) {
      console.log('Not logged in - status:', response.status);
      return false;
    }

    const session = await response.json();
    console.log('Session data received:', session);
    const hasUser = !!session?.user;
    console.log('Has user:', hasUser);
    return hasUser;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

// Initialize popup
async function init() {
  console.log('=== Popup Init Started ===');
  
  // Initialize API URL first (CRITICAL for all network requests)
  await initializeApiUrl();
  console.log('✅ API URL initialized:', API_BASE_URL);
  
  // Restore last service from localStorage if available
  const lastService = localStorage.getItem('lastService');
  if (lastService && serviceInput) {
    serviceInput.value = lastService;
    console.log('Restored service from localStorage:', lastService);
  }
  
  // Check if there's a stored analysis from the indicator click
  let currentUrl = null;
  
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get('lastAnalysis', (result) => {
        console.log('Chrome storage result:', result);
        resolve(result.lastAnalysis);
      });
    });
    
    console.log('Stored analysis from chrome.storage:', stored);
    
    // Check if stored analysis is valid and recent
    if (stored && stored.url) {
      const timeAgo = stored.timestamp ? (Date.now() - stored.timestamp) : null;
      console.log('Analysis age:', timeAgo, 'ms');
      
      if (timeAgo !== null && timeAgo < 5000) {
        // Use stored analysis if it's less than 5 seconds old
        currentUrl = stored.url;
        
        console.log('Using pre-analyzed data from stored:', stored);
        
        if (currentUrlElement) {
          try {
            const urlObj = new URL(stored.url);
            const displayUrl = urlObj.hostname || stored.url;
            currentUrlElement.textContent = `✓ ${displayUrl}`;
            currentUrlElement.style.color = '#059669'; // Green
            currentUrlElement.style.fontWeight = '600';
          } catch (parseError) {
            console.error('URL parse error:', parseError);
            currentUrlElement.textContent = stored.url || stored.company || stored.companyName || '-';
          }
        }
        
        console.log('Showing pre-analyzed state with company:', stored.company || stored.companyName);
      } else {
        console.log('Stored analysis is too old, ignoring');
      }
    } else {
      console.log('No stored analysis found');
    }
  } catch (error) {
    console.error('Error checking stored analysis:', error);
  }
  
  // If no stored analysis, request permissions and then get current tab URL
  if (!currentUrl) {
    console.log('No stored analysis, requesting web permissions');
    // Request web permissions BEFORE attempting to get tab URL (content script fallback needs it)
    const permissionsGranted = await requestWebPermissions();
    if (!permissionsGranted) {
      console.warn('Web permissions not granted - content script fallback will not be available');
    }
    
    console.log('Getting current tab URL');
    currentUrl = await getCurrentTabUrl();

    if (!currentUrl) {
      console.warn('Cannot detect current URL - unsupported page');
      showError('Cannot analyze this page. Try a regular website.');
      if (currentUrlElement) {
        currentUrlElement.textContent = '-';
      }
      // Disable analyze button on unsupported pages
      if (analyzeBtn) analyzeBtn.disabled = true;
    } else {
      // Display current URL
      try {
        const urlObj = new URL(currentUrl);
        const displayUrl = urlObj.hostname || currentUrl;
        if (currentUrlElement) {
          currentUrlElement.textContent = displayUrl;
          currentUrlElement.style.color = '#1e293b'; // Default color
        }
        console.log('Showing current tab URL:', displayUrl);
      } catch (error) {
        console.error('URL parse error:', error);
        if (currentUrlElement) {
          currentUrlElement.textContent = currentUrl.substring(0, 50) + '...';
        }
      }
    }
  }

  // Check if user is logged in
  console.log('Checking user session...');
  const isLoggedIn = await checkUserSession();
  console.log('User logged in:', isLoggedIn);
  
  if (!isLoggedIn) {
    if (analyzeBtn) analyzeBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'block';
    console.log('Showing login button');
  } else {
    if (analyzeBtn) analyzeBtn.style.display = 'block';
    if (loginBtn) loginBtn.style.display = 'none';
    console.log('Showing analyze button');
  }
  
  console.log('=== Popup Init Complete ===');
}

// Handle analyze button click
if (analyzeBtn) {
  analyzeBtn.addEventListener('click', async () => {
    console.log('Analyze button clicked');
    
    // Request optional permissions BEFORE attempting to get tab URL
    console.log('Requesting web permissions...');
    const permissionsGranted = await requestWebPermissions();
    if (!permissionsGranted) {
      console.warn('Web permissions not granted - content script fallback will not be available');
    }
    
    // Try to get current URL with aggressive retry logic
    let currentUrl = await getCurrentTabUrl();
    let attempts = 1;
    
    // Retry up to 3 times with increasing delays
    while (!currentUrl && attempts < 3) {
      const delay = 150 * attempts; // 150ms, 300ms, 450ms
      console.warn(`URL fetch attempt ${attempts} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      currentUrl = await getCurrentTabUrl();
      attempts++;
    }

    if (!currentUrl) {
      showError('Could not detect current URL');
      console.error('Failed to get URL after', attempts, 'attempts');
      return;
    }
    
    console.log('Successfully got URL:', currentUrl);

    setLoading(true);
    if (currentUrlElement) {
      currentUrlElement.textContent = '⏳ Analyzing...';
    }

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
        console.error('API error response:', errorData);
        
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

      const response_data = await response.json();
      console.log('Analysis API response:', response_data);
      
      // Extract the actual analysis data - API returns { success: true, data: { company, angles } }
      const analysisData = response_data.data || response_data;
      console.log('Extracted analysis data:', analysisData);

      // Validate that we have angles
      if (!analysisData.angles || !Array.isArray(analysisData.angles) || analysisData.angles.length === 0) {
        console.error('Invalid response structure - no angles found:', analysisData);
        throw new Error('Analysis returned no angles. Please try again.');
      }

      // Save service to localStorage for persistence
      if (serviceInput?.value?.trim()) {
        localStorage.setItem('lastService', serviceInput.value.trim());
      }

      // Update URL display with success
      if (currentUrlElement) {
        try {
          const urlObj = new URL(currentUrl);
          const displayUrl = urlObj.hostname || currentUrl;
          currentUrlElement.textContent = `✓ ${displayUrl}`;
          currentUrlElement.style.color = '#059669'; // Green
        } catch (e) {
          currentUrlElement.textContent = '✓ Analyzed';
        }
      }

      // Show success message
      showSuccess('✅ Analysis complete!');

      // Store result
      try {
        await chrome.storage.local.set({
          lastAnalysis: {
            url: currentUrl,
            service: service,
            company: analysisData.company || 'Unknown Company',
            angles: analysisData.angles,
            timestamp: Date.now(),
          },
        });
      } catch (storageError) {
        console.error('Storage failure:', storageError);
        showError(`Failed to save analysis: ${storageError.message}. Check extension storage quota and permissions.`);
        setLoading(false);
        return;
      }

      // Display results in the popup
      displayResults({
        url: currentUrl,
        company: analysisData.company || 'Unknown Company',
        angles: analysisData.angles || [],
      });

      // Switch to results tab
      switchTab('results');
    } catch (error) {
      console.error('Error during analysis:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Full error:', errorMessage);
      showError(`Analysis failed: ${errorMessage}`);
      if (currentUrlElement) {
        currentUrlElement.textContent = '✗ Analysis failed';
        currentUrlElement.style.color = '#dc2626'; // Red
      }
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

// Handle dashboard button click
if (dashboardBtn) {
  dashboardBtn.addEventListener('click', () => {
    console.log('Dashboard button clicked, opening:', `${API_BASE_URL}/dashboard`);
    chrome.tabs.create({
      url: `${API_BASE_URL}/dashboard`,
    });
  });
}

// ========== TAB MANAGEMENT ==========
function switchTab(tabName) {
  // Hide all tabs
  tabContents.forEach(tab => tab.classList.remove('active'));
  
  // Deactivate all buttons
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  const selectedTab = document.getElementById(`${tabName}-tab`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Activate button
  const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Load history when switching to history tab
  if (tabName === 'history') {
    loadHistoryTab();
  }

  // Load settings when switching to settings tab
  if (tabName === 'settings') {
    loadSettingsTab();
  }
}

// Tab button listeners
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');
    switchTab(tabName);
  });
});

// ========== HISTORY MANAGEMENT ==========
function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

function saveToHistory(analysis) {
  try {
    const history = getHistory();
    const item = {
      id: Date.now().toString(),
      company: analysis.company || 'Unknown',
      url: analysis.url,
      angles: analysis.angles || [],
      emails: analysis.emails || [],
      timestamp: new Date().toISOString(),
    };

    history.unshift(item); // Add to beginning

    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return item;
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

function loadHistoryTab() {
  const history = getHistory();
  const historyEmpty = document.getElementById('history-empty');
  const historyContent = document.getElementById('history-content');

  if (history.length === 0) {
    historyEmpty.style.display = 'block';
    historyContent.style.display = 'none';
    return;
  }

  historyEmpty.style.display = 'none';
  historyContent.style.display = 'grid';
  historyContent.innerHTML = history
    .map(item => `
      <div class="history-item-mini">
        <div class="history-item-company">${escapeHtml(item.company)}</div>
        <div class="history-item-time">${formatDate(item.timestamp)}</div>
        <div style="margin-top: 6px;">
          <a class="history-link" data-history-id="${escapeHtml(item.id)}">View analysis →</a>
        </div>
      </div>
    `).join('');
  
  // Add event delegation for history links
  historyContent.querySelectorAll('.history-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('data-history-id');
      console.log('History link clicked, loading item:', id);
      loadHistoryItem(id);
    });
  });
}

function loadHistoryItem(id) {
  const history = getHistory();
  const item = history.find(i => i.id === id);

  if (!item) {
    alert('Analysis not found');
    return;
  }

  displayResults(item);
  switchTab('results');
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// ========== SETTINGS MANAGEMENT ==========
function loadSettingsTab() {
  chrome.storage.local.get(['apiBaseUrl'], (result) => {
    if (result.apiBaseUrl) {
      apiUrlInput.value = result.apiBaseUrl;
    } else {
      apiUrlInput.value = 'https://mail.readytorelease.online';
    }
  });
}

if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    const url = apiUrlInput.value.trim();

    try {
      new URL(url);
    } catch (e) {
      showError('Invalid URL format');
      return;
    }

    chrome.storage.local.set({ apiBaseUrl: url }, () => {
      API_BASE_URL = url;
      showSuccess('✅ Settings saved!');
    });
  });
}

if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['apiBaseUrl'], () => {
      API_BASE_URL = 'https://mail.readytorelease.online';
      apiUrlInput.value = API_BASE_URL;
      showSuccess('🔄 Reset to default');
    });
  });
}

// ========== DISPLAY RESULTS ==========
function displayResults(analysis) {
  const anglesContainer = document.getElementById('anglesContainer');
  const resultsPlaceholder = document.getElementById('results-placeholder');
  const resultsContent = document.getElementById('results-content');

  if (!analysis.angles || analysis.angles.length === 0) {
    showError('No angles found in analysis');
    return;
  }

  resultsPlaceholder.style.display = 'none';
  resultsContent.style.display = 'block';

  anglesContainer.innerHTML = analysis.angles
    .map((angle, idx) => {
      // Map Gemini response structure to display format
      const title = angle.hook || angle.title || `Angle ${idx + 1}`;
      const description = angle.reasoning || angle.connection || angle.description || '';
      const evidence = angle.evidence ? `<div class="angle-evidence"><strong>Evidence:</strong> ${escapeHtml(angle.evidence)}</div>` : '';
      
      return `
        <div class="angle-preview-card">
          <div class="angle-title">Angle ${idx + 1}: ${escapeHtml(title)}</div>
          <div class="angle-description">${escapeHtml(description)}</div>
          ${evidence}
        </div>
      `;
    }).join('');

  // Save to history
  saveToHistory(analysis);
}

// Initialize on load
console.log('Document ready, calling init()');
init();


