# Gmail Downloader Extension - Working Directory Setup

This setup allows you to download Gmail data directly to your working directory instead of the browser's Downloads folder.

## Setup Instructions

### 1. Start the Local Server

Run the server that will receive and save the email data:

```bash
./start-server.sh
```

Or manually:
```bash
npm install
npm start
```

The server will start on `http://localhost:3000` and save files to the current working directory.

### 2. Reload the Extension

1. Go to `chrome://extensions/`
2. Find your Gmail Downloader extension
3. Click the refresh/reload button

### 3. Use the Extension

1. Open Gmail and navigate to a specific email
2. Click the extension icon
3. Click "Download Current Email"
4. The file will be saved to your working directory

## File Location

Files will be saved to: `/Users/theepireddykarthikreddy/gmail-downloader-extension/`

File naming: `gmail_data_detail_[timestamp].txt`

## Dynamic Path

If you change your working directory:
1. Stop the server (Ctrl+C)
2. Navigate to your new directory
3. Run `./start-server.sh` again
4. The files will now be saved to the new location

## Troubleshooting

- **Server not running**: Make sure the server is started before using the extension
- **Permission denied**: Run `chmod +x start-server.sh` to make the script executable
- **Port in use**: Change the PORT in `server.js` if 3000 is already in use

## Files Created

- `server.js` - Local server to receive and save email data
- `package.json` - Node.js dependencies
- `start-server.sh` - Script to start the server
- `WORKING_DIRECTORY_SETUP.md` - This setup guide 