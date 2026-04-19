/**
 * Gemini-powered place analysis for urban heat vulnerability.
 * Takes live weather, AQI, and forecast data and generates an AI report.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface PlaceAnalysisInput {
  placeName: string;
  lat: number;
  lng: number;
  weather?: {
    temp: number;
    humidity: number;
    description: string;
    windSpeed: number;
  };
  aqi?: {
    pm25: number;
    overall: number;
  };
  forecast?: {
    dates: string[];
    maxTemps: number[];
    minTemps: number[];
  };
}

export async function generatePlaceAnalysis(input: PlaceAnalysisInput): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'Gemini API key not configured. Set GEMINI_API_KEY in your environment variables.';
  }

  const weatherSection = input.weather
    ? `Current weather: ${input.weather.temp.toFixed(1)}°C, humidity ${input.weather.humidity}%, wind ${input.weather.windSpeed} m/s, conditions: ${input.weather.description}`
    : 'No current weather data available.';

  const aqiSection = input.aqi
    ? `Air Quality: AQI level ${input.aqi.overall} (1=Good, 5=Very Poor), PM2.5: ${input.aqi.pm25.toFixed(1)} µg/m³`
    : 'No air quality data available.';

  const forecastSection = input.forecast?.dates?.length
    ? `7-day forecast:\n${input.forecast.dates.map((d, i) => `  ${d}: High ${input.forecast!.maxTemps[i]?.toFixed(0)}°C / Low ${input.forecast!.minTemps[i]?.toFixed(0)}°C`).join('\n')}`
    : 'No forecast data available.';

  const prompt = `You are an urban heat island expert and environmental scientist. Analyze the following place for urban heat vulnerability and provide actionable insights.

PLACE: ${input.placeName}
COORDINATES: ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}

LIVE DATA:
${weatherSection}
${aqiSection}
${forecastSection}

Provide a concise analysis (300-500 words) covering:

1. **Heat Risk Assessment**: Based on the current temperature, forecast trends, and location. Rate as Low/Moderate/High/Critical.

2. **Urban Heat Island Factors**: What factors at this location likely contribute to or mitigate urban heat? Consider the geographic region, climate zone, and typical urban features.

3. **Air Quality & Health Impact**: Analyze the AQI data and its interaction with heat. What are the health risks for vulnerable populations (elderly, children)?

4. **Recommended Interventions**: Suggest 3-5 specific, actionable heat mitigation strategies suitable for this location. For each, estimate:
   - Expected temperature reduction (in °C)
   - Approximate cost category (Low/Medium/High)
   - Implementation timeline

5. **Data Gaps**: What additional data would improve this analysis? (e.g., tree canopy coverage, impervious surface percentage, population density)

Use bullet points and keep the language professional but accessible. Do NOT use markdown headers larger than ###.`;

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini API error:', err);
    return 'Failed to generate analysis. Please check your API key and try again.';
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'No analysis generated. The model returned an empty response.'
  );
}
