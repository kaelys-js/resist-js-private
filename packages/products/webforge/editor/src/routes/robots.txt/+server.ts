/**
 * Dynamic robots.txt route.
 *
 * Blocks API routes, AI training crawlers while allowing standard search
 * engines and AI search assistants. Prerendered at build time.
 */

import type { RequestHandler } from './$types';

export const prerender = true;

// TODO: Proper Commenting
// TODO: Proper Response Headers (Shared With Other Routes)
// TODO: Proper Schema For Manifest

const ROBOTS = `User-agent: *
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

export const GET: RequestHandler = () => {
	return new Response(ROBOTS, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
