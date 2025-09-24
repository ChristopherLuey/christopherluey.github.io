#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

// Read the password protection file
const passwordProtectionPath = path.join(__dirname, 'password-protection.js');
let passwordProtectionContent = fs.readFileSync(passwordProtectionPath, 'utf8');

// Get password from environment variable
const password = process.env.WEBSITE_PASSWORD || 'luey';

// Replace the placeholder with the environment variable
passwordProtectionContent = passwordProtectionContent.replace(
    /this\.password = 'WEBSITE_PASSWORD_PLACEHOLDER';/,
    `this.password = '${password}';`
);

// Write the updated file
fs.writeFileSync(passwordProtectionPath, passwordProtectionContent);

console.log('Password protection updated with environment variable');
