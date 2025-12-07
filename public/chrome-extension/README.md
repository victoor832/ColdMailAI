# ColdMailAI Chrome Extension

## Overview
The ColdMailAI Chrome Extension allows users to instantly research any company and generate personalized cold emails directly from their browser.

## Features
- 🔍 **One-Click Analysis**: Analyze any website without leaving your browser
- 📧 **Email Generation**: Generate 3 personalized research angles + email templates
- 💾 **Sync with Dashboard**: Results automatically sync to your ColdMailAI dashboard
- 🎯 **Context Menu**: Right-click any page to analyze with ColdMailAI
- 🔐 **Secure Authentication**: OAuth2 integration with your ColdMailAI account

## Installation (Development)

### 1. Build the extension
```bash
pnpm build
```

### 2. Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `/public/chrome-extension` folder
5. Done! The extension is now active

### 3. Testing
- Visit any company website (e.g., salesforce.com)
- Click the ColdMailAI icon in your toolbar
- Click "Analyze Company"
- Results appear on your dashboard

## Manifest Version
Uses Manifest V3 (Google Chrome's latest extension standard)

## Permissions
- `activeTab`: Read current tab URL
- `scripting`: Inject scripts into pages
- `storage`: Save auth tokens and user preferences
- `host_permissions`: Access any website

## Files Structure
```
chrome-extension/
├── manifest.json     # Extension configuration
├── popup.html        # Popup UI
├── popup.js          # Popup logic
├── background.js     # Service worker
├── content.js        # Content script
└── README.md         # This file
```

## API Integration
The extension communicates with the main ColdMailAI API:
- Analyzes websites via `/api/analyze`
- Stores results in your ColdMailAI account
- Syncs with dashboard automatically

## Future Enhancements
- [ ] Bulk analysis for multiple sites
- [ ] Email sending directly from extension
- [ ] Template customization
- [ ] Analytics dashboard
- [ ] Advanced filtering and search
- [ ] Integration with email clients (Gmail, Outlook)
- [ ] Chrome Web Store publication

## Support
For issues or suggestions, visit: https://coldmailai.com/support
