#!/usr/bin/env node
import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { minimatch } from 'minimatch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files and directories to exclude from the extension package
const excludePatterns = [
    'index.html',
    'getting-started.html',
    'faq.html',
    'styles.css',
    'package-extension.js',
    'workbird-extension.zip',
    'server.js',
    'node_modules',
    '.git',
    '.vscode'
];

// Create output stream
const output = fs.createWriteStream(join(__dirname, 'workbird-extension.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log('Archive created successfully:', archive.pointer() + ' total bytes');
});

// Listen for warnings
archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

// Listen for errors
archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the output file
archive.pipe(output);

// Function to check if a file should be excluded
function shouldExclude(filePath) {
    const relativePath = relative(__dirname, filePath);
    return excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
            return minimatch(relativePath, pattern);
        }
        return relativePath.includes(pattern);
    });
}

// Add files to the archive
function addFilesToArchive(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = fs.statSync(filePath);
        
        // Skip excluded files and directories
        if (shouldExclude(filePath)) {
            return;
        }
        
        if (stat.isDirectory()) {
            // Recursively add directory contents
            addFilesToArchive(filePath);
        } else {
            // Add file to archive
            const relativePath = relative(__dirname, filePath);
            archive.file(filePath, { name: relativePath });
            console.log('Added:', relativePath);
        }
    });
}

// Start packaging
console.log('Creating extension package...');
addFilesToArchive(__dirname);

// Finalize the archive
archive.finalize();
