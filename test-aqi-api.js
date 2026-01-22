// Test script to verify AQI API integration
const testAPICall = async () => {
  const lat = 28.5355; // Noida, India
  const lon = 77.3910;
  const apiKey = 'bca4460ade4fda9cce3c64440a1d9be8';
  
  console.log('Testing OpenWeather AQI API...');
  console.log(`Location: ${lat}, ${lon}`);
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    console.log(`\nAPI URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    console.log(`\nResponse Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error Response: ${errorText}`);
      return;
    }
    
    const data = await response.json();
    console.log('\n=== API Response ===');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.list && data.list[0]) {
      const aqi = data.list[0].main.aqi;
      const components = data.list[0].components;
      console.log('\n=== Extracted Data ===');
      console.log(`AQI: ${aqi}`);
      console.log(`PM2.5: ${components.pm2_5}`);
      console.log(`PM10: ${components.pm10}`);
      console.log(`O3: ${components.o3}`);
      console.log(`NO2: ${components.no2}`);
      console.log(`SO2: ${components.so2}`);
      console.log(`CO: ${components.co}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testAPICall();
