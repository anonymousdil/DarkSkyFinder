#!/usr/bin/env node

/**
 * Setup script to create .env file from .env.example if it doesn't exist
 * This ensures the AQI feature works out of the box for new users
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('\n🔧 DarkSkyFinder Setup\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists - skipping setup');
  console.log('   To reset, delete .env and run npm install again\n');
  process.exit(0);
}

// Check if .env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.log('⚠️  Warning: .env.example not found');
  console.log('   The AQI feature may not work without proper configuration\n');
  process.exit(0);
}

// Copy .env.example to .env
try {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file from .env.example');
  console.log('');
  console.log('📝 Configuration:');
  console.log('   - AQICN API token: Pre-configured for testing');
  console.log('   - Gemini API key: Placeholder (optional - for LLM features)');
  console.log('');
  console.log('🌟 The AQI feature is now ready to use!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. (Optional) Get your own AQICN token: https://aqicn.org/data-platform/token/');
  console.log('   2. (Optional) Add Gemini API key for chatbot: https://aistudio.google.com/app/apikey');
  console.log('   3. Edit .env file to customize configuration');
  console.log('');
  console.log('🚀 Start the app: npm run dev');
  console.log('');
} catch (error) {
  console.log('❌ Error creating .env file:', error.message);
  console.log('   Please manually copy .env.example to .env');
  console.log('');
  console.log('   Commands:');
  console.log('   - Unix/Mac/Linux: cp .env.example .env');
  console.log('   - Windows (CMD): copy .env.example .env');
  console.log('   - Windows (PowerShell): Copy-Item .env.example .env');
  console.log('');
  process.exit(1);
}
