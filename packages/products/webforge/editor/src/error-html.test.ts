import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const errorHtml: string = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), 'error.html'),
	'utf8',
);

describe('error.html static fallback', () => {
	it('contains charset utf-8', () => {
		expect(errorHtml).toContain('<meta charset="utf-8"');
	});

	it('contains viewport meta', () => {
		expect(errorHtml).toContain('<meta name="viewport"');
		expect(errorHtml).toContain('width=device-width');
	});

	it('contains color-scheme meta', () => {
		expect(errorHtml).toContain('<meta name="color-scheme" content="light dark"');
	});

	it('contains robots noindex nofollow', () => {
		expect(errorHtml).toContain('<meta name="robots" content="noindex, nofollow"');
	});

	it('contains SVG favicon link', () => {
		expect(errorHtml).toContain('rel="icon"');
		expect(errorHtml).toContain('type="image/svg+xml"');
	});

	it('contains ICO favicon link', () => {
		expect(errorHtml).toContain('href="/favicon.ico"');
		expect(errorHtml).toContain('sizes="32x32"');
	});

	it('contains apple-touch-icon link', () => {
		expect(errorHtml).toContain('rel="apple-touch-icon"');
		expect(errorHtml).toContain('href="/apple-touch-icon.png"');
	});

	it('contains manifest link', () => {
		expect(errorHtml).toContain('rel="manifest"');
		expect(errorHtml).toContain('href="/manifest.webmanifest"');
	});

	it('contains title with friendly text and app name', () => {
		expect(errorHtml).toContain('Something went wrong');
		expect(errorHtml).toContain('Storyline');
	});

	it('contains sveltekit.error.message placeholder', () => {
		expect(errorHtml).toContain('%sveltekit.error.message%');
	});

	it('contains Go to homepage link', () => {
		expect(errorHtml).toContain('href="/"');
		expect(errorHtml).toContain('Go to homepage');
	});
});
