import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface Concert {
  artist: string;
  venue: string;
  date: string; // YYYY-MM-DD
  time?: string;
  city: string;
  ticketUrl?: string;
  price?: string;
  source: string;
}

interface ConcertsData {
  concerts: Concert[];
  location: string;
  timeframeMonths: number;
  collectedAt: string;
}

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// Strip HTML tags
function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

// Get end of year date
function getEndOfYear(now: Date): string {
  return `${now.getFullYear()}-12-31`;
}

// Fetch from Songkick (Vancouver metro area)
async function fetchSongkickConcerts(ctx: CollectorContext): Promise<Concert[]> {
  const concerts: Concert[] = [];

  try {
    // Songkick metro area for Vancouver - fetch all pages (up to 15)
    for (let page = 1; page <= 15; page++) {
      const response = await ctx.fetch(
        `https://www.songkick.com/metro-areas/27398-canada-vancouver?page=${page}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            Accept: 'text/html',
          },
        }
      );

      if (!response.ok) break;

      const html = await response.text();

      // Look for JSON-LD structured data first (most reliable)
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

      // No more events on this page, stop pagination
      if (!jsonLdMatches || jsonLdMatches.length === 0) break;

      if (jsonLdMatches) {
        for (const jsonStr of jsonLdMatches) {
          try {
            interface EventItem {
              '@type'?: string;
              name?: string;
              startDate?: string;
              location?: { name?: string };
              performer?: { name?: string } | { name?: string }[];
              url?: string;
              offers?: { price?: string | number };
            }
            const jsonContent = jsonStr.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
            const data = JSON.parse(jsonContent) as EventItem | EventItem[];

            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item['@type'] === 'MusicEvent' || item['@type'] === 'Event') {
                const performer = Array.isArray(item.performer)
                  ? item.performer[0]?.name
                  : item.performer?.name;
                const artist = performer || item.name || '';
                if (!artist) continue;

                concerts.push({
                  artist,
                  venue: item.location?.name || 'TBA',
                  date: item.startDate?.split('T')[0] || '',
                  time: item.startDate?.split('T')[1]?.slice(0, 5),
                  city: 'Vancouver',
                  ticketUrl: item.url,
                  price: item.offers?.price ? `$${item.offers.price}` : undefined,
                  source: 'Songkick',
                });
              }
            }
          } catch {
            // Invalid JSON
          }
        }
      }

      // Fallback: scrape event listings
      const eventRegex =
        /<li[^>]*class="[^"]*event-listings[^"]*"[^>]*data-event-date="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)<\/strong>[\s\S]*?<a[^>]*class="[^"]*venue-link[^"]*"[^>]*>([^<]+)<\/a>/gi;

      let match;
      while ((match = eventRegex.exec(html)) !== null) {
        const [, date, url, artist, venue] = match;
        if (!artist || !date) continue;

        concerts.push({
          artist: stripHtml(artist),
          venue: stripHtml(venue) || 'TBA',
          date: date,
          city: 'Vancouver',
          ticketUrl: url.startsWith('http') ? url : `https://www.songkick.com${url}`,
          source: 'Songkick',
        });
      }
    }
  } catch {
    // Songkick unavailable
  }

  return concerts;
}

// Fetch from Bandsintown
async function fetchBandsintownConcerts(ctx: CollectorContext): Promise<Concert[]> {
  const concerts: Concert[] = [];

  try {
    const response = await ctx.fetch('https://www.bandsintown.com/c/vancouver-bc-canada', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Look for JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

    if (jsonLdMatches) {
      for (const jsonStr of jsonLdMatches) {
        try {
          interface EventItem {
            '@type'?: string;
            name?: string;
            startDate?: string;
            location?: { name?: string };
            performer?: { name?: string };
            url?: string;
          }
          const jsonContent = jsonStr.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const data = JSON.parse(jsonContent) as EventItem | EventItem[];

          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'MusicEvent' || item['@type'] === 'Event') {
              concerts.push({
                artist: item.performer?.name || item.name || 'Unknown',
                venue: item.location?.name || 'TBA',
                date: item.startDate?.split('T')[0] || '',
                time: item.startDate?.split('T')[1]?.slice(0, 5),
                city: 'Vancouver',
                ticketUrl: item.url,
                source: 'Bandsintown',
              });
            }
          }
        } catch {
          // Invalid JSON
        }
      }
    }
  } catch {
    // Bandsintown unavailable
  }

  return concerts;
}

// Fetch from Fever (popular for experiences/events)
async function fetchFeverConcerts(ctx: CollectorContext): Promise<Concert[]> {
  const concerts: Concert[] = [];

  try {
    // Fever Vancouver concerts page
    const response = await ctx.fetch('https://feverup.com/vancouver/concerts', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Look for JSON-LD or event cards
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

    if (jsonLdMatches) {
      for (const jsonStr of jsonLdMatches) {
        try {
          interface FeverEvent {
            '@type'?: string;
            name?: string;
            startDate?: string;
            location?: { name?: string };
            performer?: { name?: string };
            url?: string;
            offers?: { price?: string | number };
          }
          const jsonContent = jsonStr.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const data = JSON.parse(jsonContent) as FeverEvent | FeverEvent[];

          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (
              item['@type'] === 'MusicEvent' ||
              item['@type'] === 'Event' ||
              item['@type'] === 'TheaterEvent'
            ) {
              const artist = item.performer?.name || item.name || '';
              if (!artist) continue;

              concerts.push({
                artist,
                venue: item.location?.name || 'TBA',
                date: item.startDate?.split('T')[0] || '',
                time: item.startDate?.split('T')[1]?.slice(0, 5),
                city: 'Vancouver',
                ticketUrl: item.url,
                price: item.offers?.price ? `$${item.offers.price}` : undefined,
                source: 'Fever',
              });
            }
          }
        } catch {
          // Invalid JSON
        }
      }
    }

    // Fallback: look for event cards
    const eventCardRegex =
      /<article[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?<time[^>]*datetime="([^"]*)"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>/gi;

    let match;
    while ((match = eventCardRegex.exec(html)) !== null) {
      const [, title, datetime, url] = match;
      if (!title) continue;

      concerts.push({
        artist: stripHtml(title),
        venue: 'TBA',
        date: datetime?.split('T')[0] || '',
        time: datetime?.split('T')[1]?.slice(0, 5),
        city: 'Vancouver',
        ticketUrl: url.startsWith('http') ? url : `https://feverup.com${url}`,
        source: 'Fever',
      });
    }
  } catch {
    // Fever unavailable
  }

  return concerts;
}

// Fetch from Ticketmaster Vancouver
async function fetchTicketmasterConcerts(ctx: CollectorContext): Promise<Concert[]> {
  const concerts: Concert[] = [];

  try {
    // Ticketmaster Vancouver concerts
    const response = await ctx.fetch(
      'https://www.ticketmaster.ca/discover/concerts/vancouver',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html',
        },
      }
    );

    if (!response.ok) return [];

    const html = await response.text();

    // Look for event data in JSON-LD or embedded JSON
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

    if (jsonLdMatches) {
      for (const jsonStr of jsonLdMatches) {
        try {
          interface TMEvent {
            '@type'?: string;
            name?: string;
            startDate?: string;
            location?: { name?: string };
            performer?: { name?: string } | { name?: string }[];
            url?: string;
            offers?: { price?: string | number; lowPrice?: string | number };
          }
          const jsonContent = jsonStr.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const data = JSON.parse(jsonContent) as TMEvent | TMEvent[];

          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'MusicEvent' || item['@type'] === 'Event') {
              const performer = Array.isArray(item.performer)
                ? item.performer[0]?.name
                : item.performer?.name;
              const artist = performer || item.name || '';
              if (!artist) continue;

              const price = item.offers?.lowPrice || item.offers?.price;

              concerts.push({
                artist,
                venue: item.location?.name || 'TBA',
                date: item.startDate?.split('T')[0] || '',
                time: item.startDate?.split('T')[1]?.slice(0, 5),
                city: 'Vancouver',
                ticketUrl: item.url,
                price: price ? `$${price}` : undefined,
                source: 'Ticketmaster',
              });
            }
          }
        } catch {
          // Invalid JSON
        }
      }
    }
  } catch {
    // Ticketmaster unavailable
  }

  return concerts;
}

// Fetch from local Vancouver venue websites
async function fetchLocalVenueConcerts(ctx: CollectorContext): Promise<Concert[]> {
  const concerts: Concert[] = [];

  const venues = [
    { name: 'Commodore Ballroom', url: 'https://www.commodoreballroom.com/events' },
    { name: 'Orpheum Theatre', url: 'https://www.vancouvercivictheatres.com/orpheum/events/' },
    { name: 'Queen Elizabeth Theatre', url: 'https://www.vancouvercivictheatres.com/queen-elizabeth-theatre/events/' },
    { name: 'Rogers Arena', url: 'https://rogersarena.com/events/' },
    { name: 'BC Place', url: 'https://www.bcplace.com/events' },
    { name: 'PNE', url: 'https://www.pne.ca/events/' },
    { name: 'Vogue Theatre', url: 'https://www.voguetheatre.com/events/' },
    { name: 'Rickshaw Theatre', url: 'https://rickshawtheatre.com/events/' },
  ];

  for (const venue of venues) {
    try {
      const response = await ctx.fetch(venue.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Look for JSON-LD event data
      const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

      if (jsonLdMatches) {
        for (const jsonStr of jsonLdMatches) {
          try {
            interface VenueEvent {
              '@type'?: string;
              name?: string;
              startDate?: string;
              location?: { name?: string };
              performer?: { name?: string };
              url?: string;
              offers?: { price?: string | number };
            }
            const jsonContent = jsonStr.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
            const data = JSON.parse(jsonContent) as VenueEvent | VenueEvent[];

            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (
                item['@type'] === 'MusicEvent' ||
                item['@type'] === 'Event' ||
                item['@type'] === 'TheaterEvent'
              ) {
                const artist = item.performer?.name || item.name || '';
                if (!artist) continue;

                concerts.push({
                  artist,
                  venue: venue.name,
                  date: item.startDate?.split('T')[0] || '',
                  time: item.startDate?.split('T')[1]?.slice(0, 5),
                  city: 'Vancouver',
                  ticketUrl: item.url || venue.url,
                  price: item.offers?.price ? `$${item.offers.price}` : undefined,
                  source: venue.name,
                });
              }
            }
          } catch {
            // Invalid JSON
          }
        }
      }
    } catch {
      // Venue site unavailable
    }
  }

  return concerts;
}

async function fetchAllConcerts(ctx: CollectorContext): Promise<Concert[]> {
  // Fetch from multiple sources in parallel
  const [songkick, bandsintown, fever, ticketmaster, local] = await Promise.allSettled([
    fetchSongkickConcerts(ctx),
    fetchBandsintownConcerts(ctx),
    fetchFeverConcerts(ctx),
    fetchTicketmasterConcerts(ctx),
    fetchLocalVenueConcerts(ctx),
  ]);

  const concerts: Concert[] = [];

  if (songkick.status === 'fulfilled') concerts.push(...songkick.value);
  if (bandsintown.status === 'fulfilled') concerts.push(...bandsintown.value);
  if (fever.status === 'fulfilled') concerts.push(...fever.value);
  if (ticketmaster.status === 'fulfilled') concerts.push(...ticketmaster.value);
  if (local.status === 'fulfilled') concerts.push(...local.value);

  // Filter out concerts without dates or in the past
  const today = ctx.now.toISOString().split('T')[0];
  const endOfYear = getEndOfYear(ctx.now);

  const validConcerts = concerts.filter((c) => {
    if (!c.date) return false;
    return c.date >= today && c.date <= endOfYear;
  });

  // Deduplicate by artist + date (normalize artist name)
  const seen = new Map<string, Concert>();
  for (const concert of validConcerts) {
    const normalizedArtist = concert.artist.toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = `${normalizedArtist}-${concert.date}`;

    // Prefer sources with more info (price, time, ticket URL)
    const existing = seen.get(key);
    if (
      !existing ||
      (concert.price && !existing.price) ||
      (concert.time && !existing.time) ||
      (concert.ticketUrl && !existing.ticketUrl)
    ) {
      seen.set(key, concert);
    }
  }

  // Sort by date
  const unique = Array.from(seen.values());
  unique.sort((a, b) => a.date.localeCompare(b.date));

  return unique;
}

const concertsCollector: CollectorDefinition<ConcertsData> = {
  id: 'concerts',
  schedule: {
    type: 'cron',
    expression: '0 8 * * *', // Daily at 8 AM
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 180000, // 3 min for multiple source fetches
  },

  async collect(ctx) {
    const concerts = await fetchAllConcerts(ctx);

    return {
      concerts,
      location: 'Vancouver, BC',
      timeframeMonths: 12,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(concertsCollector);
