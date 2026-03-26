import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

// Burnaby, BC coordinates (same as weather collector)
const LATITUDE = 49.2488;
const LONGITUDE = -122.9805;

interface AirQualityCurrent {
  time: string;
  pm2_5: number; // μg/m³ - Fine particulate matter
  pm10: number; // μg/m³ - Coarse particulate matter
  carbonMonoxide: number; // μg/m³
  nitrogenDioxide: number; // μg/m³
  sulphurDioxide: number; // μg/m³
  ozone: number; // μg/m³
  usAqi: number; // US Air Quality Index (0-500)
  usAqiCategory: string;
  europeanAqi: number; // European AQI
  aerosolOpticalDepth: number; // Atmospheric clarity
  dust: number; // μg/m³
  methane: number | null; // ppb - greenhouse gas
}

interface AirQualityHourly {
  time: string;
  pm2_5: number;
  pm10: number;
  usAqi: number;
  usAqiCategory: string;
}

interface AirQualityData {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  current: AirQualityCurrent;
  hourly: AirQualityHourly[]; // 24-hour forecast
  collectedAt: string;
}

// US AQI categories
function getUsAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

interface OpenMeteoAirQualityResponse {
  current?: {
    time: string;
    pm2_5: number;
    pm10: number;
    carbon_monoxide: number;
    nitrogen_dioxide: number;
    sulphur_dioxide: number;
    ozone: number;
    us_aqi: number;
    european_aqi: number;
    aerosol_optical_depth: number;
    dust: number;
    methane: number | null;
  };
  hourly?: {
    time: string[];
    pm2_5: number[];
    pm10: number[];
    us_aqi: number[];
  };
}

async function fetchAirQuality(ctx: CollectorContext): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: LATITUDE.toString(),
    longitude: LONGITUDE.toString(),
    timezone: 'America/Vancouver',
    // Current air quality
    current: [
      'pm2_5',
      'pm10',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'us_aqi',
      'european_aqi',
      'aerosol_optical_depth',
      'dust',
      'methane',
    ].join(','),
    // Hourly forecast (24 hours)
    hourly: ['pm2_5', 'pm10', 'us_aqi'].join(','),
    forecast_hours: '24',
  });

  const response = await ctx.fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: OpenMeteoAirQualityResponse = await response.json();

  // Build current air quality
  const current: AirQualityCurrent = data.current
    ? {
        time: data.current.time,
        pm2_5: data.current.pm2_5,
        pm10: data.current.pm10,
        carbonMonoxide: data.current.carbon_monoxide,
        nitrogenDioxide: data.current.nitrogen_dioxide,
        sulphurDioxide: data.current.sulphur_dioxide,
        ozone: data.current.ozone,
        usAqi: data.current.us_aqi,
        usAqiCategory: getUsAqiCategory(data.current.us_aqi),
        europeanAqi: data.current.european_aqi,
        aerosolOpticalDepth: data.current.aerosol_optical_depth,
        dust: data.current.dust,
        methane: data.current.methane,
      }
    : {
        time: ctx.now.toISOString(),
        pm2_5: 0,
        pm10: 0,
        carbonMonoxide: 0,
        nitrogenDioxide: 0,
        sulphurDioxide: 0,
        ozone: 0,
        usAqi: 0,
        usAqiCategory: 'Unknown',
        europeanAqi: 0,
        aerosolOpticalDepth: 0,
        dust: 0,
        methane: null,
      };

  // Build hourly forecast
  const hourly: AirQualityHourly[] = [];
  if (data.hourly) {
    const maxHours = Math.min(24, data.hourly.time.length);
    for (let i = 0; i < maxHours; i++) {
      hourly.push({
        time: data.hourly.time[i],
        pm2_5: data.hourly.pm2_5[i],
        pm10: data.hourly.pm10[i],
        usAqi: data.hourly.us_aqi[i],
        usAqiCategory: getUsAqiCategory(data.hourly.us_aqi[i]),
      });
    }
  }

  return {
    location: {
      name: 'Burnaby, BC',
      latitude: LATITUDE,
      longitude: LONGITUDE,
    },
    current,
    hourly,
    collectedAt: ctx.now.toISOString(),
  };
}

const airQualityCollector: CollectorDefinition<AirQualityData> = {
  id: 'air-quality',
  schedule: {
    type: 'cron',
    expression: '0 * * * *', // Every hour (same as weather)
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 3,
    timeoutMs: 15000,
  },

  async collect(ctx) {
    return fetchAirQuality(ctx);
  },
};

register(airQualityCollector);
