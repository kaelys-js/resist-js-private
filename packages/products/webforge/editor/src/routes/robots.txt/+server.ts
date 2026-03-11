/**
 * Dynamic robots.txt route.
 *
 * Blocks API routes and AI training crawlers while allowing standard search
 * engines and AI search assistants. Prerendered at build time.
 *
 * Policy:
 * - Standard search engines (Googlebot, Bingbot, etc.): allowed everywhere except `/api/`
 * - AI search assistants (ChatGPT-User, Claude-Web): allowed (surface in AI search results)
 * - AI training crawlers (GPTBot, anthropic-ai, CCBot, etc.): fully blocked
 *
 * @module
 */

import * as v from 'valibot';
import type { RequestHandler } from './$types';

export const prerender = true;

/** Schema for validating the robots.txt content is a non-empty string. */
const RobotsTxtSchema = v.pipe(v.string(), v.minLength(1));

/** Robots.txt content — validated against {@link RobotsTxtSchema} at module load. */
const ROBOTS: v.InferOutput<typeof RobotsTxtSchema> = `User-agent: *
Disallow: /api/
Allow: /

# AI search assistants — allowed (surface in AI-powered search results)
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

# AI training crawlers — blocked (do not use content for model training)
User-agent: GPTBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: cohere-ai
Disallow: /
`;

/**
 * Returns the robots.txt response with proper cache headers.
 *
 * @returns Plain text response with `text/plain` content type
 */
export const GET: RequestHandler = () => {
  return new Response(ROBOTS, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
