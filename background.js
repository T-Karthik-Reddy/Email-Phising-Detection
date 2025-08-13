// Background script for Gmail Downloader extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    if (request.action === 'downloadData') {
        // Get the current active tab since sender.tab might be undefined for popup messages
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs && tabs.length > 0) {
                console.log('Handling download request for tab:', tabs[0]);
                handleDownloadRequest(request, tabs[0], sendResponse);
            } else {
                console.error('No active tab found');
                sendResponse({ success: false, error: 'No active tab found' });
            }
        });
    } else if (request.action === 'contentScriptReady') {
        console.log('Content script is ready in tab:', sender.tab?.id);
        sendResponse({ success: true });
    } else {
        console.log('Unknown action:', request.action);
    }
    return true; // Keep the message channel open for async response
});

// Handle download requests from content script or popup
async function handleDownloadRequest(request, tab, sendResponse) {
    try {
        // Validate tab
        if (!tab || !tab.id) {
            console.error('Invalid tab object:', tab);
            sendResponse({ success: false, error: 'Invalid tab information' });
            return;
        }

        // Check if we're on a Gmail page
        if (!tab.url || (!tab.url.includes('mail.google.com') && !tab.url.includes('gmail.com'))) {
            console.error('Not on a Gmail page:', tab.url);
            sendResponse({ success: false, error: 'Please navigate to Gmail to use this extension' });
            return;
        }

        console.log('Sending message to content script in tab:', tab.id);
        
        // First, try to inject the content script if it's not already running
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            console.log('Content script injected successfully');
        } catch (injectionError) {
            console.log('Content script may already be running or injection failed:', injectionError);
        }
        
        // Send message to content script to extract data with timeout
        let response;
        try {
            response = await Promise.race([
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extractData',
                    type: request.type || 'list'
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout: Content script not responding')), 5000)
                )
            ]);
            console.log('Received response from content script:', response);
        } catch (messageError) {
            console.error('Failed to send message to content script:', messageError);
            sendResponse({ success: false, error: 'Content script not responding. Please refresh the page and try again.' });
            return;
        }

        if (response && response.success) {
                                    // Send data to local server to save in working directory and run analysis
                        try {
                            const serverResponse = await fetch('http://localhost:3000/save-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    data: response.data,
                                    type: request.type || 'list',
                                    userEmail: request.userEmail || ''
                                })
                            });

                            const result = await serverResponse.json();
                            
                            if (result.success) {
                                console.log('Email data saved to working directory:', result.filepath);
                                
                                // Store phishing analysis results for popup
                                if (result.phishingAnalysis) {
                                    console.log('Storing phishing analysis results:', result.phishingAnalysis);
                                    chrome.storage.local.set({
                                        'lastPhishingAnalysis': result.phishingAnalysis,
                                        'analysisTimestamp': Date.now()
                                    });
                                } else {
                                    console.log('No phishing analysis results found');
                                }
                            } else {
                                throw new Error(result.error || 'Failed to save to server');
                            }
                        } catch (serverError) {
                            console.error('Server error:', serverError);
                            throw new Error('Failed to save to working directory. Make sure the server is running.');
                        }

            // Show success notification
            chrome.action.setBadgeText({ text: '✓' });
            setTimeout(() => {
                chrome.action.setBadgeText({ text: '' });
            }, 2000);

            // Send success response back to popup
            sendResponse({ success: true });
        } else {
            console.error('Failed to extract data:', response.error);
            showError('Failed to extract Gmail data. Please make sure you are on a Gmail page.');
            sendResponse({ success: false, error: response.error });
        }
    } catch (error) {
        console.error('Error handling download request:', error);
        showError('Error downloading Gmail data. Please try again.');
        
        // Send error response if sendResponse is still available
        if (sendResponse) {
            sendResponse({ success: false, error: error.message });
        }
    }
}

// Show error notification
function showError(message) {
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    
    // You could also show a notification here if you add the notifications permission
    console.error(message);
    
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 3000);
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Gmail Downloader extension installed');
    }
});

// Handle tab updates to inject content script when needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && 
        (tab.url && tab.url.includes('mail.google.com') || tab.url && tab.url.includes('gmail.com'))) {
        // Content script should be automatically injected via manifest
        console.log('Gmail page loaded, content script should be active');
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (tab.url && (tab.url.includes('mail.google.com') || tab.url.includes('gmail.com'))) {
        // Open popup or trigger download directly
        chrome.action.setPopup({ popup: 'popup.html' });
    } else {
        // Show message that user needs to be on Gmail
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
        setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
        }, 2000);
    }
}); 