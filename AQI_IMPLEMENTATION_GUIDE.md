# AQI Implementation Guide

## Overview

The DarkSkyFinder application includes a complete Air Quality Index (AQI) feature that provides real-time air quality data for stargazing locations using the AQICN (World Air Quality Index) API.

## Implementation Status

✅ **FULLY IMPLEMENTED AND OPERATIONAL**

The AQI functionality has been successfully integrated into the application with the following components:

### 1. Core AQI Service (`src/services/aqiService.js`)

**Features:**
- Real-time AQI data from AQICN API
- US EPA standard AQI calculation (0-500 scale)
- Detailed pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- Intelligent caching (1 hour cache duration)
- Graceful fallback to mock data when API is unavailable
- Comprehensive error handling

**Key Functions:**
- `getAQI(lat, lon, options)` - Main function to fetch AQI data
- `getAQICategory(aqiValue)` - Get category info for an AQI value
- `getPollutantInfo(pollutantKey)` - Get information about specific pollutants
- `fetchAQIFromAPI(lat, lon)` - Internal function to call AQICN API
- `generateMockAQI(lat, lon)` - Generate fallback data

### 2. AQI Display Component (`src/components/AQIView.jsx`)

**Features:**
- Interactive UI showing AQI value and category
- Color-coded health indicators
- Breathing quality assessment
- Stargazing impact information
- Detailed pollutant breakdown
- Health recommendations based on AQI level
- Navigation to location via Google Maps
- Refresh button for real-time updates
- Warning indicators for mock/stale data

### 3. Integration Points

The AQI service is integrated into:
- **MapPage** (`src/pages/MapPage.jsx`) - Main map interface
- **UltimateView** (`src/components/UltimateView.jsx`) - Comprehensive stargazing report
- **NearbyLocations** (`src/services/nearbyLocationsService.js`) - Location analysis

## Setup Instructions

### Step 1: Get AQICN API Token

1. Visit [https://aqicn.org/data-platform/token/](https://aqicn.org/data-platform/token/)
2. Sign up for a free account
3. Request an API token
4. Copy your token (it will be a 40-character alphanumeric string)

### Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your AQICN token:
   ```
   VITE_AQICN_TOKEN=your_actual_aqicn_token_here
   ```

3. **IMPORTANT**: Never commit the `.env` file to version control (it's already in `.gitignore`)

### Step 3: Verify Installation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the application at `http://localhost:5173`

3. Click on any location on the map

4. Click the "AQI" button to view air quality data

5. Check the browser console:
   - ✅ Should see: `[AQI Service] Successfully fetched and calculated exact numeric AQI`
   - ❌ Should NOT see: `[AQI Service] AQICN API token not configured. Using mock data.`

## Security Best Practices

### ✅ What We Do Right

1. **Environment Variables**: API token is loaded from `.env` file using `import.meta.env.VITE_AQICN_TOKEN`
2. **No Hardcoded Secrets**: The code explicitly warns against hardcoding tokens
3. **Gitignore**: `.env` file is in `.gitignore` to prevent accidental commits
4. **Example File**: `.env.example` provides a template without real tokens

### ⚠️ Important Security Considerations

**Frontend API Key Exposure:**
- The `VITE_` prefix exposes the token in the frontend JavaScript bundle
- This is a **trade-off** for simplicity in development and demo applications
- **Risk**: Exposed API keys can be discovered and potentially abused by others, which could:
  - Exhaust your rate limits (1,000 calls/minute)
  - Result in unexpected API usage
  - Require token regeneration if heavily abused

**Production Recommendations:**
- For production applications, consider using a **backend proxy** to hide the API key
- The proxy would make AQICN API calls server-side and expose a custom endpoint to your frontend
- This prevents direct exposure of your API token in client-side code
- The current implementation is suitable for:
  - Personal projects
  - Educational use
  - Demo applications
  - Free tier usage with acceptable risk

**Mitigation Strategies:**
- Use the caching system (1 hour cache) to minimize API calls
- Monitor your AQICN dashboard for unusual usage patterns
- Regenerate tokens if you notice abuse
- Consider implementing rate limiting on your frontend
- For production, migrate to a backend proxy architecture

## Testing

### Validation Tests

Run the validation tests to verify AQI calculations:

```bash
node test-aqi-validation.js
```

**Expected Output:**
```
=== AQI Calculation Validation Tests ===

Test 1: Clean Air (Good)
  ✅ PASS - AQI in expected range [0-50]

Test 2: Moderate Air Quality
  ✅ PASS - AQI in expected range [51-100]

Test 3: Unhealthy for Sensitive Groups
  ✅ PASS - AQI in expected range [101-150]

Test 4: Missing PM2.5 (should handle gracefully)
  ✅ PASS - AQI in expected range [0-50]

Test 5: Missing PM10 (should handle gracefully)
  ✅ PASS - AQI in expected range [51-100]

=== Test Complete ===
```

### Manual Browser Testing

For integration testing with real API calls:

1. Start development server: `npm run dev`
2. Open `http://localhost:5173/test-aqi-service.html`
3. Click "Run All Tests"
4. Verify all tests pass

**Note**: This requires a valid AQICN token in your `.env` file.

## AQI Categories (US EPA Standard)

| AQI Range | Level                              | Color  | Health Implications                        |
|-----------|-----------------------------------|--------|--------------------------------------------|
| 0-50      | Good                              | Green  | Air quality is satisfactory               |
| 51-100    | Moderate                          | Yellow | Acceptable for most people                |
| 101-150   | Unhealthy for Sensitive Groups    | Orange | Sensitive groups may be affected          |
| 151-200   | Unhealthy                         | Red    | Everyone may experience health effects    |
| 201-300   | Very Unhealthy                    | Purple | Health alert: everyone may be affected    |
| 301-500   | Hazardous                         | Maroon | Health warnings of emergency conditions   |

## API Reference

### AQICN API Endpoints

**Endpoint**: `https://api.waqi.info/feed/geo:{lat};{lon}/?token={token}`

**Rate Limits**: 1,000 calls per minute (free tier)

**Response Format**:
```json
{
  "status": "ok",
  "data": {
    "aqi": 45,
    "dominentpol": "pm25",
    "iaqi": {
      "pm25": { "v": 45 },
      "pm10": { "v": 32 },
      "o3": { "v": 12 }
    },
    "city": {
      "name": "Station Name"
    }
  }
}
```

## Troubleshooting

### Issue: "Using mock data" warning

**Cause**: AQICN token not configured or invalid

**Solution**:
1. Check `.env` file exists
2. Verify token is set: `VITE_AQICN_TOKEN=your_token`
3. Restart development server
4. Clear browser cache

### Issue: API authentication failed

**Cause**: Invalid or expired token

**Solution**:
1. Get a new token from [AQICN](https://aqicn.org/data-platform/token/)
2. Update `.env` file
3. Restart development server

### Issue: Rate limit exceeded

**Cause**: Too many API calls in short time

**Solution**:
- Wait a minute before retrying
- The caching system should prevent this in normal use
- Check for infinite loops in code

## Additional Resources

- [AQICN API Documentation](https://aqicn.org/api/)
- [US EPA AQI Guide](https://www.airnow.gov/aqi/aqi-basics/)
- [Migration Summary](./AQICN_MIGRATION_SUMMARY.md)
- [AQI Fix Summary](./AQI_FIX_SUMMARY.md)

## Maintenance

### Regular Tasks

1. **Monitor API Usage**: Check AQICN dashboard for usage statistics
2. **Update Dependencies**: Keep React and other dependencies updated
3. **Test API Changes**: AQICN may update their API; test periodically
4. **Review Logs**: Monitor console for errors or warnings

### Version History

- **Current**: AQICN API integration with US EPA standard calculations
- **Previous**: OpenWeatherMap API (migrated away for better data quality)

## Support

For issues or questions:
1. Check this guide and other documentation files
2. Review console logs for error messages
3. Verify `.env` configuration
4. Test with mock data disabled to isolate issues
