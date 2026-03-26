import { register } from '../src/registry.js';
import type { CollectorDefinition, CollectorContext } from '../src/types.js';
import { DEFAULT_RETRY_POLICY } from '../src/types.js';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string; // ISO format
  summary: string;
  categories: string[];
  authors: string[];
}

interface CloudflareBlogData {
  posts: BlogPost[];
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

// Strip CDATA wrappers
function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

// Extract text content from XML tag
function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return decodeHtmlEntities(stripCdata(match[1].trim()));
}

// Extract all instances of a tag
function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(decodeHtmlEntities(stripCdata(match[1].trim())));
  }
  return results;
}

// Parse RSS date to ISO format
function parseRssDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch {
    return dateStr;
  }
}

// Clean summary - strip HTML and truncate
function cleanSummary(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]+>/g, ' ');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Truncate if too long
  if (text.length > 500) {
    text = text.slice(0, 497) + '...';
  }
  return text;
}

async function fetchCloudflareRss(ctx: CollectorContext): Promise<BlogPost[]> {
  const response = await ctx.fetch('https://blog.cloudflare.com/rss/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  const posts: BlogPost[] = [];

  // Split by <item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');
    const categories = extractAllTags(itemXml, 'category');
    const authors = extractAllTags(itemXml, 'dc:creator');

    if (!title || !link) continue;

    posts.push({
      title,
      link,
      pubDate: parseRssDate(pubDate),
      summary: cleanSummary(description),
      categories,
      authors,
    });
  }

  // Sort by date, newest first
  posts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Return last 20 posts
  return posts.slice(0, 20);
}

const cloudflareBlogCollector: CollectorDefinition<CloudflareBlogData> = {
  id: 'cloudflare-blog',
  schedule: {
    type: 'cron',
    expression: '0 */4 * * *', // Every 4 hours
  },
  mode: 'both',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maxAttempts: 2,
    timeoutMs: 30000,
  },

  async collect(ctx) {
    const posts = await fetchCloudflareRss(ctx);

    return {
      posts,
      collectedAt: ctx.now.toISOString(),
    };
  },
};

register(cloudflareBlogCollector);
