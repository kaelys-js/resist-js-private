import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext, Env } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface SonarrEpisode {
  seriesTitle: string;
  episodeTitle: string;
  airDate: string; // YYYY-MM-DD
  airDateUtc?: string;
  seasonNumber: number;
  episodeNumber: number;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  seriesId: number;
  tvdbId?: number;
  imdbId?: string;
}

interface SonarrData {
  episodes: SonarrEpisode[];
  timeframeDays: number;
  collectedAt: string;
}

interface SonarrApiEpisode {
  title?: string;
  airDate?: string;
  airDateUtc?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  overview?: string;
  hasFile?: boolean;
  monitored?: boolean;
  seriesId?: number;
  tvdbId?: number;
  series?: {
    title?: string;
    imdbId?: string;
  };
}

// Extend Env to include Sonarr config
interface SonarrEnv extends Env {
  SONARR_URL?: string;
  SONARR_API_KEY?: string;
}

const DEFAULT_TIMEFRAME_DAYS = 30;

async function fetchSonarrCalendar(
  ctx: CollectorContext,
  timeframeDays: number
): Promise<SonarrEpisode[]> {
  const env = ctx.env as SonarrEnv;
  const baseUrl = env.SONARR_URL || 'http://localhost:8989';
  const apiKey = env.SONARR_API_KEY;

  if (!apiKey) {
    throw new Error('SONARR_API_KEY not configured');
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
    includeSeries: 'true',
  });

  const response = await ctx.fetch(`${baseUrl}/api/v3/calendar?${params}`, {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Sonarr API error: HTTP ${response.status}`);
  }

  const data: SonarrApiEpisode[] = await response.json();
  const episodes: SonarrEpisode[] = [];

  for (const ep of data) {
    if (!ep.series?.title || !ep.airDate) continue;

    episodes.push({
      seriesTitle: ep.series.title,
      episodeTitle: ep.title || 'TBA',
      airDate: ep.airDate,
      airDateUtc: ep.airDateUtc,
      seasonNumber: ep.seasonNumber || 0,
      episodeNumber: ep.episodeNumber || 0,
      overview: ep.overview?.slice(0, 300),
      hasFile: ep.hasFile || false,
      monitored: ep.monitored || false,
      seriesId: ep.seriesId || 0,
      tvdbId: ep.tvdbId,
      imdbId: ep.series.imdbId,
    });
  }

  // Sort by air date, then by series and episode
  episodes.sort((a, b) => {
    const dateCompare = a.airDate.localeCompare(b.airDate);
    if (dateCompare !== 0) return dateCompare;
    const seriesCompare = a.seriesTitle.localeCompare(b.seriesTitle);
    if (seriesCompare !== 0) return seriesCompare;
    return a.episodeNumber - b.episodeNumber;
  });

  return episodes;
}

const sonarrCollector: CollectorDefinition<SonarrData> = {
  id: 'sonarr',
  schedule: {
    type: 'cron',
    expression: '0 */6 * * *', // Every 6 hours
  },
  mode: 'both', // Uses HTTP API, works anywhere with network access to Sonarr
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    const episodes = await fetchSonarrCalendar(ctx, DEFAULT_TIMEFRAME_DAYS);

    return {
      episodes,
      timeframeDays: DEFAULT_TIMEFRAME_DAYS,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(sonarrCollector);
