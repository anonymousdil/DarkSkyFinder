/**
 * Manual Test Script for Enhanced Search Service
 * Run this in the browser console to test search functionality
 */

import { searchLocations, getAutocompleteSuggestions, parseCoordinates } from './src/services/searchService.js';

console.log('=== Enhanced Search Service Test Suite ===\n');

// Test 1: Coordinate Parsing
console.log('Test 1: Coordinate Parsing');
const coords1 = parseCoordinates('40.7128, -74.0060');
console.log('✓ Valid coordinates:', coords1);
const coords2 = parseCoordinates('invalid');
console.log('✓ Invalid coordinates:', coords2);
console.log('');

// Test 2: Basic Search
console.log('Test 2: Basic Search');
searchLocations('New York').then(result => {
  console.log('✓ Search Results:', result.success ? `${result.results.length} results found` : 'Failed');
  if (result.results.length > 0) {
    console.log('  - Top result:', result.results[0].name);
    console.log('  - Ranking score:', result.results[0].metadata?.rankingScore);
  }
}).catch(err => console.error('✗ Error:', err));

// Test 3: Fuzzy Matching
console.log('Test 3: Fuzzy Matching (typo tolerance)');
searchLocations('Yelowstone').then(result => {
  console.log('✓ Fuzzy search for "Yelowstone":', result.success ? `${result.results.length} results found` : 'Failed');
  if (result.results.length > 0) {
    console.log('  - Top result:', result.results[0].name);
    console.log('  - Similarity score:', result.results[0].metadata?.similarityScore);
  }
}).catch(err => console.error('✗ Error:', err));

// Test 4: Synonym Expansion
console.log('Test 4: Synonym Expansion');
searchLocations('dark sky park').then(result => {
  console.log('✓ Synonym search:', result.success ? `${result.results.length} results found` : 'Failed');
  console.log('  - Query variations:', result.metadata?.queryVariations);
  console.log('  - Has synonym expansion:', result.metadata?.hasSynonymExpansion);
}).catch(err => console.error('✗ Error:', err));

// Test 5: Autocomplete
console.log('Test 5: Autocomplete Suggestions');
getAutocompleteSuggestions('San').then(suggestions => {
  console.log(`✓ Autocomplete for "San": ${suggestions.length} suggestions`);
  suggestions.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}`);
  });
}).catch(err => console.error('✗ Error:', err));

// Test 6: Multiple Results Ranking
console.log('Test 6: Result Ranking');
searchLocations('Paris', { limit: 5 }).then(result => {
  console.log('✓ Multiple results ranking:');
  result.results.slice(0, 3).forEach((r, i) => {
    console.log(`  ${r.rank}. ${r.name} (score: ${r.metadata?.rankingScore})`);
  });
}).catch(err => console.error('✗ Error:', err));

// Test 7: Empty Query
console.log('Test 7: Empty Query Handling');
searchLocations('').then(result => {
  console.log('✓ Empty query:', result.success ? 'Unexpected success' : 'Correctly failed');
  console.log('  - Error message:', result.error);
}).catch(err => console.error('✗ Error:', err));

console.log('\n=== Tests Complete ===');
console.log('Note: Async tests may complete out of order. Check results above.');
