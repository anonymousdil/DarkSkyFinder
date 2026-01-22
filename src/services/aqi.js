export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon required" });
  }

  const API_KEY = process.env.OPENWEATHER_API_KEY;

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );

    const data = await response.json();

    const pm25 = data.list[0].components.pm2_5;
    const pm10 = data.list[0].components.pm10;

    const aqi = Math.max(
      calculateAQI(pm25, PM25_BREAKPOINTS),
      calculateAQI(pm10, PM10_BREAKPOINTS)
    );

    res.status(200).json({ aqi });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch AQI" });
  }
}
