import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext, Env } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface PlexItem {
  title: string;
  type: 'movie' | 'show' | 'season' | 'episode';
  year?: number;
  addedAt: string;
  summary?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  index?: number;
  parentIndex?: number;
  videoResolution?: string;
}

interface PlexData {
  recentlyAdded: PlexItem[];
  serverName?: string;
  collectedAt: string;
}

interface PlexEnv extends Env {
  PLEX_TOKEN?: string;
}

interface PlexResource {
  name?: string;
  provides?: string;
  owned?: boolean;
  connections?: {
    uri?: string;
    local?: boolean;
    relay?: boolean;
    protocol?: string;
  }[];
}

interface PlexLibrary {
  key?: string;
  title?: string;
  type?: string;
}

interface PlexMetadata {
  title?: string;
  type?: string;
  year?: number;
  addedAt?: number;
  summary?: string;
  grandparentTitle?: string;
  parentTitle?: string;
  index?: number;
  parentIndex?: number;
  Media?: { videoResolution?: string }[];
}

async function getPlexServerUrl(ctx: CollectorContext, token: string, isLocal: boolean): Promise<{ url: string; name: string }> {
  const response = await ctx.fetch(
    'https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1',
    {
      headers: {
        Accept: 'application/json',
        'X-Plex-Token': token,
        'X-Plex-Client-Identifier': 'overseer-collector',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Plex API error: ${response.status}`);
  }

  const resources: PlexResource[] = await response.json();
  const server = resources.find(r => r.provides === 'server' && r.owned);

  if (!server?.connections?.length) {
    throw new Error('No Plex server found');
  }

  let connection;
  if (isLocal) {
    // Local runtime: prefer local HTTPS connection (direct to server on same network)
    connection =
      server.connections.find(c => c.protocol === 'https' && c.local && !c.relay) ||
      server.connections.find(c => c.local && !c.relay) ||
      server.connections.find(c => c.protocol === 'https' && !c.relay) ||
      server.connections.find(c => !c.relay);
  } else {
    // Cloud runtime: must use external (non-local) connections
    // Prefer: external HTTPS non-relay > relay
    connection =
      server.connections.find(c => c.protocol === 'https' && !c.local && !c.relay) ||
      server.connections.find(c => !c.local && !c.relay) ||
      server.connections.find(c => c.relay); // Relay as last resort
  }

  if (!connection?.uri) {
    throw new Error('No accessible Plex server connection (server may be local-only)');
  }

  return { url: connection.uri, name: server.name || 'Plex' };
}

async function fetchPlexLibraries(
  ctx: CollectorContext,
  serverUrl: string,
  token: string
): Promise<PlexLibrary[]> {
  const response = await ctx.fetch(`${serverUrl}/library/sections`, {
    headers: {
      Accept: 'application/json',
      'X-Plex-Token': token,
    },
  });

  if (!response.ok) {
    throw new Error(`Plex library error: ${response.status}`);
  }

  interface PlexSectionsResponse {
    MediaContainer?: { Directory?: PlexLibrary[] };
  }

  const data: PlexSectionsResponse = await response.json();
  return (data.MediaContainer?.Directory || []).filter(
    d => d.key && (d.type === 'movie' || d.type === 'show')
  );
}

async function fetchRecentlyAdded(
  ctx: CollectorContext,
  serverUrl: string,
  token: string,
  libraryKey: string
): Promise<PlexItem[]> {
  const response = await ctx.fetch(
    `${serverUrl}/library/sections/${libraryKey}/recentlyAdded?X-Plex-Container-Size=25`,
    {
      headers: {
        Accept: 'application/json',
        'X-Plex-Token': token,
      },
    }
  );

  if (!response.ok) return [];

  interface PlexRecentResponse {
    MediaContainer?: { Metadata?: PlexMetadata[] };
  }

  const data: PlexRecentResponse = await response.json();

  return (data.MediaContainer?.Metadata || []).map(item => ({
    title: item.title || 'Unknown',
    type: (item.type as PlexItem['type']) || 'movie',
    year: item.year,
    addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : ctx.now.toISOString(),
    summary: item.summary?.slice(0, 300),
    grandparentTitle: item.grandparentTitle,
    parentTitle: item.parentTitle,
    index: item.index,
    parentIndex: item.parentIndex,
    videoResolution: item.Media?.[0]?.videoResolution,
  }));
}

const plexCollector: CollectorDefinition<PlexData> = {
  id: 'plex',
  schedule: {
    type: 'cron',
    expression: '0 */2 * * *',
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 3,
    timeoutMs: 90000,
  },

  async collect(ctx) {
    const token = (ctx.env as PlexEnv).PLEX_TOKEN;
    if (!token) {
      throw new Error('PLEX_TOKEN not configured');
    }

    const isLocal = (ctx.env as PlexEnv).RUNTIME === 'local';
    const { url: serverUrl, name: serverName } = await getPlexServerUrl(ctx, token, isLocal);
    const libraries = await fetchPlexLibraries(ctx, serverUrl, token);

    const recentlyAdded: PlexItem[] = [];
    for (const lib of libraries) {
      if (lib.key) {
        const items = await fetchRecentlyAdded(ctx, serverUrl, token, lib.key);
        recentlyAdded.push(...items);
      }
    }

    recentlyAdded.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

    return {
      recentlyAdded: recentlyAdded.slice(0, 50),
      serverName,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(plexCollector);
