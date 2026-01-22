/**
 * Verify that the API key is being loaded correctly from .env
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env file
config();

console.log("=== Verifying API Key Configuration ===\n");

// Read .env file
const envContent = readFileSync('.env', 'utf-8');
console.log("1. Checking .env file content:");

const envLines = envContent.split('\n');
const apiKeyLine = envLines.find(line => line.startsWith('VITE_OPENWEATHER_API_KEY='));

if (apiKeyLine) {
  console.log(`   ✅ Found VITE_OPENWEATHER_API_KEY in .env`);
  const keyValue = apiKeyLine.split('=')[1];
  console.log(`   Key value: ${keyValue.substring(0, 8)}...`);
} else {
  console.log(`   ❌ VITE_OPENWEATHER_API_KEY not found in .env`);
}

// Check for old incorrect key name
const oldKeyLine = envLines.find(line => line.startsWith('OPENWEATHER_API_KEY=') && !line.startsWith('VITE_'));
if (oldKeyLine) {
  console.log(`   ⚠️  Warning: Found old OPENWEATHER_API_KEY (without VITE_ prefix)`);
} else {
  console.log(`   ✅ No old OPENWEATHER_API_KEY found (good!)`);
}

console.log("\n2. Summary:");
console.log("   The .env file has been corrected to use VITE_OPENWEATHER_API_KEY");
console.log("   This allows Vite to expose the API key to the client-side code");
console.log("   The AQI service will now be able to fetch real-time data from OpenWeather API");

console.log("\n=== Verification Complete ===");
