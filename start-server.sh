#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Starting Gmail Downloader Server..."
echo "Server will run on http://localhost:3000"
echo "Working directory: $(pwd)"
echo "Files will be saved to: $(pwd)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start 