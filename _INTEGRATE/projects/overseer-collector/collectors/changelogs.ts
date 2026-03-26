import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

// Source configuration - add new sources here
interface ChangelogSource {
  id: string;
  name: string;
  collect: (ctx: CollectorContext) => Promise<ChangelogEntry[]>;
}

interface ChangelogEntry {
  sourceId: string;
  version?: string;
  title: string;
  date?: string;
  url?: string;
  changes: string[]; // Actual changes, not just a link
}

interface ChangelogsData {
  entries: ChangelogEntry[];
  sources: { id: string; name: string; count: number; error?: string }[];
  collectedAt: string;
}

// HTML entity decoder
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

// Fetch with timeout
async function fetchWithTimeout(
  ctx: CollectorContext,
  url: string,
  options: { accept?: string; timeoutMs?: number } = {}
): Promise<string> {
  const { accept = 'text/html', timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ctx.fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': accept,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

// Parse GitHub API releases response
interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  body?: string;
}

// Parse markdown changelog into changes array
function parseMarkdownChanges(body: string): string[] {
  const changes: string[] = [];
  const lines = body.split('\n');

  for (const line of lines) {
    // Match list items: - fix: something or * something
    const match = line.match(/^[\s]*[-*]\s+(.+)/);
    if (match) {
      // Clean up the change text
      let change = match[1]
        .replace(/\[#\d+\]\([^)]+\)/g, '') // Remove [#123](url) issue links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](url) to just text
        .replace(/\(#\d+\)/g, '') // Remove (#12345) issue refs
        .replace(/\([a-f0-9]{7,}\)/g, '') // Remove (abc1234) commit hashes
        .replace(/\(\s*\)/g, '') // Remove empty parens ()
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold **text**
        .replace(/`([^`]+)`/g, '$1') // Remove code backticks
        .replace(/\s+/g, ' ')
        .trim();

      // Skip section headers like "### Bug Fixes"
      if (change.startsWith('#')) continue;

      if (change.length > 10 && change.length < 200) {
        changes.push(change);
      }
    }
  }

  return changes.slice(0, 20); // Limit to 20 changes per release
}

async function collectGitHubReleases(
  ctx: CollectorContext,
  repo: string,
  sourceId: string
): Promise<ChangelogEntry[]> {
  const url = `https://api.github.com/repos/${repo}/releases`;
  const json = await fetchWithTimeout(ctx, url, { accept: 'application/json' });
  const releases: GitHubRelease[] = JSON.parse(json);

  return releases.slice(0, 5).map((release) => ({
    sourceId,
    version: release.tag_name,
    title: release.name || release.tag_name,
    date: release.published_at?.split('T')[0],
    url: release.html_url,
    changes: parseMarkdownChanges(release.body || ''),
  }));
}

// Collect Vite changelog from raw CHANGELOG.md
async function collectViteChangelog(ctx: CollectorContext): Promise<ChangelogEntry[]> {
  const url = 'https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md';
  const md = await fetchWithTimeout(ctx, url);

  const entries: ChangelogEntry[] = [];

  // Split by version headers: ## [8.0.0-beta.10](...) (2026-01-24)
  const versionRegex = /^## \[([^\]]+)\]\(([^)]+)\) \((\d{4}-\d{2}-\d{2})\)/gm;
  const sections = md.split(/^## \[/m).slice(1); // Skip content before first version

  for (const section of sections.slice(0, 5)) {
    const headerMatch = section.match(/^([^\]]+)\]\(([^)]+)\) \((\d{4}-\d{2}-\d{2})\)/);
    if (!headerMatch) continue;

    const version = headerMatch[1];
    const url = headerMatch[2];
    const date = headerMatch[3];

    const changes = parseMarkdownChanges(section);

    entries.push({
      sourceId: 'vite',
      version,
      title: `Vite ${version}`,
      date,
      url,
      changes,
    });
  }

  return entries;
}

// Collect Svelte changelog
async function collectSvelteChangelog(ctx: CollectorContext): Promise<ChangelogEntry[]> {
  return collectGitHubReleases(ctx, 'sveltejs/svelte', 'svelte');
}

// Collect Cloudflare changelog - single entry with recent changes
async function collectCloudflareChangelog(ctx: CollectorContext): Promise<ChangelogEntry[]> {
  const url = 'https://developers.cloudflare.com/changelog/';
  const html = await fetchWithTimeout(ctx, url);

  const changes: string[] = [];
  const dates: string[] = [];

  // Match changelog links like /changelog/2026-01-26-waf-release/
  const linkRegex = /href="(\/changelog\/(\d{4}-\d{2}-\d{2})-([^"\/]+)\/)"/g;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const date = match[2];
    const slug = match[3];

    // Convert slug to readable title
    const title = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    changes.push(`${date}: ${title}`);
    if (!dates.includes(date)) dates.push(date);

    if (changes.length >= 15) break;
  }

  if (changes.length === 0) return [];

  return [{
    sourceId: 'cloudflare',
    title: 'Cloudflare Changelog',
    date: dates[0], // Most recent date
    url: 'https://developers.cloudflare.com/changelog/',
    changes,
  }];
}

// Collect Tinfoil version
async function collectTinfoilChangelog(ctx: CollectorContext): Promise<ChangelogEntry[]> {
  const url = 'https://tinfoil.io/Download';
  const html = await fetchWithTimeout(ctx, url);

  // Look for version in headers like "Tinfoil v20.0"
  const versionMatch = html.match(/Tinfoil\s+v?([\d.]+)/i);
  if (!versionMatch) return [];

  const version = versionMatch[1];

  // Extract feature list if available
  const changes: string[] = [];
  const featureRegex = /<li><i[^>]*><\/i>\s*([^<]+)<\/li>/gi;
  let match;

  while ((match = featureRegex.exec(html)) !== null) {
    const feature = match[1].trim();
    if (feature.length > 5 && feature.length < 200) {
      changes.push(feature);
    }
    if (changes.length >= 10) break;
  }

  return [{
    sourceId: 'tinfoil',
    version,
    title: `Tinfoil ${version}`,
    url: 'https://tinfoil.io/Download',
    changes: changes.length > 0 ? changes : [`Current version: ${version}`],
  }];
}

// Collect PS5 system software
// Note: PlayStation doesn't publish detailed changelogs, just version numbers
async function collectPS5Changelog(ctx: CollectorContext): Promise<ChangelogEntry[]> {
  const url = 'https://www.playstation.com/en-us/support/hardware/ps5/system-software/';
  const html = await fetchWithTimeout(ctx, url);

  // Find version - look for patterns like "24.06-10.40.00.04-00.00.00.0.1"
  const versionMatch = html.match(/(\d{2}\.\d{2}[-.\d]+)/);
  if (!versionMatch) return [];

  const version = versionMatch[1];

  // PlayStation typically only says "stability improvements" in updates
  // No detailed changelog is provided
  return [{
    sourceId: 'ps5',
    version,
    title: `PS5 System Software ${version}`,
    url,
    changes: [
      'System software stability improvements',
      'Performance enhancements',
      'See PlayStation support for details',
    ],
  }];
}

// Collect Apple release notes with actual content
async function collectAppleChangelog(
  ctx: CollectorContext,
  platform: string,
  sourceId: string
): Promise<ChangelogEntry[]> {
  // First get the list of versions
  const listUrl = 'https://support.apple.com/en-us/100100';
  const listHtml = await fetchWithTimeout(ctx, listUrl);

  // Match version entries with codename support for macOS
  const versionRegex = new RegExp(
    `<a[^>]*href="([^"]*)"[^>]*>\\s*${platform}\\s*(?:[A-Za-z]+\\s+)?([\\d.]+)`,
    'gi'
  );

  const entries: ChangelogEntry[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = versionRegex.exec(listHtml)) !== null && entries.length < 3) {
    const version = match[2];
    if (seen.has(version)) continue;
    seen.add(version);

    let detailUrl = match[1];
    if (!detailUrl.startsWith('http')) {
      detailUrl = `https://support.apple.com${detailUrl}`;
    }

    // Fetch the actual release notes page
    try {
      const detailHtml = await fetchWithTimeout(ctx, detailUrl, { timeoutMs: 10000 });
      const changes: string[] = [];

      // Extract security fixes and changes
      // Pattern: <p class="gb-paragraph">Description: ...</p>
      const descRegex = /<p[^>]*class="[^"]*gb-paragraph[^"]*"[^>]*>([^<]*(?:Description:|Impact:|fix|issue|improve|update|add)[^<]*)<\/p>/gi;
      let descMatch;

      while ((descMatch = descRegex.exec(detailHtml)) !== null) {
        let desc = stripHtml(descMatch[1]).trim();
        // Clean up "Description: " prefix
        desc = desc.replace(/^Description:\s*/i, '');
        if (desc.length > 15 && desc.length < 300) {
          changes.push(desc);
        }
        if (changes.length >= 15) break;
      }

      // If no description paragraphs, try list items
      if (changes.length === 0) {
        const listRegex = /<li[^>]*class="[^"]*gb-list[^"]*"[^>]*>.*?<p[^>]*>([^<]+)<\/p>/gi;
        while ((listMatch = listRegex.exec(detailHtml)) !== null) {
          const item = stripHtml(listMatch[1]).trim();
          if (item.length > 10 && item.length < 300) {
            changes.push(item);
          }
          if (changes.length >= 10) break;
        }
      }

      entries.push({
        sourceId,
        version,
        title: `${platform} ${version}`,
        url: detailUrl,
        changes: changes.length > 0 ? changes : [`${platform} ${version} release`],
      });
    } catch {
      // If detail fetch fails, still add entry with basic info
      entries.push({
        sourceId,
        version,
        title: `${platform} ${version}`,
        url: detailUrl,
        changes: [`${platform} ${version} release - see link for details`],
      });
    }
  }

  return entries;
}

// Define all changelog sources
const CHANGELOG_SOURCES: ChangelogSource[] = [
  {
    id: 'svelte',
    name: 'Svelte',
    collect: collectSvelteChangelog,
  },
  {
    id: 'vite',
    name: 'Vite',
    collect: collectViteChangelog,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    collect: collectCloudflareChangelog,
  },
  {
    id: 'tinfoil',
    name: 'Tinfoil',
    collect: collectTinfoilChangelog,
  },
  {
    id: 'ps5',
    name: 'PS5',
    collect: collectPS5Changelog,
  },
  {
    id: 'ios',
    name: 'iOS',
    collect: (ctx) => collectAppleChangelog(ctx, 'iOS', 'ios'),
  },
  {
    id: 'macos',
    name: 'macOS',
    collect: (ctx) => collectAppleChangelog(ctx, 'macOS', 'macos'),
  },
  {
    id: 'tvos',
    name: 'tvOS',
    collect: (ctx) => collectAppleChangelog(ctx, 'tvOS', 'tvos'),
  },
  {
    id: 'watchos',
    name: 'watchOS',
    collect: (ctx) => collectAppleChangelog(ctx, 'watchOS', 'watchos'),
  },
];

// Variable for regex match
let listMatch: RegExpExecArray | null;

const changelogsCollector: CollectorDefinition<ChangelogsData> = {
  id: 'changelogs',
  schedule: {
    type: 'cron',
    expression: '0 */6 * * *', // Every 6 hours
  },
  mode: 'both', // Uses fetch, works anywhere
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 120000, // 2 min total (multiple fetches with detail pages)
  },

  async collect(ctx) {
    const entries: ChangelogEntry[] = [];
    const sources: ChangelogsData['sources'] = [];

    // Fetch all sources in parallel
    const results = await Promise.allSettled(
      CHANGELOG_SOURCES.map(async (source) => {
        try {
          const sourceEntries = await source.collect(ctx);
          return { source, entries: sourceEntries };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { source, entries: [], error: message };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { source, entries: sourceEntries, error } = result.value;
        entries.push(...sourceEntries);
        sources.push({
          id: source.id,
          name: source.name,
          count: sourceEntries.length,
          error,
        });
      } else {
        console.error(`[changelogs] Unexpected rejection:`, result.reason);
      }
    }

    console.log(`[changelogs] Collected ${entries.length} entries from ${sources.length} sources`);

    return {
      entries,
      sources,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(changelogsCollector);

// Export for testing/extension
export { CHANGELOG_SOURCES };
export type { ChangelogSource, ChangelogEntry };
