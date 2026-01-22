/**
 * exactAQI.js
 * --------------------------------------------
 * Calculates REAL (US EPA) AQI (0–500) using
 * PM2.5 and PM10 data from OpenWeatherMap.
 *
 * This file is meant to run on:
 * ✅ Node.js
 * ✅ Vercel serverless functions
 *
 * ❌ Do NOT use this directly in frontend code
 */

/* ======================================================
   🔑 API TOKEN SETUP (IMPORTANT)
   ------------------------------------------------------
   DO NOT hardcode your API key here.

   Instead, set it as an environment variable:

   Vercel Dashboard →
   Project Settings →
   Environment Variables →

   Key:    OPENWEATHER_API_KEY
   Value: your_api_token_here

   Then access it below using process.env
====================================================== */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

/* Safety check (optional but recommended) */
if (!OPENWEATHER_API_KEY) {
  throw new Error(
    "Missing OPENWEATHER_API_KEY. Add it to your environment variables."
  );
}

/* ======================================================
   AQI BREAKPOINT TABLES (US EPA STANDARD)
====================================================== */

const AQI_BREAKPOINTS = {
  pm25: [
    { cLow: 0.0, cHigh: 12.0, aqiLow: 0, aqiHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, aqiLow: 301, aqiHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, aqiLow: 401, aqiHigh: 500 }
  ],
  pm10: [
    { cLow: 0, cHigh: 54, aqiLow: 0, aqiHigh: 50 },
    { cLow: 55, cHigh: 154, aqiLow: 51, aqiHigh: 100 },
    { cLow: 155, cHigh: 254, aqiLow: 101, aqiHigh: 150 },
    { cLow: 255, cHigh: 354, aqiLow: 151, aqiHigh: 200 },
    { cLow: 355, cHigh: 424, aqiLow: 201, aqiHigh: 300 },
    { cLow: 425, cHigh: 504, aqiLow: 301, aqiHigh: 400 },
    { cLow: 505, cHigh: 604, aqiLow: 401, aqiHigh: 500 }
  ]
};

/* ======================================================
   AQI CALCULATION (LINEAR INTERPOLATION)
====================================================== */

function calculateAQI(concentration, breakpoints) {
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) *
          (concentration - bp.cLow) +
          bp.aqiLow
      );
    }
  }
  return null;
}

/* ======================================================
   FETCH + COMPUTE EXACT AQI
====================================================== */

/**
 * Fetch AQI from OpenWeatherMap and compute exact AQI
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @returns {Object} AQI details
 */
async function getExactAQI(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch AQI data from OpenWeatherMap");
  }

  const data = await response.json();

  const pm25 = data.list[0].components.pm2_5;
  const pm10 = data.list[0].components.pm10;

  const pm25AQI = calculateAQI(pm25, AQI_BREAKPOINTS.pm25);
  const pm10AQI = calculateAQI(pm10, AQI_BREAKPOINTS.pm10);

  return {
    exactAQI: Math.max(pm25AQI, pm10AQI), // final AQI
    pm25AQI,
    pm10AQI,
    pm25,
    pm10
  };
}

/* ======================================================
   EXPORT (IMPORTANT)
   ------------------------------------------------------
   Call this function at RUNTIME ONLY
   (API route, serverless function, etc.)
====================================================== */

export { getExactAQI };
