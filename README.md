# REGEN

REGEN is a Next.js app that serves the React location-intelligence frontend and its backend API from one origin.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Frontend routes such as `/explore`, `/analyze`, and `/find-land` are handled by the client router inside Next.js. Backend endpoints remain under `/api/*`.

## Data and configuration

Copy `.env.example` to `.env.local` and configure the providers you use. Location search and map analysis call the server API routes, which in turn use OpenStreetMap and other configured providers. Provider availability and missing data are shown in API responses. Land opportunity zones are derived map areas, not verified properties for sale.

Street View is optional and requires a Google Maps JavaScript API key restricted for the website:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

The key is exposed to the browser by design, so restrict it by allowed referrers and enabled APIs. The rest of the app uses the existing server-side provider configuration.
