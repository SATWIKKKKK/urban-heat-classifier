import { NextResponse } from 'next/server';

const OWM_KEY = process.env.OPENWEATHER_API_KEY ?? process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY ?? '';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  if (!OWM_KEY) {
    return NextResponse.json({ error: 'OpenWeatherMap API key not configured' }, { status: 503 });
  }

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`${OWM_BASE}/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OWM_KEY}`, {
        next: { revalidate: 1800 }, // 30-minute cache
      }),
      fetch(`${OWM_BASE}/air_pollution?lat=${lat}&lon=${lng}&appid=${OWM_KEY}`, {
        next: { revalidate: 1800 },
      }),
    ]);

    const result: {
      temp?: number;
      feelsLike?: number;
      humidity?: number;
      windSpeed?: number;
      description?: string;
      aqi?: number;
      pm25?: number;
    } = {};

    if (weatherRes.ok) {
      const w = await weatherRes.json() as {
        main: { temp: number; feels_like: number; humidity: number };
        weather: { description: string }[];
        wind: { speed: number };
      };
      result.temp = w.main.temp;
      result.feelsLike = w.main.feels_like;
      result.humidity = w.main.humidity;
      result.windSpeed = w.wind?.speed;
      result.description = w.weather?.[0]?.description;
    }

    if (aqiRes.ok) {
      const a = await aqiRes.json() as {
        list: { components: { pm2_5: number }; main: { aqi: number } }[];
      };
      result.aqi = a.list?.[0]?.main?.aqi;
      result.pm25 = a.list?.[0]?.components?.pm2_5;
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch weather data', details: String(err) },
      { status: 502 },
    );
  }
}
