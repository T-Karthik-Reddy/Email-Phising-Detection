// Content script for Gmail data extraction
(function() {
    'use strict';

    // Function to extract email metadata
    function extractEmailMetadata() {
        const metadata = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            emails: []
        };

        // Extract emails from Gmail interface
        const emailElements = document.querySelectorAll('[data-legacy-message-id], [data-message-id]');
        
        emailElements.forEach((emailElement, index) => {
            try {
                const email = {
                    id: emailElement.getAttribute('data-legacy-message-id') || 
                         emailElement.getAttribute('data-message-id') || 
                         `email_${index}`,
                    subject: '',
                    sender: '',
                    recipient: '',
                    date: '',
                    content: '',
                    labels: [],
                    attachments: []
                };

                // Extract subject
                const subjectElement = emailElement.querySelector('[data-thread-perm-id] span, .bog');
                if (subjectElement) {
                    email.subject = subjectElement.textContent.trim();
                }

                // Extract sender
                const senderElement = emailElement.querySelector('.bA4 span, .zF');
                if (senderElement) {
                    email.sender = senderElement.textContent.trim();
                }

                // Extract date
                const dateElement = emailElement.querySelector('.xW.xY span, .bA4 .bog');
                if (dateElement) {
                    email.date = dateElement.textContent.trim();
                }

                // Extract labels
                const labelElements = emailElement.querySelectorAll('.aXjCH');
                labelElements.forEach(label => {
                    email.labels.push(label.textContent.trim());
                });

                // Extract content preview
                const contentElement = emailElement.querySelector('.y2');
                if (contentElement) {
                    email.content = contentElement.textContent.trim();
                }

                // Extract attachments info
                const attachmentElements = emailElement.querySelectorAll('.aZo');
                attachmentElements.forEach(attachment => {
                    const attachmentName = attachment.textContent.trim();
                    if (attachmentName) {
                        email.attachments.push(attachmentName);
                    }
                });

                metadata.emails.push(email);
            } catch (error) {
                console.error('Error extracting email data:', error);
            }
        });

        return metadata;
    }

    // Function to extract detailed email content when an email is opened
    function extractDetailedEmailContent() {
        const emailContent = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            pageTitle: document.title,
            detailedContent: {}
        };

        // Check if we're in an email view
        const emailView = document.querySelector('[role="main"]');
        if (emailView) {
            // Extract comprehensive email header information
            const headerInfo = {};
            
            // Subject
            const subjectElement = document.querySelector('h2.hP, .hP');
            if (subjectElement) {
                headerInfo.subject = subjectElement.textContent.trim();
            }

            // Sender information - Fixed extraction
            let senderElement = document.querySelector('.gD[data-tooltip*="From:"]') || 
                              document.querySelector('.zF[data-tooltip*="From:"]') ||
                              document.querySelector('[data-tooltip*="From:"] .gD') ||
                              document.querySelector('[data-tooltip*="From:"] .zF');
            
            if (senderElement) {
                headerInfo.sender = senderElement.textContent.trim();
                headerInfo.senderEmail = senderElement.getAttribute('email') || '';
            } else {
                // Fallback: try to find sender in the first recipient-like element
                const firstRecipient = document.querySelector('.gD, .zF');
                if (firstRecipient) {
                    headerInfo.sender = firstRecipient.textContent.trim();
                    headerInfo.senderEmail = firstRecipient.getAttribute('email') || '';
                }
            }

            // Recipients (To, Cc, Bcc) - Fixed extraction using data-tooltip attributes
            const recipientInfo = {
                to: [],
                cc: [],
                bcc: []
            };
            
            // Extract To recipients using data-tooltip attributes
            const toElements = document.querySelectorAll('[data-tooltip*="To:"]');
            console.log('Found To elements:', toElements.length);
            toElements.forEach(element => {
                const tooltip = element.getAttribute('data-tooltip') || '';
                console.log('To tooltip:', tooltip);
                // Extract email from tooltip (format: "To: name <email>")
                const emailMatch = tooltip.match(/To:\s*(.+?)(?:\s*<(.+?)>)?$/);
                if (emailMatch) {
                    const recipientName = emailMatch[1].trim();
                    const recipientEmail = emailMatch[2] || emailMatch[1];
                    const fullRecipient = recipientEmail.includes('@') ? 
                        `${recipientName} <${recipientEmail}>` : recipientName;
                    if (fullRecipient && fullRecipient !== headerInfo.sender) {
                        recipientInfo.to.push(fullRecipient);
                        console.log('Added To recipient:', fullRecipient);
                    }
                }
            });
            
            // Extract Cc recipients using data-tooltip attributes
            const ccElements = document.querySelectorAll('[data-tooltip*="Cc:"]');
            console.log('Found Cc elements:', ccElements.length);
            ccElements.forEach(element => {
                const tooltip = element.getAttribute('data-tooltip') || '';
                console.log('Cc tooltip:', tooltip);
                // Extract email from tooltip (format: "Cc: name <email>")
                const emailMatch = tooltip.match(/Cc:\s*(.+?)(?:\s*<(.+?)>)?$/);
                if (emailMatch) {
                    const recipientName = emailMatch[1].trim();
                    const recipientEmail = emailMatch[2] || emailMatch[1];
                    const fullRecipient = recipientEmail.includes('@') ? 
                        `${recipientName} <${recipientEmail}>` : recipientName;
                    if (fullRecipient && fullRecipient !== headerInfo.sender) {
                        recipientInfo.cc.push(fullRecipient);
                        console.log('Added Cc recipient:', fullRecipient);
                    }
                }
            });
            
            // If no specific To/Cc found, try to extract from general recipient elements
            if (recipientInfo.to.length === 0 && recipientInfo.cc.length === 0) {
                console.log('No specific To/Cc found, trying general recipient extraction...');
                const allRecipientElements = document.querySelectorAll('.gD, .zF, [email]');
                console.log('Found general recipient elements:', allRecipientElements.length);
                
                // Filter out the sender and get valid recipients
                const validRecipients = [];
                allRecipientElements.forEach((element) => {
                    const recipientText = element.textContent.trim();
                    const recipientEmail = element.getAttribute('email') || '';
                    
                    if (recipientText && recipientText !== headerInfo.sender) {
                        validRecipients.push({
                            element: element,
                            text: recipientText,
                            email: recipientEmail
                        });
                    }
                });
                
                console.log('Valid recipients found:', validRecipients.length);
                
                // Process valid recipients
                validRecipients.forEach((recipient, index) => {
                    console.log('Processing valid recipient:', recipient.text, 'email:', recipient.email);
                    
                    // Check if this element has a specific tooltip indicating To/Cc
                    const parentWithTooltip = recipient.element.closest('[data-tooltip]');
                    if (parentWithTooltip) {
                        const tooltip = parentWithTooltip.getAttribute('data-tooltip') || '';
                        console.log('Parent tooltip:', tooltip);
                        
                        if (tooltip.toLowerCase().includes('to:')) {
                            recipientInfo.to.push(recipient.text);
                            console.log('Added as To (from tooltip):', recipient.text);
                        } else if (tooltip.toLowerCase().includes('cc:')) {
                            recipientInfo.cc.push(recipient.text);
                            console.log('Added as Cc (from tooltip):', recipient.text);
                        } else if (tooltip.toLowerCase().includes('bcc:')) {
                            recipientInfo.bcc.push(recipient.text);
                            console.log('Added as Bcc (from tooltip):', recipient.text);
                        }
                    } else {
                        // Try to determine from context or position
                        // Look for patterns that indicate primary recipient (To)
                        const isPrimaryRecipient = 
                            recipient.text.toLowerCase() === 'me' || 
                            recipient.text.includes('karthikreddytheepi@gmail.com') ||
                            index === 0;
                        
                        if (isPrimaryRecipient) {
                            recipientInfo.to.push(recipient.text);
                            console.log('Added as To (primary recipient):', recipient.text);
                        } else {
                            recipientInfo.cc.push(recipient.text);
                            console.log('Added as Cc (secondary recipient):', recipient.text);
                        }
                    }
                });
            }
            
            // Extract Bcc recipients using data-tooltip attributes
            const bccElements = document.querySelectorAll('[data-tooltip*="Bcc:"]');
            bccElements.forEach(element => {
                const tooltip = element.getAttribute('data-tooltip') || '';
                // Extract email from tooltip (format: "Bcc: name <email>")
                const emailMatch = tooltip.match(/Bcc:\s*(.+?)(?:\s*<(.+?)>)?$/);
                if (emailMatch) {
                    const recipientName = emailMatch[1].trim();
                    const recipientEmail = emailMatch[2] || emailMatch[1];
                    const fullRecipient = recipientEmail.includes('@') ? 
                        `${recipientName} <${recipientEmail}>` : recipientName;
                    if (fullRecipient && fullRecipient !== headerInfo.sender) {
                        recipientInfo.bcc.push(fullRecipient);
                    }
                }
            });
            

            
            // Additional fallback: Look for recipients in the email content
            if (recipientInfo.to.length === 0 && recipientInfo.cc.length === 0 && recipientInfo.bcc.length === 0) {
                console.log('Still no recipients found, trying content-based extraction...');
                // Look for recipient patterns in the email content
                const emailContent = document.body.textContent || '';
                const toMatch = emailContent.match(/to:\s*([^,\n]+)/i);
                const ccMatch = emailContent.match(/cc:\s*([^,\n]+)/i);
                
                if (toMatch) {
                    const toRecipient = toMatch[1].trim();
                    if (toRecipient && toRecipient !== headerInfo.sender) {
                        recipientInfo.to.push(toRecipient);
                        console.log('Content-based To recipient:', toRecipient);
                    }
                }
                
                if (ccMatch) {
                    const ccRecipient = ccMatch[1].trim();
                    if (ccRecipient && ccRecipient !== headerInfo.sender) {
                        recipientInfo.cc.push(ccRecipient);
                        console.log('Content-based Cc recipient:', ccRecipient);
                    }
                }
            }
            
            // Final fallback: Try to extract from the email header area more systematically
            if (recipientInfo.to.length === 0 && recipientInfo.cc.length === 0) {
                console.log('Trying systematic header extraction...');
                // Look for the email header section
                const headerSection = document.querySelector('[role="main"]') || 
                                    document.querySelector('.gD')?.closest('div') ||
                                    document.querySelector('.a4W');
                
                if (headerSection) {
                    // Get all text content from the header area
                    const headerText = headerSection.textContent || '';
                    console.log('Header text:', headerText);
                    
                    // Look for patterns like "to: email@domain.com" or "cc: email@domain.com"
                    const toPattern = /to:\s*([^,\n\r]+)/gi;
                    const ccPattern = /cc:\s*([^,\n\r]+)/gi;
                    
                    let toMatch;
                    while ((toMatch = toPattern.exec(headerText)) !== null) {
                        const recipient = toMatch[1].trim();
                        if (recipient && recipient !== headerInfo.sender && !recipientInfo.to.includes(recipient)) {
                            recipientInfo.to.push(recipient);
                            console.log('Pattern-based To recipient:', recipient);
                        }
                    }
                    
                    let ccMatch;
                    while ((ccMatch = ccPattern.exec(headerText)) !== null) {
                        const recipient = ccMatch[1].trim();
                        if (recipient && recipient !== headerInfo.sender && !recipientInfo.cc.includes(recipient)) {
                            recipientInfo.cc.push(recipient);
                            console.log('Pattern-based Cc recipient:', recipient);
                        }
                    }
                }
            }
            
            // Deduplicate recipients
            recipientInfo.to = [...new Set(recipientInfo.to)];
            recipientInfo.cc = [...new Set(recipientInfo.cc)];
            recipientInfo.bcc = [...new Set(recipientInfo.bcc)];
            
            // Remove any recipients that appear in multiple fields
            recipientInfo.cc = recipientInfo.cc.filter(recipient => !recipientInfo.to.includes(recipient));
            recipientInfo.bcc = recipientInfo.bcc.filter(recipient => 
                !recipientInfo.to.includes(recipient) && !recipientInfo.cc.includes(recipient)
            );
            
            console.log('Final recipient distribution:', {
                to: recipientInfo.to,
                cc: recipientInfo.cc,
                bcc: recipientInfo.bcc
            });
            
            headerInfo.recipients = recipientInfo;
            
            // Debug logging for recipients
            console.log('Recipients extraction debug:', {
                sender: headerInfo.sender,
                senderElement: !!senderElement,
                toElements: document.querySelectorAll('[data-tooltip*="To:"]').length,
                ccElements: document.querySelectorAll('[data-tooltip*="Cc:"]').length,
                bccElements: document.querySelectorAll('[data-tooltip*="Bcc:"]').length,
                allRecipients: document.querySelectorAll('.gD, .zF, [data-email]').length,
                allElementsWithTooltip: Array.from(document.querySelectorAll('[data-tooltip]')).map(el => ({
                    tooltip: el.getAttribute('data-tooltip'),
                    text: el.textContent.trim()
                })),
                extractedRecipients: recipientInfo
            });

            // Date and time
            const dateElement = document.querySelector('.xW.xY span, .bA4 .bog');
            if (dateElement) {
                headerInfo.date = dateElement.textContent.trim();
            }

            // Message ID and thread ID
            const messageId = document.querySelector('[data-legacy-message-id]')?.getAttribute('data-legacy-message-id') || '';
            const threadId = document.querySelector('[data-thread-perm-id]')?.getAttribute('data-thread-perm-id') || '';
            headerInfo.messageId = messageId;
            headerInfo.threadId = threadId;

            // Labels
            const labelElements = document.querySelectorAll('.aXjCH, .aXjCH span');
            headerInfo.labels = Array.from(labelElements).map(el => el.textContent.trim()).filter(label => label);

            // Priority and importance
            const priorityElement = document.querySelector('.aXjCH[title*="Important"], .aXjCH[title*="Priority"]');
            headerInfo.priority = priorityElement ? priorityElement.getAttribute('title') : 'Normal';

            // Email body content
            const bodyElement = document.querySelector('.a3s, .adn, .a3s.aXjCH');
            if (bodyElement) {
                headerInfo.body = bodyElement.textContent.trim();
                headerInfo.bodyLength = bodyElement.textContent.length;
            }

            // Attachments with details
            const attachmentElements = document.querySelectorAll('.aZo, .aZo .aZo');
            headerInfo.attachments = Array.from(attachmentElements).map(el => {
                const attachmentInfo = {
                    name: el.textContent.trim(),
                    size: el.querySelector('.aZo .aZo')?.textContent || '',
                    type: el.getAttribute('data-tooltip') || ''
                };
                return attachmentInfo;
            });

            // Email formatting info (simplified without links analysis)
            const hasImages = document.querySelector('.a3s img') !== null;
            const hasFormatting = document.querySelector('.a3s strong, .a3s em, .a3s b, .a3s i') !== null;
            
            headerInfo.formatting = {
                hasImages: hasImages,
                hasFormatting: hasFormatting
            };

            // Gmail-specific metadata
            const isStarred = document.querySelector('.aXjCH[title*="Starred"]') !== null;
            const isUnread = document.querySelector('.zA.zE') !== null;
            const hasReplies = document.querySelector('.aXjCH[title*="Replied"]') !== null;
            
            headerInfo.gmailMetadata = {
                isStarred: isStarred,
                isUnread: isUnread,
                hasReplies: hasReplies,
                isInInbox: window.location.href.includes('inbox'),
                isInSent: window.location.href.includes('sent'),
                isInDrafts: window.location.href.includes('drafts'),
                isInTrash: window.location.href.includes('trash')
            };

            emailContent.detailedContent = headerInfo;
        }

        return emailContent;
    }

    // Function to format data as text
    function formatAsText(data) {
        let text = '';
        
        if (data.emails) {
            // Format email list data
            text += `Gmail Data Export\n`;
            text += `Generated: ${data.timestamp}\n`;
            text += `URL: ${data.url}\n`;
            text += `Title: ${data.title}\n`;
            text += `\n=== EMAILS ===\n\n`;
            
            data.emails.forEach((email, index) => {
                text += `Email ${index + 1}:\n`;
                text += `ID: ${email.id}\n`;
                text += `Subject: ${email.subject}\n`;
                text += `Sender: ${email.sender}\n`;
                text += `Date: ${email.date}\n`;
                text += `Labels: ${email.labels.join(', ')}\n`;
                text += `Content Preview: ${email.content}\n`;
                text += `Attachments: ${email.attachments.join(', ')}\n`;
                text += `\n---\n\n`;
            });
        } else if (data.detailedContent) {
            // Format detailed email content
            text += `Detailed Email Content\n`;
            text += `Generated: ${data.timestamp}\n`;
            text += `URL: ${data.url}\n`;
            text += `Page Title: ${data.pageTitle || 'N/A'}\n\n`;
            
            const content = data.detailedContent;
            
            // Basic Information
            text += `=== BASIC INFORMATION ===\n`;
            text += `Subject: ${content.subject || 'N/A'}\n`;
            text += `Sender: ${content.sender || 'N/A'}\n`;
            text += `Sender Email: ${content.senderEmail || 'N/A'}\n`;
            text += `Date: ${content.date || 'N/A'}\n`;
            text += `Message ID: ${content.messageId || 'N/A'}\n`;
            text += `Thread ID: ${content.threadId || 'N/A'}\n`;
            text += `Priority: ${content.priority || 'Normal'}\n\n`;
            
            // Recipients
            text += `=== RECIPIENTS ===\n`;
            if (content.recipients) {
                text += `To: ${content.recipients.to.join(', ') || 'N/A'}\n`;
                text += `Cc: ${content.recipients.cc.join(', ') || 'N/A'}\n`;
                text += `Bcc: ${content.recipients.bcc.join(', ') || 'N/A'}\n`;
            } else {
                text += `Recipients: N/A\n`;
            }
            text += `\n`;
            
            // Gmail Metadata
            text += `=== GMAIL METADATA ===\n`;
            if (content.gmailMetadata) {
                text += `Starred: ${content.gmailMetadata.isStarred ? 'Yes' : 'No'}\n`;
                text += `Unread: ${content.gmailMetadata.isUnread ? 'Yes' : 'No'}\n`;
                text += `Has Replies: ${content.gmailMetadata.hasReplies ? 'Yes' : 'No'}\n`;
                text += `Location: ${content.gmailMetadata.isInInbox ? 'Inbox' : 
                           content.gmailMetadata.isInSent ? 'Sent' :
                           content.gmailMetadata.isInDrafts ? 'Drafts' :
                           content.gmailMetadata.isInTrash ? 'Trash' : 'Other'}\n`;
            }
            text += `\n`;
            
            // Labels
            text += `=== LABELS ===\n`;
            text += `Labels: ${content.labels ? content.labels.join(', ') : 'None'}\n\n`;
            
            // Attachments
            text += `=== ATTACHMENTS ANALYSIS ===\n`;
            if (content.attachments && content.attachments.length > 0) {
                content.attachments.forEach((attachment, index) => {
                    text += `Attachment ${index + 1}:\n`;
                    text += `  Name: ${attachment.name || 'N/A'}\n`;
                    text += `  Size: ${attachment.size || 'N/A'}\n`;
                    text += `  Type: ${attachment.type || 'N/A'}\n`;
                });
            } else {
                text += `No attachments found\n`;
            }
            text += `\n`;
            

            
            // Formatting Information
            text += `=== FORMATTING ===\n`;
            if (content.formatting) {
                text += `Has Images: ${content.formatting.hasImages ? 'Yes' : 'No'}\n`;
                text += `Has Formatting: ${content.formatting.hasFormatting ? 'Yes' : 'No'}\n`;
            }
            text += `\n`;
            
            // Email Body
            text += `=== EMAIL BODY ===\n`;
            text += `Body Length: ${content.bodyLength || 0} characters\n`;
            text += `\n${content.body || 'No content available'}\n`;
        }

        return text;
    }

    // Listen for messages from popup or background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractData') {
            try {
                let data;
                
                if (request.type === 'list') {
                    // Extract email list data
                    data = extractEmailMetadata();
                } else if (request.type === 'detail') {
                    // Extract detailed email content
                    data = extractDetailedEmailContent();
                } else {
                    sendResponse({ success: false, error: 'Unknown request type' });
                    return true;
                }
                
                const textData = formatAsText(data);
                sendResponse({ success: true, data: textData, rawData: data });
            } catch (error) {
                console.error('Error extracting data:', error);
                sendResponse({ success: false, error: error.message });
            }
        }
        return true; // Keep the message channel open for async response
    });

    // Inject a button into Gmail interface for easy access
    function injectDownloadButton() {
        // Check if button already exists
        if (document.getElementById('gmail-downloader-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'gmail-downloader-btn';
        button.innerHTML = '📥 Download';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'downloadData', type: 'list' });
        });

        document.body.appendChild(button);
    }

    // Initialize the download button when page loads
    console.log('Gmail Downloader content script loaded');
    
    // Send a ready message to background script
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectDownloadButton);
    } else {
        injectDownloadButton();
    }

    // Also inject when Gmail dynamically updates content
    const observer = new MutationObserver(() => {
        injectDownloadButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();