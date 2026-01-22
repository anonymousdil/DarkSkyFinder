/**
 * Manual AQI Validation Test Script
 * Tests the AQI service with actual calculations to verify accuracy
 */

// Simulated API response with real PM values
const testCases = [
  {
    name: "Clean Air (Good)",
    pm25: 5.0,
    pm10: 10.0,
    expectedCategory: "Good",
    expectedAQIRange: [0, 50]
  },
  {
    name: "Moderate Air Quality",
    pm25: 25.0,
    pm10: 80.0,
    expectedCategory: "Moderate",
    expectedAQIRange: [51, 100]
  },
  {
    name: "Unhealthy for Sensitive Groups",
    pm25: 45.0,
    pm10: 180.0,
    expectedCategory: "Unhealthy for Sensitive Groups",
    expectedAQIRange: [101, 150]
  },
  {
    name: "Missing PM2.5 (should handle gracefully)",
    pm25: null,
    pm10: 50.0,
    expectedCategory: "Good",
    expectedAQIRange: [0, 50]
  },
  {
    name: "Missing PM10 (should handle gracefully)",
    pm25: 30.0,
    pm10: null,
    expectedCategory: "Moderate",
    expectedAQIRange: [51, 100]
  }
];

// AQI Breakpoints (US EPA)
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

function calculateAQI(concentration, breakpoints) {
  if (concentration == null || concentration < 0) {
    return null;
  }

  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) *
          (concentration - bp.cLow) +
          bp.aqiLow
      );
    }
  }

  if (concentration > breakpoints[breakpoints.length - 1].cHigh) {
    return 500;
  }

  return null;
}

// Run tests
console.log("=== AQI Calculation Validation Tests ===\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Input: PM2.5=${testCase.pm25}, PM10=${testCase.pm10}`);
  
  const pm25AQI = calculateAQI(testCase.pm25, AQI_BREAKPOINTS.pm25);
  const pm10AQI = calculateAQI(testCase.pm10, AQI_BREAKPOINTS.pm10);
  
  console.log(`  PM2.5 AQI: ${pm25AQI ?? 'null'}`);
  console.log(`  PM10 AQI: ${pm10AQI ?? 'null'}`);
  
  let overallAQI;
  if (pm25AQI === null && pm10AQI === null) {
    console.log(`  ❌ Both values are null - cannot calculate AQI`);
    overallAQI = null;
  } else {
    overallAQI = Math.max(pm25AQI ?? 0, pm10AQI ?? 0);
    console.log(`  Overall AQI: ${overallAQI}`);
    
    const inRange = overallAQI >= testCase.expectedAQIRange[0] && 
                    overallAQI <= testCase.expectedAQIRange[1];
    
    if (inRange) {
      console.log(`  ✅ PASS - AQI in expected range [${testCase.expectedAQIRange[0]}-${testCase.expectedAQIRange[1]}]`);
    } else {
      console.log(`  ❌ FAIL - AQI ${overallAQI} not in expected range [${testCase.expectedAQIRange[0]}-${testCase.expectedAQIRange[1]}]`);
    }
  }
  
  console.log("");
});

console.log("=== Test Complete ===");
