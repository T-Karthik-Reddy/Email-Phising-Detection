// Popup script for Gmail Downloader extension
document.addEventListener('DOMContentLoaded', function() {
    const downloadListBtn = document.getElementById('downloadList');
    const downloadDetailBtn = document.getElementById('downloadDetail');
    const statusDiv = document.getElementById('status');

    // Check if current tab is Gmail
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        const isGmail = currentTab.url && (
            currentTab.url.includes('mail.google.com') || 
            currentTab.url.includes('gmail.com')
        );

        if (!isGmail) {
            showStatus('Please navigate to Gmail to use this extension.', 'error');
            downloadListBtn.disabled = true;
            downloadDetailBtn.disabled = true;
        }
    });

    // Download email list
    downloadListBtn.addEventListener('click', function() {
        downloadData('list');
    });

    // Download detailed email
    downloadDetailBtn.addEventListener('click', function() {
        downloadData('detail');
    });

    // Test analysis display button
    const testAnalysisBtn = document.getElementById('testAnalysis');
    if (testAnalysisBtn) {
        testAnalysisBtn.addEventListener('click', function() {
            console.log('Test button clicked');
            const testAnalysis = {
                score: 45,
                emoji: "⚠️",
                reasons: {
                    "Body": ["Starts with a generic greeting: 'Dear Valued Customer'. (+15 pts)"],
                    "Recipients": ["Your email address is not in To/Cc, indicating you were Bcc'd. (+15 pts)"],
                    "Subject": ["Contains urgency/threat keyword: 'action required'. (+15 pts)"]
                },
                success: true
            };
            displayPhishingResults(testAnalysis);
        });
    }

    // Function to check email for phishing
    function downloadData(type) {
        showStatus('Analyzing email for phishing indicators...', 'info');
        
        // Clear previous results
        const resultsDiv = document.getElementById('phishingResults');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }
        
        // Get user email from storage or prompt
        const userEmail = 'karthikreddytheepi@gmail.com'; // You can make this configurable
        
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            
            chrome.runtime.sendMessage({
                action: 'downloadData',
                type: type,
                userEmail: userEmail
            }, function(response) {
                if (chrome.runtime.lastError) {
                    showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                if (response && response.success) {
                    if (type === 'detail') {
                        showStatus('Phishing analysis completed!', 'success');
                        // Wait a moment then check for results
                        setTimeout(() => {
                            chrome.storage.local.get(['lastPhishingAnalysis', 'analysisTimestamp'], function(result) {
                                if (result.lastPhishingAnalysis) {
                                    console.log('Found phishing analysis after completion:', result.lastPhishingAnalysis);
                                    displayPhishingResults(result.lastPhishingAnalysis);
                                }
                            });
                        }, 1000);
                    } else {
                        showStatus('Email list downloaded successfully!', 'success');
                    }
                } else {
                    showStatus('Failed to analyze email. Please try again.', 'error');
                }
            });
        });
    }

    // Function to show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }

    // Check for stored phishing analysis results when popup loads
    console.log('Popup loaded, checking for stored analysis...');
    chrome.storage.local.get(['lastPhishingAnalysis', 'analysisTimestamp'], function(result) {
        console.log('Storage check result:', result);
        if (result.lastPhishingAnalysis && result.analysisTimestamp) {
            // Only show results from the last 5 minutes
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (result.analysisTimestamp > fiveMinutesAgo) {
                console.log('Found recent phishing analysis:', result.lastPhishingAnalysis);
                displayPhishingResults(result.lastPhishingAnalysis);
            } else {
                console.log('Analysis too old, clearing...');
                chrome.storage.local.remove(['lastPhishingAnalysis', 'analysisTimestamp']);
            }
        } else {
            console.log('No stored analysis found');
        }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'downloadComplete') {
            showStatus('Download completed successfully!', 'success');
        } else if (request.action === 'downloadError') {
            showStatus('Download failed: ' + request.error, 'error');
        }
    });

    // Function to display phishing analysis results
    function displayPhishingResults(analysis) {
        console.log('Displaying phishing results:', analysis);
        const resultsDiv = document.getElementById('phishingResults');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const reasonsDisplay = document.getElementById('reasonsDisplay');
        
        console.log('Found elements:', {
            resultsDiv: !!resultsDiv,
            scoreDisplay: !!scoreDisplay,
            reasonsDisplay: !!reasonsDisplay
        });
        
        if (analysis.error) {
            scoreDisplay.innerHTML = `<div class="score-display score-medium">❌ Analysis Failed: ${analysis.error}</div>`;
            reasonsDisplay.innerHTML = '';
        } else {
            const score = analysis.score;
            const emoji = analysis.emoji;
            const reasons = analysis.reasons;
            
            // Determine score class
            let scoreClass = 'score-low';
            if (score >= 70) scoreClass = 'score-high';
            else if (score >= 40) scoreClass = 'score-medium';
            
            // Display score
            scoreDisplay.innerHTML = `<div class="score-display ${scoreClass}">${emoji} Phishing Score: ${score}/100 ${emoji}</div>`;
            
            // Display reasons
            if (reasons && Object.keys(reasons).length > 0) {
                let reasonsHtml = '<div class="reasons-display">';
                for (const [category, reasonList] of Object.entries(reasons)) {
                    reasonsHtml += `<div class="category">`;
                    reasonsHtml += `<div class="category-title">[${category}]:</div>`;
                    reasonList.forEach(reason => {
                        reasonsHtml += `<div class="reason">• ${reason}</div>`;
                    });
                    reasonsHtml += `</div>`;
                }
                reasonsHtml += '</div>';
                reasonsDisplay.innerHTML = reasonsHtml;
            } else {
                reasonsDisplay.innerHTML = '<div class="reasons-display">✅ No suspicious indicators found.</div>';
            }
        }
        
        // Show the results section
        resultsDiv.style.display = 'block';
    }
}); 