const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// Enable CORS for the extension
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Endpoint to save email data and run phishing analysis
app.post('/save-email', (req, res) => {
    try {
        const { data, type, userEmail } = req.body;
        
        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `gmail_data_${type || 'list'}_${timestamp}.txt`;
        const filepath = path.join(__dirname, filename);

        // Write the data to file
        fs.writeFileSync(filepath, data, 'utf8');
        
        console.log(`Email data saved to: ${filepath}`);

        // Run phishing analysis if user email is provided
        console.log('Checking for phishing analysis:', { userEmail, type });
        if (userEmail && type === 'detail') {
            console.log('Running phishing analysis for:', userEmail);
            runPhishingAnalysis(filepath, userEmail)
                .then(analysisResult => {
                    res.json({ 
                        success: true, 
                        filepath: filepath,
                        phishingAnalysis: analysisResult
                    });
                })
                .catch(error => {
                    console.error('Phishing analysis error:', error);
                    res.json({ 
                        success: true, 
                        filepath: filepath,
                        phishingAnalysis: { error: 'Analysis failed' }
                    });
                });
        } else {
            res.json({ success: true, filepath: filepath });
        }
        
    } catch (error) {
        console.error('Error saving email data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Function to run phishing analysis
function runPhishingAnalysis(filepath, userEmail) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['phishing_analyzer.py', filepath, userEmail]);
        
        let result = '';
        let error = '';
        
        pythonProcess.stdout.on('data', (data) => {
            result += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            console.log('Python script finished with code:', code);
            console.log('Python output:', result);
            console.log('Python errors:', error);
            
            if (code === 0) {
                try {
                    const analysisResult = JSON.parse(result);
                    console.log('Parsed analysis result:', analysisResult);
                    resolve(analysisResult);
                } catch (e) {
                    console.error('Failed to parse analysis result:', e);
                    reject(new Error('Failed to parse analysis result'));
                }
            } else {
                console.error('Python script failed:', error);
                reject(new Error(`Python script failed with code ${code}: ${error}`));
            }
        });
        
        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python script: ${err.message}`));
        });
    });
}

// Endpoint to get current working directory
app.get('/working-directory', (req, res) => {
    res.json({ 
        workingDirectory: __dirname,
        files: fs.readdirSync(__dirname).filter(file => file.endsWith('.txt'))
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Working directory: ${__dirname}`);
    console.log('Ready to receive email data from the extension...');
}); 