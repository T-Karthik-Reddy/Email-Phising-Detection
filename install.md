# Installation Guide

## Quick Setup

1. **Open Chrome Extensions Page**
   - Open Chrome browser
   - Go to `chrome://extensions/`
   - Or type "extensions" in the address bar

2. **Enable Developer Mode**
   - Look for the "Developer mode" toggle in the top-right corner
   - Click to enable it (toggle should be blue)

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `gmail-downloader-extension` folder
   - Click "Select Folder"

4. **Grant Permissions**
   - Chrome will show a warning about the extension
   - Click "Add extension" to proceed
   - The extension should now appear in your extensions list

5. **Verify Installation**
   - You should see "Gmail Content & Metadata Downloader" in your extensions
   - The extension icon should appear in your Chrome toolbar

## Using the Extension

### First Time Setup
1. Navigate to Gmail (mail.google.com)
2. Log in to your Gmail account
3. You should see a blue "📥 Download" button in the top-right corner
4. Click the extension icon in the toolbar to open the popup

### Downloading Data
- **Email List**: Downloads metadata from all visible emails in your current view
- **Current Email**: Downloads complete content of the opened email (if viewing a specific email)

## Troubleshooting

### Extension not appearing?
- Make sure Developer mode is enabled
- Try refreshing the extensions page
- Check that you selected the correct folder

### Extension not working on Gmail?
- Refresh the Gmail page
- Make sure you're logged into Gmail
- Check the browser console for errors (F12 → Console)

### No download button visible?
- The button should appear automatically on Gmail pages
- Try refreshing the page
- Check that the extension is enabled

## File Structure Check

Make sure your extension folder contains these files:
```
gmail-downloader-extension/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
├── README.md
├── install.md
├── icons/
│   └── icon.svg
└── generate_icons.html
```

## Next Steps

1. **Create Icons** (Optional but recommended):
   - Open `generate_icons.html` in a browser
   - Right-click each icon and save as PNG
   - Save as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

2. **Test the Extension**:
   - Go to Gmail
   - Try downloading email data
   - Check that files are saved correctly

3. **Customize** (Optional):
   - Edit the files to modify functionality
   - Refresh the extension in `chrome://extensions/` to apply changes 