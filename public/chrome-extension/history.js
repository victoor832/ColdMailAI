// History Management
const MAX_HISTORY_ITEMS = 50;
const HISTORY_KEY = 'coldmailai_analysis_history';

// Load and display history
function loadHistory() {
  const container = document.getElementById('historyContainer');
  const history = getHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No analyses yet</h3>
        <p>Your analyzed profiles will appear here. Start by analyzing a profile on LinkedIn!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history
    .map(
      (item) => `
    <div class="history-item">
      <div class="item-header">
        <div class="company-info">
          <div class="company-name">${escapeHtml(item.company || 'Unknown Company')}</div>
          <div class="company-url">${escapeHtml(item.url)}</div>
        </div>
        <div class="item-date">${formatDate(item.timestamp)}</div>
      </div>

      <div class="angles-container">
        ${item.angles
          .map(
            (angle) => `
          <div class="angle-card">
            <strong>${escapeHtml(angle.title || 'Angle')}</strong>
            ${escapeHtml(angle.description || angle)}
          </div>
        `
          )
          .join('')}
      </div>

      <div class="item-actions">
        <button class="action-btn view-btn" onclick="viewAnalysis('${item.id}')">
          📧 View Full Analysis
        </button>
        <button class="action-btn delete-btn" onclick="deleteItem('${item.id}')">
          🗑️ Delete
        </button>
      </div>
    </div>
  `
    )
    .join('');
}

// Get history from storage
function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

// Save to history
function saveToHistory(analysis) {
  try {
    const history = getHistory();
    const item = {
      id: Date.now().toString(),
      company: analysis.company,
      url: analysis.url,
      angles: analysis.angles,
      emails: analysis.emails,
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

// Delete item from history
function deleteItem(id) {
  if (!confirm('Delete this analysis from history?')) {
    return;
  }

  try {
    const history = getHistory();
    const filtered = history.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    loadHistory();
  } catch (error) {
    console.error('Error deleting item:', error);
  }
}

// Clear all history
function clearAllHistory() {
  if (!confirm('Clear all history? This cannot be undone.')) {
    return;
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
    loadHistory();
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

// View full analysis
function viewAnalysis(id) {
  const history = getHistory();
  const item = history.find((i) => i.id === id);

  if (!item) {
    alert('Analysis not found');
    return;
  }

  // Open popup with this analysis pre-loaded
  const data = {
    analysisToShow: {
      url: item.url,
      company: item.company,
      angles: item.angles,
      emails: item.emails,
    },
  };

  localStorage.setItem('_tempAnalysisData', JSON.stringify(data));
  window.location.href = 'popup.html';
}

// Utility: Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Utility: Escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Event listeners
document.getElementById('backBtn')?.addEventListener('click', () => {
  window.location.href = 'popup.html';
});

document.getElementById('clearAllBtn')?.addEventListener('click', () => {
  clearAllHistory();
});

// Load on page load
document.addEventListener('DOMContentLoaded', loadHistory);
