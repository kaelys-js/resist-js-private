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

	it('contains title with error and app name placeholders', () => {
		expect(errorHtml).toContain('{{errors.serverError}}');
		expect(errorHtml).toContain('{{APP_NAME}}');
	});

	it('contains sveltekit.error.message placeholder', () => {
		expect(errorHtml).toContain('%sveltekit.error.message%');
	});

	it('contains Go to homepage link placeholder', () => {
		expect(errorHtml).toContain('href="/"');
		expect(errorHtml).toContain('{{errors.goHome}}');
	});
});

describe('error.html WCAG accessibility', () => {
	it('has <main> landmark wrapping content', () => {
		expect(errorHtml).toContain('<main');
	});

	it('has role="alert" on error message container (not on main)', () => {
		expect(errorHtml).not.toMatch(/<main[^>]*role="alert"/);
		expect(errorHtml).toMatch(/role="alert"/);
	});

	it('has aria-live="polite" status region for copy feedback', () => {
		expect(errorHtml).toContain('role="status"');
		expect(errorHtml).toContain('aria-live="polite"');
	});

	it('copy button has aria-label', () => {
		expect(errorHtml).toMatch(/<button[^>]*aria-label=/);
	});

	it('all inline SVGs have aria-hidden="true"', () => {
		const svgCount: number = (errorHtml.match(/<svg[\s\S]*?>/g) ?? []).length;
		const hiddenCount: number = (errorHtml.match(/<svg[^>]*aria-hidden="true"/g) ?? []).length;
		expect(hiddenCount).toBe(svgCount);
	});

	it('all inline SVGs have focusable="false"', () => {
		const svgCount: number = (errorHtml.match(/<svg[\s\S]*?>/g) ?? []).length;
		const focusableCount: number = (errorHtml.match(/<svg[^>]*focusable="false"/g) ?? []).length;
		expect(focusableCount).toBe(svgCount);
	});

	it('has focus-visible styles', () => {
		expect(errorHtml).toContain(':focus-visible');
	});

	it('respects prefers-reduced-motion', () => {
		expect(errorHtml).toContain('prefers-reduced-motion');
	});

	it('supports forced-colors mode', () => {
		expect(errorHtml).toContain('forced-colors: active');
	});

	it('does not have user-select: none on body', () => {
		const bodyMatch: RegExpMatchArray | null = errorHtml.match(/body\s*\{[^}]*user-select:\s*none/);
		expect(bodyMatch).toBeNull();
	});

	it('viewport meta does not restrict zoom', () => {
		expect(errorHtml).not.toContain('maximum-scale');
		expect(errorHtml).not.toContain('user-scalable=no');
	});
});

describe('error.html script robustness', () => {
	it('does not expose globals via window assignment', () => {
		expect(errorHtml).not.toContain('window.');
	});

	it('does not use inline onclick handlers', () => {
		expect(errorHtml).not.toMatch(/onclick="/);
	});

	it('attaches click handler via addEventListener', () => {
		expect(errorHtml).toContain("addEventListener('click'");
	});

	it('wraps entire IIFE body in try/catch', () => {
		expect(errorHtml).toMatch(/\(function\s*\(\)\s*\{\s*try\s*\{/);
	});

	it('logs errors to console in outer catch', () => {
		expect(errorHtml).toMatch(/catch\s*\([^)]+\)\s*\{\s*console\.error\(/);
	});

	it('has error X icon SVG for clipboard failure', () => {
		expect(errorHtml).toContain('id="error-icon"');
	});

	it('error icon has aria-hidden and focusable attributes', () => {
		const errorIconMatch: RegExpMatchArray | null = errorHtml.match(
			/<svg[^>]*id="error-icon"[^>]*>/,
		);
		expect(errorIconMatch).not.toBeNull();
		expect(errorIconMatch![0]).toContain('aria-hidden="true"');
		expect(errorIconMatch![0]).toContain('focusable="false"');
	});

	it('has CSS for error state styling', () => {
		expect(errorHtml).toContain('.error-icon');
	});

	it('copyToClipboard uses callback for success/failure', () => {
		expect(errorHtml).toMatch(/function copyToClipboard\(str,\s*onDone\)/);
	});

	it('script has multiple console.error calls', () => {
		const scriptMatch: RegExpMatchArray | null = errorHtml.match(/<script>([\s\S]*?)<\/script>/);
		expect(scriptMatch).not.toBeNull();
		const script: string = scriptMatch![1]!;
		const errorCalls: RegExpMatchArray | null = script.match(/console\.error\(/g);
		expect(errorCalls).not.toBeNull();
		expect(errorCalls!.length).toBeGreaterThanOrEqual(2);
	});

	it('has copyFailed placeholder for error state text', () => {
		expect(errorHtml).toContain('{{errors.copyFailed}}');
	});

	it('console error prefix uses APP_NAME placeholder', () => {
		expect(errorHtml).toContain("'[{{APP_NAME}}]");
	});
});
