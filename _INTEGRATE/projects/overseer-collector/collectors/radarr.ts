import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext, Env } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface RadarrMovie {
  title: string;
  releaseDate: string; // YYYY-MM-DD
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  year: number;
  overview?: string;
  genres: string[];
  runtime?: number;
  hasFile: boolean;
  monitored: boolean;
  status: string;
  imdbId?: string;
  tmdbId?: number;
}

interface RadarrData {
  movies: RadarrMovie[];
  timeframeDays: number;
  collectedAt: string;
}

interface RadarrApiMovie {
  title?: string;
  year?: number;
  overview?: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  genres?: string[];
  runtime?: number;
  hasFile?: boolean;
  monitored?: boolean;
  status?: string;
  imdbId?: string;
  tmdbId?: number;
}

// Extend Env to include Radarr config
interface RadarrEnv extends Env {
  RADARR_URL?: string;
  RADARR_API_KEY?: string;
}

const DEFAULT_TIMEFRAME_DAYS = 365;

async function fetchRadarrCalendar(
  ctx: CollectorContext,
  timeframeDays: number
): Promise<RadarrMovie[]> {
  const env = ctx.env as RadarrEnv;
  const baseUrl = env.RADARR_URL || 'http://localhost:7878';
  const apiKey = env.RADARR_API_KEY;

  if (!apiKey) {
    throw new Error('RADARR_API_KEY not configured');
  }

  // Calculate date range
  const startDate = ctx.now.toISOString().split('T')[0];
  const endDate = new Date(ctx.now);
  endDate.setDate(endDate.getDate() + timeframeDays);
  const endDateStr = endDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    start: startDate,
    end: endDateStr,
    unmonitored: 'false',
  });

  const response = await ctx.fetch(`${baseUrl}/api/v3/calendar?${params}`, {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Radarr API error: HTTP ${response.status}`);
  }

  const data: RadarrApiMovie[] = await response.json();
  const movies: RadarrMovie[] = [];

  for (const movie of data) {
    if (!movie.title) continue;

    // Determine the most relevant release date
    const releaseDate =
      movie.digitalRelease || movie.physicalRelease || movie.inCinemas || '';

    if (!releaseDate) continue;

    movies.push({
      title: movie.title,
      releaseDate: releaseDate.split('T')[0],
      inCinemas: movie.inCinemas?.split('T')[0],
      digitalRelease: movie.digitalRelease?.split('T')[0],
      physicalRelease: movie.physicalRelease?.split('T')[0],
      year: movie.year || new Date(releaseDate).getFullYear(),
      overview: movie.overview?.slice(0, 300),
      genres: movie.genres || [],
      runtime: movie.runtime,
      hasFile: movie.hasFile || false,
      monitored: movie.monitored || false,
      status: movie.status || 'unknown',
      imdbId: movie.imdbId,
      tmdbId: movie.tmdbId,
    });
  }

  // Sort by release date
  movies.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));

  return movies;
}

const radarrCollector: CollectorDefinition<RadarrData> = {
  id: 'radarr',
  schedule: {
    type: 'cron',
    expression: '0 */6 * * *', // Every 6 hours
  },
  mode: 'both', // Uses HTTP API, works anywhere with network access to Radarr
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    const movies = await fetchRadarrCalendar(ctx, DEFAULT_TIMEFRAME_DAYS);

    return {
      movies,
      timeframeDays: DEFAULT_TIMEFRAME_DAYS,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(radarrCollector);
