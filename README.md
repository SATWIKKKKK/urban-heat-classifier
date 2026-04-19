This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Urban Heat Mitigator

A comprehensive urban heat island analysis and mitigation planning platform. Built with Next.js, Prisma, PostgreSQL, Leaflet maps, and Gemini AI.

### Key Features

- **My Data Hub**: City overview, place management, heat measurements, data completeness tracking
- **Interactive Map**: Leaflet-based map with vulnerability-colored polygons, global place search via Nominatim, live weather/AQI data
- **AI Analysis**: Gemini-powered place heat vulnerability analysis and scenario comparison reports
- **Interventions**: Plan and track heat mitigation interventions (tree planting, cool roofs, green spaces, etc.)
- **Scenarios**: A/B scenario comparison with dual PDF report generation
- **Role-Based Access**: 9 user roles from Super Admin to Citizen Reporter

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (we use [Neon](https://neon.tech) free tier)

### Setup

1. Clone the repo and install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

3. Run database migrations:
```bash
npx prisma migrate deploy
```

4. Seed the database:
```bash
npx tsx prisma/seed.ts
```

5. Start the dev server:
```bash
npm run dev
```

### Default Login

- **Super Admin**: admin@heatplan.io / Admin@HeatPlan2024!
- **All role users**: User@HeatPlan2024! (city-specific emails in seed data)

## API Keys

### Gemini AI (Required for AI features)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Set `GEMINI_API_KEY` in `.env`

### OpenWeatherMap (Required for live weather on map)

1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get a free API key
3. Set `NEXT_PUBLIC_OPENWEATHER_API_KEY` in `.env`

### Google Maps API (Optional)

Google Maps API is **optional**. The app uses free alternatives by default:
- **Geocoding/Search**: [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- **Map Tiles**: [CARTO](https://carto.com/basemaps/) dark/street + [Esri](https://www.arcgis.com/) satellite
- **Boundaries**: [Overpass API](https://overpass-api.de/) (OpenStreetMap)
- **Weather**: [OpenWeatherMap](https://openweathermap.org/) free tier
- **Forecast**: [Open-Meteo](https://open-meteo.com/) (fully free, no key needed)

If you want to enable Google Maps Places Autocomplete:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project and enable:
   - Maps JavaScript API
   - Places API
3. Create an API key and restrict it to your domain
4. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL via Prisma 7
- **Auth**: NextAuth v5 (JWT strategy)
- **Maps**: Leaflet + OpenStreetMap tiles
- **AI**: Google Gemini 1.5 Flash
- **Styling**: Tailwind CSS 4
- **Testing**: Playwright
