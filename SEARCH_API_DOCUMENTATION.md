# Enhanced Search API Documentation

## Overview

The DarkSkyFinder application now includes an enhanced search API with advanced features for finding locations. This documentation describes the new search capabilities and how they work.

## Features

### 1. Fuzzy Matching
The search service uses two complementary fuzzy matching techniques:

- **Levenshtein Distance Algorithm**: Calculates the edit distance between the search query and location names
- **Fuzzysort Library**: Provides fast and accurate fuzzy string matching with highlighting

**Example:**
- Searching for "Yelowstone" will match "Yellowstone National Park"
- Searching for "San Fransisco" will match "San Francisco"

### 2. Autocomplete Suggestions
As users type their query, the system provides real-time autocomplete suggestions:

- Activates after typing 2 or more characters
- Debounced to prevent excessive API calls (300ms delay)
- Shows up to 8 suggestions with icons and metadata
- Keyboard navigation supported (Arrow keys, Enter, Escape)

**Technical Details:**
- Uses Nominatim API's autocomplete feature
- Results include location type, category, and coordinates
- Cached for 30 minutes to improve performance

### 3. Synonym Matching
The search service automatically expands queries to include synonyms for common location types:

**Supported Synonyms:**
- `park` → parks, nature reserve, wilderness, national park, state park
- `mountain` → mountains, peak, peaks, mount, mt, range
- `desert` → deserts, wilderness, badlands, dunes
- `beach` → beaches, coast, shore, seaside, coastline
- `lake` → lakes, reservoir, pond
- `forest` → forests, woods, woodland, timber
- `valley` → valleys, canyon, gorge, ravine
- `observatory` → observatories, telescope, planetarium
- `dark sky` → dark skies, dark sky park, stargazing, astronomy
- `city` → cities, town, urban, metro, metropolitan
- `island` → islands, isle, atoll
- `plateau` → plateaus, mesa, tableland

**Example:**
- Searching for "dark sky park" will also search for "observatory", "stargazing", etc.

### 4. Result Ranking
Search results are ranked using a sophisticated scoring system with multiple factors:

#### Ranking Factors:

1. **Name Similarity (40% weight)**
   - Calculated using Levenshtein distance
   - Normalized to 0-1 scale
   - Higher similarity = better match

2. **Importance (30% weight)**
   - Based on Nominatim's importance metric
   - Reflects location popularity and significance
   - Range: 0-1

3. **Geographic Proximity (20% weight)**
   - Distance from user's current location (if available)
   - Closer locations ranked higher
   - Normalized using max distance of 10,000 km

4. **Prefix Match Bonus (10% weight)**
   - Bonus points if location name starts with the query
   - Helps prioritize exact prefix matches

#### Ranking Score Calculation:
```javascript
score = (similarity × 0.4) + (importance × 0.3) + (proximity × 0.2) + (prefixBonus × 0.1)
```

### 5. Enhanced API Response Structure

#### Search Response Format:
```json
{
  "success": true,
  "results": [
    {
      "id": "place_id",
      "name": "Location Name",
      "lat": 40.7128,
      "lon": -74.0060,
      "type": "city",
      "category": "place",
      "importance": 0.85,
      "rank": 1,
      "metadata": {
        "similarityScore": "92.5%",
        "rankingScore": "0.875",
        "fuzzyScore": -100,
        "fuzzyHighlight": "<b>Location</b> Name",
        "rankingReasons": [
          {
            "factor": "name_similarity",
            "value": "92.5%",
            "contribution": "0.37"
          },
          {
            "factor": "importance",
            "value": "0.850",
            "contribution": "0.26"
          }
        ],
        "address": {
          "city": "New York",
          "state": "New York",
          "country": "United States"
        }
      }
    }
  ],
  "metadata": {
    "query": "new york",
    "queryVariations": ["new york", "new york city"],
    "totalResults": 15,
    "returnedResults": 10,
    "hasSynonymExpansion": true
  }
}
```

## API Usage

### searchLocations(query, options)

Performs an enhanced search with all features enabled.

**Parameters:**
- `query` (string): The search query
- `options` (object):
  - `limit` (number): Maximum results to return (default: 10)
  - `userLat` (number): User's latitude for proximity ranking (optional)
  - `userLon` (number): User's longitude for proximity ranking (optional)
  - `includeMetadata` (boolean): Include ranking metadata (default: true)

**Returns:** Promise<Object> - Search response object

**Example:**
```javascript
import { searchLocations } from './services/searchService';

const results = await searchLocations('yellowstone', {
  limit: 10,
  includeMetadata: true
});
```

### getAutocompleteSuggestions(query, limit)

Gets autocomplete suggestions for a partial query.

**Parameters:**
- `query` (string): Partial search query (min 2 characters)
- `limit` (number): Maximum suggestions (default: 5)

**Returns:** Promise<Array> - Array of suggestion objects

**Example:**
```javascript
import { getAutocompleteSuggestions } from './services/searchService';

const suggestions = await getAutocompleteSuggestions('san', 5);
```

### parseCoordinates(input)

Parses coordinate input in "lat, lon" format.

**Parameters:**
- `input` (string): Input string to parse

**Returns:** Object|null - { lat, lon } or null if invalid

**Example:**
```javascript
import { parseCoordinates } from './services/searchService';

const coords = parseCoordinates('40.7128, -74.0060');
// Returns: { lat: 40.7128, lon: -74.0060 }
```

## UI Components

### AutocompleteInput
A React component that provides autocomplete functionality.

**Props:**
- `value` (string): Current input value
- `onChange` (function): Callback when input changes
- `onSelect` (function): Callback when suggestion is selected
- `onSearch` (function): Callback when search is triggered
- `placeholder` (string): Input placeholder text
- `disabled` (boolean): Whether input is disabled

**Features:**
- Real-time suggestions
- Keyboard navigation
- Click outside to dismiss
- Loading indicator
- Debounced API calls

### SearchResults
A React component that displays ranked search results with metadata.

**Props:**
- `results` (array): Array of search result objects
- `onSelectResult` (function): Callback when result is selected
- `visible` (boolean): Whether panel is visible
- `onClose` (function): Callback when panel is closed

**Features:**
- Ranked results display
- Expandable metadata details
- Color-coded ranking scores
- Fuzzy match highlighting
- Mobile responsive

## Performance Optimizations

### Caching
- **Search Results**: Cached for 30 minutes
- **Autocomplete Suggestions**: Cached for 30 minutes
- Cache keys include query and parameters for accurate retrieval

### Debouncing
- Autocomplete requests debounced by 300ms
- Reduces API calls while typing
- Cancels pending requests when input changes

### API Rate Limiting
- Uses Nominatim API (free, no key required)
- Automatic caching reduces API calls
- Debouncing prevents excessive requests

## Browser Compatibility

The enhanced search features work in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- Keyboard navigation in autocomplete
- ARIA labels for screen readers
- Focus management
- High contrast support

## Future Enhancements

Potential improvements for future versions:
- User location detection for automatic proximity ranking
- Search history and favorites
- Custom synonym dictionaries
- Multi-language support
- Advanced filters (e.g., by location type)
- Voice search integration
