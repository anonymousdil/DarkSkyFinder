// exactAQI.js
// Calculates US EPA AQI using PM2.5 and PM10 (most dominant)

const OPENWEATHER_API_KEY = import.meta.env.OPENWEATHER_API_KEY;;

/**
 * AQI breakpoints (US EPA)
 */
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

/**
 * Linear AQI calculation
 */
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

/**
 * Fetch and compute exact AQI
 */
async function getExactAQI(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=OPENWEATHER_API_KEY`;

  const res = await fetch(url);
  const data = await res.json();

  const pm25 = data.list[0].components.pm2_5;
  const pm10 = data.list[0].components.pm10;

  const pm25AQI = calculateAQI(pm25, AQI_BREAKPOINTS.pm25);
  const pm10AQI = calculateAQI(pm10, AQI_BREAKPOINTS.pm10);

  return {
    exactAQI: Math.max(pm25AQI, pm10AQI),
    pm25AQI,
    pm10AQI
  };
}

// Example usage
(async () => {
  const lat = 17.385;
  const lon = 78.4867;

  const result = await getExactAQI(lat, lon);
  console.log(result);
})();
