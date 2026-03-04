import { describe, expect, it } from 'vitest';
import {
	deriveErrorIdPrefix,
	generateFontFaceCss,
	resolveErrorHtml,
	templateErrorHtml,
} from './vite-plugin-template-html';

describe('templateErrorHtml plugin', () => {
	it('returns a Vite plugin object with correct name', () => {
		const plugin = templateErrorHtml();
		expect(plugin.name).toBe('template-error-html');
	});

	it('applies only to build mode', () => {
		const plugin = templateErrorHtml();
		expect(plugin.apply).toBe('build');
	});

	it('enforces pre-ordering to run before SvelteKit', () => {
		const plugin = templateErrorHtml();
		expect(plugin.enforce).toBe('pre');
	});

	it('uses config hook instead of buildStart', () => {
		const plugin = templateErrorHtml();
		expect(plugin.config).toBeTypeOf('function');
	});
});

describe('generateFontFaceCss', () => {
	it('generates @font-face declarations for all FONT_FACES entries', () => {
		const css = generateFontFaceCss();
		expect(css).toContain("font-family: 'Inter'");
		expect(css).toContain("font-family: 'Rajdhani'");
		expect(css).toContain('font-weight: 100 900');
		expect(css).toContain('font-display: swap');
		expect(css).toContain("format('woff2')");
		expect(css).toContain('/fonts/inter-latin.woff2');
		expect(css).toContain('/fonts/rajdhani-latin-600.woff2');
		expect(css).toContain('/fonts/rajdhani-latin-700.woff2');
	});

	it('produces valid @font-face blocks', () => {
		const css = generateFontFaceCss();
		const blockCount = (css.match(/@font-face/g) ?? []).length;
		expect(blockCount).toBe(3);
	});
});

describe('deriveErrorIdPrefix', () => {
	it('extracts prefix before {id} placeholder', () => {
		expect(deriveErrorIdPrefix('Reference: {id}')).toBe('Reference: ');
	});

	it('returns full string when no {id} placeholder exists', () => {
		expect(deriveErrorIdPrefix('No placeholder here')).toBe('No placeholder here');
	});

	it('handles empty prefix', () => {
		expect(deriveErrorIdPrefix('{id}')).toBe('');
	});
});

describe('resolveErrorHtml', () => {
	const TEMPLATE = `<!doctype html>
<html>
<head><title>{{errors.serverError}} | {{APP_NAME}}</title></head>
<style>{{FONT_FACE_CSS}} body { font-family: {{FONT_FAMILIES}}; }</style>
<body>
<h1>{{errors.serverError}}</h1>
<p>{{errors.serverErrorDescription}}</p>
<a>{{errors.goHome}}</a>
<button aria-label="{{errors.copyErrorId}}">Copy</button>
<script>
var prefix = '{{errors.errorIdPrefix}}';
var copied = '{{errors.copied}}';
</script>
</body>
</html>`;

	it('replaces all known placeholders', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).not.toContain('{{');
		expect(result).not.toContain('}}');
	});

	it('inserts APP_NAME from app-meta', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).toContain('Storyline');
	});

	it('inserts font-family stack', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).toContain("'Inter'");
		expect(result).toContain('ui-sans-serif');
	});

	it('inserts @font-face CSS', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).toContain('@font-face');
		expect(result).toContain('/fonts/inter-latin.woff2');
	});

	it('inserts English error strings', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).toContain('Something went wrong');
		expect(result).toContain('Go to homepage');
		expect(result).toContain('Copied!');
	});

	it('derives error ID prefix from parameterized locale string', () => {
		const result = resolveErrorHtml(TEMPLATE);
		expect(result).toContain("var prefix = 'Reference: '");
	});
});
