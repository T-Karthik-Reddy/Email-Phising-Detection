# Gmail Content & Metadata Downloader

A Chrome extension that allows you to download Gmail contents and metadata in text format.

## Features

- **Email List Download**: Download metadata and preview content from all visible emails in your current Gmail view
- **Detailed Email Download**: Download complete content of the currently opened email
- **Text Format**: All data is exported in a clean, readable text format
- **Easy to Use**: Simple popup interface with clear options

## Installation

1. **Download the Extension Files**
   - All necessary files are included in this directory

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `gmail-downloader-extension` folder

3. **Grant Permissions**
   - The extension will request permissions for Gmail access
   - Click "Allow" when prompted

## Usage

### Method 1: Using the Extension Popup
1. Navigate to Gmail in your browser
2. Click the extension icon in the Chrome toolbar
3. Choose your download option:
   - **Download Email List**: Downloads metadata from all visible emails
   - **Download Current Email**: Downloads complete content of the opened email

### Method 2: Using the Injected Button
1. Navigate to Gmail in your browser
2. Look for the blue "📥 Download" button in the top-right corner
3. Click it to download the email list data

## What Data is Extracted

### Email List (when viewing inbox/folders):
- Email ID
- Subject line
- Sender information
- Date and time
- Labels
- Content preview
- Attachment information

### Detailed Email (when viewing a specific email):
- Complete subject line
- Sender and recipient information
- Date and time
- Full email body content
- Attachment details

## File Format

The downloaded files are saved as `.txt` files with the following naming convention:
- `gmail_data_list_YYYY-MM-DD-HH-MM-SS.txt` for email lists
- `gmail_data_detail_YYYY-MM-DD-HH-MM-SS.txt` for detailed emails

## Privacy & Security

- This extension only extracts data from Gmail pages you're currently viewing
- No data is sent to external servers
- All processing happens locally in your browser
- The extension only has access to Gmail pages

## Troubleshooting

### Extension not working?
1. Make sure you're on a Gmail page (mail.google.com or gmail.com)
2. Refresh the Gmail page
3. Check that the extension is enabled in `chrome://extensions/`

### No data extracted?
1. Ensure you're logged into Gmail
2. Try refreshing the page
3. Check the browser console for any error messages

### Download not starting?
1. Check your browser's download settings
2. Ensure you have permission to download files
3. Try clicking the extension icon instead of the injected button

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: 
  - `activeTab`: Access to current Gmail tab
  - `storage`: Save extension settings
  - `downloads`: Download extracted data
  - `scripting`: Execute content scripts
- **Host Permissions**: Gmail domains only

## Development

To modify the extension:
1. Edit the files in this directory
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test your changes

## Files Structure

```
gmail-downloader-extension/
├── manifest.json          # Extension configuration
├── content.js            # Script that runs on Gmail pages
├── background.js         # Background service worker
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── icons/               # Extension icons (create your own)
└── README.md           # This file
```

## Note

You'll need to create your own icon files (16x16, 48x48, and 128x128 pixels) and place them in the `icons/` directory. The extension will work without icons, but they improve the user experience.

## License

This extension is provided as-is for educational and personal use. 