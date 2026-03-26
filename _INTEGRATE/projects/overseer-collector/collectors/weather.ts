import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext, Env } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

// Burnaby, BC coordinates
const LATITUDE = 49.2488;
const LONGITUDE = -122.9805;

interface HourlyForecast {
  time: string; // ISO datetime
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  cloudCover: number;
  visibility: number;
  uvIndex: number;
  isDay: boolean;
}

interface DailyForecast {
  date: string; // YYYY-MM-DD
  temperatureMax: number;
  temperatureMin: number;
  apparentTemperatureMax: number;
  apparentTemperatureMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  precipitationHours: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeedMax: number;
  windGustsMax: number;
  windDirectionDominant: number;
}

interface WeatherData {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    weatherDescription: string;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
    cloudCover: number;
    visibility: number;
    uvIndex: number;
    isDay: boolean;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  collectedAt: string;
}

// Weather code descriptions (WMO codes)
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] || `Unknown (${code})`;
}

interface OpenMeteoResponse {
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    cloud_cover: number;
    visibility: number;
    uv_index: number;
    is_day: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    precipitation: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    cloud_cover: number[];
    visibility: number[];
    uv_index: number[];
    is_day: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    precipitation_hours: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
}

async function fetchWeather(ctx: CollectorContext): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: LATITUDE.toString(),
    longitude: LONGITUDE.toString(),
    timezone: 'America/Vancouver',
    forecast_days: '7',
    // Current weather
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'cloud_cover',
      'visibility',
      'uv_index',
      'is_day',
    ].join(','),
    // Hourly forecast (next 48 hours)
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'cloud_cover',
      'visibility',
      'uv_index',
      'is_day',
    ].join(','),
    // Daily forecast
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'precipitation_hours',
      'weather_code',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
    ].join(','),
  });

  const response = await ctx.fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  // Build current weather
  const current = data.current
    ? {
        time: data.current.time,
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        weatherDescription: getWeatherDescription(data.current.weather_code),
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        windGusts: data.current.wind_gusts_10m,
        cloudCover: data.current.cloud_cover,
        visibility: data.current.visibility,
        uvIndex: data.current.uv_index,
        isDay: data.current.is_day === 1,
      }
    : {
        time: ctx.now.toISOString(),
        temperature: 0,
        apparentTemperature: 0,
        humidity: 0,
        precipitation: 0,
        weatherCode: 0,
        weatherDescription: 'Unknown',
        windSpeed: 0,
        windDirection: 0,
        windGusts: 0,
        cloudCover: 0,
        visibility: 0,
        uvIndex: 0,
        isDay: true,
      };

  // Build hourly forecast (next 48 hours only)
  const hourly: HourlyForecast[] = [];
  if (data.hourly) {
    const maxHours = Math.min(48, data.hourly.time.length);
    for (let i = 0; i < maxHours; i++) {
      hourly.push({
        time: data.hourly.time[i],
        temperature: data.hourly.temperature_2m[i],
        apparentTemperature: data.hourly.apparent_temperature[i],
        humidity: data.hourly.relative_humidity_2m[i],
        precipitation: data.hourly.precipitation[i],
        precipitationProbability: data.hourly.precipitation_probability[i],
        weatherCode: data.hourly.weather_code[i],
        weatherDescription: getWeatherDescription(data.hourly.weather_code[i]),
        windSpeed: data.hourly.wind_speed_10m[i],
        windDirection: data.hourly.wind_direction_10m[i],
        windGusts: data.hourly.wind_gusts_10m[i],
        cloudCover: data.hourly.cloud_cover[i],
        visibility: data.hourly.visibility[i],
        uvIndex: data.hourly.uv_index[i],
        isDay: data.hourly.is_day[i] === 1,
      });
    }
  }

  // Build daily forecast
  const daily: DailyForecast[] = [];
  if (data.daily) {
    for (let i = 0; i < data.daily.time.length; i++) {
      daily.push({
        date: data.daily.time[i],
        temperatureMax: data.daily.temperature_2m_max[i],
        temperatureMin: data.daily.temperature_2m_min[i],
        apparentTemperatureMax: data.daily.apparent_temperature_max[i],
        apparentTemperatureMin: data.daily.apparent_temperature_min[i],
        sunrise: data.daily.sunrise[i],
        sunset: data.daily.sunset[i],
        uvIndexMax: data.daily.uv_index_max[i],
        precipitationSum: data.daily.precipitation_sum[i],
        precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
        precipitationHours: data.daily.precipitation_hours[i],
        weatherCode: data.daily.weather_code[i],
        weatherDescription: getWeatherDescription(data.daily.weather_code[i]),
        windSpeedMax: data.daily.wind_speed_10m_max[i],
        windGustsMax: data.daily.wind_gusts_10m_max[i],
        windDirectionDominant: data.daily.wind_direction_10m_dominant[i],
      });
    }
  }

  return {
    location: {
      name: 'Burnaby, BC',
      latitude: LATITUDE,
      longitude: LONGITUDE,
      timezone: data.timezone || 'America/Vancouver',
    },
    current,
    hourly,
    daily,
    collectedAt: ctx.now.toISOString(),
  };
}

const weatherCollector: CollectorDefinition<WeatherData> = {
  id: 'weather',
  schedule: {
    type: 'cron',
    expression: '0 * * * *', // Every hour
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 3,
    timeoutMs: 15000,
  },

  async collect(ctx) {
    return fetchWeather(ctx);
  },
};

register(weatherCollector);
