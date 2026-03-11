import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface Trailer {
  title: string;
  type: 'movie' | 'tv';
  releaseDate?: string;
  trailerUrl: string;
  thumbnailUrl?: string;
  source: string;
  publishedAt: string;
}

interface TrailersData {
  trailers: Trailer[];
  collectedAt: string;
}

// Apple Trailers RSS is defunct (redirects to tv.apple.com) - keeping function for future use
async function fetchAppleTrailers(_ctx: CollectorContext): Promise<Trailer[]> {
  // Apple discontinued their trailers RSS feed
  return [];
}

// Fetch from IMDb's Coming Soon calendar
async function fetchIMDbTrailers(ctx: CollectorContext): Promise<Trailer[]> {
  const trailers: Trailer[] = [];
  const seen = new Set<string>();

  try {
    const response = await ctx.fetch('https://www.imdb.com/calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Extract movie links with titles - format: href="/title/ttXXXXX/?ref_=rlm">Title (Year)</a>
    const movieRegex = /href="(\/title\/tt\d+\/[^"]*)"[^>]*>([^<]+\(\d{4}\))<\/a>/gi;

    let match;
    while ((match = movieRegex.exec(html)) !== null) {
      const [, urlPath, titleWithYear] = match;
      if (!titleWithYear || seen.has(urlPath)) continue;
      seen.add(urlPath);

      // Extract title and year
      const titleMatch = titleWithYear.match(/^(.+?)\s*\((\d{4})\)$/);
      if (!titleMatch) continue;

      const title = titleMatch[1].trim();
      const year = titleMatch[2];

      trailers.push({
        title,
        type: 'movie',
        releaseDate: `${year}-01-01`, // Approximate release date
        trailerUrl: `https://www.imdb.com${urlPath.split('?')[0]}`,
        source: 'IMDb',
        publishedAt: ctx.now.toISOString(),
      });
    }
  } catch {
    // IMDb unavailable
  }

  return trailers;
}

// Fetch trending trailers from YouTube's official movie channels
async function fetchYouTubeOfficialTrailers(ctx: CollectorContext): Promise<Trailer[]> {
  const trailers: Trailer[] = [];

  // Official movie studio channels and trailer aggregators
  const channels = [
    // Major trailer aggregators
    { id: 'UCi8e0iOVk1fEOogdfu4YgfA', name: 'Rotten Tomatoes Trailers' },
    { id: 'UCuHzBCaKmtaLcRAOoazhCPA', name: 'ONE Media' },
    { id: 'UCKy1dAqELo0zrOtPkf0eTMw', name: 'IGN' },
    // Major studios
    { id: 'UCjmJDM5pRKbUlVIzDYYWb6g', name: 'Warner Bros' },
    { id: 'UCz8QaiQxApLq8sLNcszYyJw', name: 'Sony Pictures' },
    { id: 'UCq0OueAsdxH6b8nyAspwViw', name: 'Universal Pictures' },
    { id: 'UCF9imwPMSGz4Vq1NiTWCC7g', name: 'Paramount Pictures' },
    { id: 'UCuaFvcY4MhZY3U43mMt1dYQ', name: 'Lionsgate Movies' },
    { id: 'UC6aqr1lJp9eDOrmF3H9t6Bg', name: 'A24' },
    { id: 'UCvC4D8onUfXzvjTOM-dBfEA', name: 'Netflix' },
    { id: 'UCmyxyR5u4rLlg8XLquGJBEg', name: 'Amazon MGM Studios' },
    { id: 'UC2-_WWPT_124mZcfOGcFqSA', name: 'Disney' },
  ];

  for (const channel of channels) {
    try {
      const response = await ctx.fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            Accept: 'application/atom+xml, application/xml',
          },
        }
      );

      if (!response.ok) continue;

      const xml = await response.text();
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let match;
      let count = 0;

      while ((match = entryRegex.exec(xml)) !== null && count < 8) {
        const entryXml = match[1];

        const title = extractTag(entryXml, 'title');
        const videoId = extractTag(entryXml, 'yt:videoId');
        const published = extractTag(entryXml, 'published');

        if (!title || !videoId) continue;

        const titleLower = title.toLowerCase();

        // Skip non-trailer content
        if (
          titleLower.includes('reaction') ||
          titleLower.includes('breakdown') ||
          titleLower.includes('review') ||
          titleLower.includes('explained') ||
          titleLower.includes('behind the scenes') ||
          titleLower.includes('interview') ||
          titleLower.includes('clip:') ||
          titleLower.includes('this week')
        ) {
          continue;
        }

        // Include trailers, teasers, first looks, and new releases from studios
        const isTrailerContent =
          titleLower.includes('trailer') ||
          titleLower.includes('teaser') ||
          titleLower.includes('first look') ||
          titleLower.includes('sneak peek') ||
          titleLower.includes('official') ||
          /\(\d{4}\)/.test(title); // Has year in parentheses like "(2026)"

        if (!isTrailerContent) continue;

        // Clean up title - extract movie name
        let cleanTitle = title
          .replace(/\s*[\|\-–:]\s*(?:Official\s*)?(?:Trailer|Teaser|First Look|Sneak Peek).*$/i, '')
          .replace(/\s*(?:Official\s*)?(?:Trailer|Teaser)\s*(?:#?\d+)?.*$/i, '')
          .replace(/\s*\|.*$/i, '')
          .replace(/\s*[-–]\s*(?:New\s+)?(?:Trailer|Teaser).*$/i, '')
          .replace(/\s*HD\s*$/i, '')
          .replace(/\s*4K\s*$/i, '')
          .replace(/NEW\s+(?:TRAILER|TEASER)\s+for\s+['']?/i, '')
          .replace(/['']$/g, '')
          .trim();

        // Extract movie name from formats like "MOVIE NAME (2026)"
        const yearMatch = cleanTitle.match(/^(.+?)\s*\(\d{4}\)\s*$/);
        if (yearMatch) {
          cleanTitle = yearMatch[1].trim();
        }

        if (!cleanTitle || cleanTitle.length < 2) continue;

        trailers.push({
          title: cleanTitle,
          type: titleLower.includes('series') || titleLower.includes('season') ? 'tv' : 'movie',
          trailerUrl: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          source: channel.name,
          publishedAt: published ? new Date(published).toISOString() : ctx.now.toISOString(),
        });

        count++;
      }
    } catch {
      // Channel unavailable
    }
  }

  return trailers;
}

// Rotten Tomatoes uses client-side rendering - keeping function for future use
async function fetchRottenTomatoes(_ctx: CollectorContext): Promise<Trailer[]> {
  // RT browse page is fully client-rendered, no server-side data available
  return [];
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchAllTrailers(ctx: CollectorContext): Promise<Trailer[]> {
  // Fetch from multiple sources in parallel
  const [apple, imdb, youtube, rt] = await Promise.allSettled([
    fetchAppleTrailers(ctx),
    fetchIMDbTrailers(ctx),
    fetchYouTubeOfficialTrailers(ctx),
    fetchRottenTomatoes(ctx),
  ]);

  const trailers: Trailer[] = [];

  if (apple.status === 'fulfilled') trailers.push(...apple.value);
  if (imdb.status === 'fulfilled') trailers.push(...imdb.value);
  if (youtube.status === 'fulfilled') trailers.push(...youtube.value);
  if (rt.status === 'fulfilled') trailers.push(...rt.value);

  // Deduplicate by normalized title, preferring sources with video links
  const seen = new Map<string, Trailer>();
  for (const trailer of trailers) {
    const key = trailer.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 25);

    if (key.length < 2) continue;

    const existing = seen.get(key);
    const hasVideoLink = trailer.trailerUrl.includes('youtube.com');
    const existingHasVideoLink = existing?.trailerUrl.includes('youtube.com');

    // Prefer trailers with actual video links (YouTube)
    if (!existing || (hasVideoLink && !existingHasVideoLink)) {
      seen.set(key, trailer);
    }
  }

  // Sort: prefer YouTube (has video links) first, then by published date
  const unique = Array.from(seen.values());
  unique.sort((a, b) => {
    const aHasVideo = a.trailerUrl.includes('youtube.com') ? 1 : 0;
    const bHasVideo = b.trailerUrl.includes('youtube.com') ? 1 : 0;
    if (bHasVideo !== aHasVideo) return bHasVideo - aHasVideo; // YouTube first
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  // Return top 50 most recent
  return unique.slice(0, 50);
}

const trailersCollector: CollectorDefinition<TrailersData> = {
  id: 'trailers',
  schedule: {
    type: 'cron',
    expression: '0 */12 * * *', // Every 12 hours
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 90000,
  },

  async collect(ctx) {
    const trailers = await fetchAllTrailers(ctx);

    return {
      trailers,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(trailersCollector);
