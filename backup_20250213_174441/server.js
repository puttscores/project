#!/usr/bin/env node
import express from 'express';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Serve static files
app.use(express.static('.'));

// Endpoint to run the packaging script
app.post('/run-package-script', (req, res) => {
    // Remove any existing zip file
    const zipPath = join(__dirname, 'workbird-extension.zip');
    if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
    }

    // Run the packaging script
    exec('node package-extension.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec error: ${error}`);
            return res.status(500).send('Failed to create package');
        }

        if (stderr) {
            console.error(`Script error: ${stderr}`);
        }

        console.log(`Script output: ${stdout}`);

        // Check if zip file was created
        if (fs.existsSync(zipPath)) {
            res.status(200).send('Package created successfully');
        } else {
            res.status(500).send('Failed to create package file');
        }
    });
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Current directory: ${__dirname}`);
});