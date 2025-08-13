#!/usr/bin/env python3
"""
Phishing Email Analyzer
This script analyzes email files downloaded by the Gmail extension for phishing indicators.
"""

import re
import json
import sys
from collections import defaultdict
import os

# Score weights for different phishing indicators
SCORE_WEIGHTS = {
    # Critical Indicators (Almost always malicious)
    'S5.3': 50,  # Executable Attachment
    'S6.4': 45,  # Direct Credential Request
    'S1.10': 40, # DMARC Failure
    'S6.5': 40,  # BEC Financial Request

    # High-Risk Indicators (Strongly correlated with phishing)
    'S1.5': 35,  # Typosquatting Domain
    'S1.7': 35,  # Corporate Impersonation from Public Domain
    'S1.2': 30,  # Executive Impersonation
    'S5.1': 30,  # Double Extension in Attachment
    'S1.11': 25, # SPF/DKIM Failure
    'S5.4': 25,  # Script Attachment

    # Medium-Risk Indicators (Suspicious, warrant caution)
    'S1.8': 20,  # Newly Registered Domain (< 30 days)
    'S6.6': 20,  # Urgency/Threat Language in Body
    'S3.4': 20,  # Unsolicited Bcc from Unknown Sender
    'S5.5': 15,  # Attachment Contains Macros
    'S2.1': 15,  # Urgency in Subject
    'S6.1': 15,  # Generic Greeting
    'S3.3': 15,  # Recipient is Bcc'd

    # Low-Risk Indicators (Weak signals, mainly for corroboration)
    'S2.2': 10,  # Financial Keywords in Subject
    'S2.3': 10,  # Fake Reply Chain (Re: but not a reply)
    'S2.4': 5,   # Excessive Capitalization
}

# Keyword lists
FINANCIAL_KEYWORDS = ['invoice', 'payment', 'payroll', 'direct deposit', 'refund', 'wire', 'statement', 'purchase']
URGENCY_KEYWORDS = ['urgent', 'important', 'immediate', 'action required', 'warning', 'expired', 'suspended', 'locked']
SECURITY_KEYWORDS = ['password', 'login', 'verification', 'suspicious activity', 'security alert', 'de-activation']
ATO_KEYWORDS = ['unrecognized sign-in', 'new sign-in', 'password was changed', 'password has been reset', 'new device', 'login from a new location']
CREDENTIAL_REQUEST_KEYWORDS = ["verify your password", "confirm your credentials", "update your login"]
GENERIC_GREETINGS = ['dear valued customer', 'dear user', 'dear account holder', 'dear member', 'hello customer', 'dear sir or madam']
HIGH_RISK_EXTENSIONS = ['.exe', '.scr', '.msi', '.bat', '.cmd', '.com', '.js', '.vbs', '.ps1', '.hta', '.jar', '.pif', '.lnk']

def levenshtein_distance(s1, s2):
    """Calculates the Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def get_domain_from_email(email):
    """Extract domain from email address."""
    try:
        return email.split('@')[1]
    except IndexError:
        return ""

def parse_email_from_text(file_path):
    """Parse the detailed text file format into a structured dictionary."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        return None
    except Exception as e:
        return None

    email_data = {'Attachments': []}
    raw_sections = re.split(r'\n=== (.+?) ===\n', content)
    
    sections = {}
    i = 1
    while i < len(raw_sections):
        section_name = raw_sections[i].strip()
        section_content = raw_sections[i+1].strip()
        sections[section_name] = section_content
        i += 2

    # Parse BASIC INFORMATION
    if 'BASIC INFORMATION' in sections:
        for line in sections['BASIC INFORMATION'].split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                email_data[key.strip()] = value.strip()

    # Parse RECIPIENTS
    if 'RECIPIENTS' in sections:
        for line in sections['RECIPIENTS'].split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                match = re.search(r'<(.+?)>', value)
                email_data[key.strip()] = match.group(1) if match else value.strip()

    # Parse ATTACHMENTS ANALYSIS
    if 'ATTACHMENTS ANALYSIS' in sections:
        attachment_lines = re.findall(r'Name:\s*(.+)', sections['ATTACHMENTS ANALYSIS'])
        for line in attachment_lines:
            match = re.search(r'([\w\s\._-]+\.(pdf|docx|xlsx|pptx|zip|rar))', line)
            if match:
                email_data['Attachments'].append({'Name': match.group(1).strip()})
            
    # Parse EMAIL BODY
    if 'EMAIL BODY' in sections:
        body_content = sections['EMAIL BODY']
        body_start_match = re.search(r'\n\n\n', body_content)
        if body_start_match:
            email_data['Email Body'] = body_content[body_start_match.end():].strip()
        else:
             email_data['Email Body'] = body_content

    return email_data

def analyze_email_content(email_data, user_email):
    """Analyze email data using the heuristic framework and calculate risk score."""
    score = 0
    reasons = defaultdict(list)

    # Extract data for analysis
    sender_name = email_data.get('Sender', '').lower()
    sender_email = email_data.get('Sender Email', '').lower()
    subject = email_data.get('Subject', '').lower()
    body = email_data.get('Email Body', '').lower()
    attachments = email_data.get('Attachments', [])
    
    # Sender Analysis
    sender_domain = get_domain_from_email(sender_email)
    known_domains = ["paypal.com", "google.com", "microsoft.com", "amazon.com", "scaler.com"]
    for known_domain in known_domains:
        if sender_domain and levenshtein_distance(sender_domain, known_domain) in [1, 2]:
            score += SCORE_WEIGHTS['S1.5']
            reasons["Sender"].append(f"Domain '{sender_domain}' is very similar to '{known_domain}' (Typosquatting). (+{SCORE_WEIGHTS['S1.5']} pts)")
            break

    # Subject Line Analysis
    all_urgency_words = URGENCY_KEYWORDS + SECURITY_KEYWORDS + ATO_KEYWORDS
    for keyword in all_urgency_words:
        if keyword in subject:
            score += SCORE_WEIGHTS['S2.1']
            reasons["Subject"].append(f"Contains urgency/threat keyword: '{keyword}'. (+{SCORE_WEIGHTS['S2.1']} pts)")
            break
    
    # Recipient Analysis
    if user_email not in email_data.get('To', '') and user_email not in email_data.get('Cc', ''):
        score += SCORE_WEIGHTS['S3.3']
        reasons["Recipients"].append(f"Your email address is not in To/Cc, indicating you were Bcc'd. (+{SCORE_WEIGHTS['S3.3']} pts)")
        
    # Attachment Analysis
    for attachment in attachments:
        filename = attachment.get('Name', '')
        if not filename: continue
        
        for ext in HIGH_RISK_EXTENSIONS:
            if filename.endswith(ext):
                if filename.replace(ext, '').count('.') > 0:
                    score += SCORE_WEIGHTS['S5.1']
                    reasons["Attachments"].append(f"Attachment '{filename}' uses a double extension to hide a risky file type. (+{SCORE_WEIGHTS['S5.1']} pts)")
                else:
                    score += SCORE_WEIGHTS['S5.3']
                    reasons["Attachments"].append(f"Attachment '{filename}' is a high-risk file type ({ext}). (+{SCORE_WEIGHTS['S5.3']} pts)")
                break

    # Email Body Analysis
    for greeting in GENERIC_GREETINGS:
        if body.strip().startswith(greeting):
            score += SCORE_WEIGHTS['S6.1']
            reasons["Body"].append(f"Starts with a generic greeting: '{greeting.title()}'. (+{SCORE_WEIGHTS['S6.1']} pts)")
            break

    dangerous_requests = CREDENTIAL_REQUEST_KEYWORDS + FINANCIAL_KEYWORDS
    for req in dangerous_requests:
        if req in body:
            score += SCORE_WEIGHTS['S6.4']
            reasons["Body"].append(f"Contains a suspicious request for: '{req}'. (+{SCORE_WEIGHTS['S6.4']} pts)")
            break

    final_score = min(score, 100)
    return final_score, reasons

def analyze_file(file_path, user_email):
    """Main function to analyze a file and return results as JSON."""
    try:
        # Parse the email file
        parsed_data = parse_email_from_text(file_path)
        if parsed_data is None:
            return json.dumps({"error": "Could not read or parse the file"})

        # Analyze the parsed data
        final_score, reasons = analyze_email_content(parsed_data, user_email)

        # Prepare results
        score_emoji = "🚨" if final_score >= 70 else "⚠️" if final_score >= 40 else "✅"
        
        result = {
            "score": final_score,
            "emoji": score_emoji,
            "reasons": dict(reasons),
            "success": True
        }
        
        return json.dumps(result)
        
    except Exception as e:
        return json.dumps({"error": str(e), "success": False})

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python phishing_analyzer.py <file_path> <user_email>", "success": False}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    user_email = sys.argv[2]
    
    result = analyze_file(file_path, user_email)
    print(result)
