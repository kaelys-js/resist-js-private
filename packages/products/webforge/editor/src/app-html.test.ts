import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { storageKey } from '$lib/config/app-meta';

const appHtml: string = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), 'app.html'),
	'utf8',
);

describe('app.html script robustness', () => {
	it('wraps IIFE body in try/catch', () => {
		expect(appHtml).toMatch(/\(function\s*\(\)\s*\{\s*try\s*\{/);
	});

	it('logs errors to console in catch block', () => {
		expect(appHtml).toMatch(/catch\s*\([^)]+\)\s*\{\s*console\.error\(/);
	});

	it('console error prefix uses APP_NAME placeholder', () => {
		expect(appHtml).toContain("'[{{APP_NAME}}]");
	});

	it('reads theme preference from namespaced localStorage key', () => {
		expect(appHtml).toContain(`localStorage.getItem('${storageKey('mode')}')`);
		expect(appHtml).not.toContain('mode-watcher-mode');
	});
});

describe('app.html meta tags use placeholders', () => {
	it('apple-mobile-web-app-title uses APP_NAME placeholder', () => {
		expect(appHtml).toMatch(/name="apple-mobile-web-app-title"[^>]*content="{{APP_NAME}}"/);
	});

	it('does not contain hardcoded app name in meta content attributes', () => {
		// Meta content attributes should use placeholders, not hardcoded values
		const metaContents: RegExpMatchArray | null = appHtml.match(/<meta[^>]*content="([^"]+)"/g);
		if (metaContents) {
			for (const meta of metaContents) {
				// Skip viewport, color-scheme, robots, format-detection, mobile-web-app-capable, status-bar-style
				if (/content="(width|light dark|noindex|telephone|yes|default|{{)/.test(meta)) continue;
				expect(meta).not.toContain('Storylyne');
			}
		}
	});
});
