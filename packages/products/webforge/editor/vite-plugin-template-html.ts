/**
 * Vite plugin that templates error.html at build time.
 *
 * Replaces `{{placeholders}}` in `src/error.html` with values from
 * `app-meta.ts` (app identity, font config) and `locales/en.ts`
 * (English error strings). The original template is restored after build.
 *
 * In dev mode the plugin is a no-op — error.html is rarely triggered
 * during development and raw `{{placeholders}}` are acceptable.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

import { APP_NAME, FONT_FACES, FONT_FAMILIES } from './src/lib/config/app-meta.js';
import { en } from './src/lib/locales/en.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates inline `@font-face` CSS from the FONT_FACES config.
 *
 * @returns CSS string containing all @font-face declarations
 *
 * @example
 * generateFontFaceCss()
 * // @font-face { font-family: 'Inter'; ... }
 */
export function generateFontFaceCss(): string {
	return FONT_FACES.map(
		(f) =>
			`@font-face {\n\tfont-family: '${f.family}';\n\tfont-style: ${f.style};\n\tfont-weight: ${f.weight};\n\tfont-display: swap;\n\tsrc: url('${f.src}') format('woff2');\n}`,
	).join('\n');
}

/**
 * Derives the error ID prefix from the parameterized locale string.
 * e.g. `"Reference: {id}"` → `"Reference: "`
 *
 * @param template - Parameterized locale string containing `{id}` placeholder
 * @returns The prefix portion before `{id}`
 *
 * @example
 * deriveErrorIdPrefix('Reference: {id}') // "Reference: "
 */
export function deriveErrorIdPrefix(template: string): string {
	const idx = template.indexOf('{id}');
	return idx >= 0 ? template.slice(0, idx) : template;
}

/**
 * Resolves all `{{placeholders}}` in error.html template content.
 *
 * @param template - Raw error.html content with `{{placeholders}}`
 * @returns Resolved HTML with all placeholders replaced
 */
export function resolveErrorHtml(template: string): string {
	const replacements: Record<string, string> = {
		'{{APP_NAME}}': APP_NAME,
		'{{FONT_FAMILIES}}': FONT_FAMILIES,
		'{{FONT_FACE_CSS}}': generateFontFaceCss(),
		'{{errors.serverError}}': en.errors.serverError,
		'{{errors.serverErrorDescription}}': en.errors.serverErrorDescription,
		'{{errors.goHome}}': en.errors.goHome,
		'{{errors.copied}}': en.errors.copied,
		'{{errors.errorIdPrefix}}': deriveErrorIdPrefix(en.errors.errorId),
	};

	let result = template;
	for (const [placeholder, value] of Object.entries(replacements)) {
		result = result.replaceAll(placeholder, value);
	}
	return result;
}

// ── Plugin ───────────────────────────────────────────────────────────────────

/**
 * Vite plugin that templates `src/error.html` at build time.
 *
 * Uses `enforce: 'pre'` and the `config()` hook so that placeholders are
 * resolved BEFORE SvelteKit's own `config()` hook reads error.html via
 * `sync.all()` → `load_error_page()`.
 *
 * - `config`: Reads template, resolves placeholders, writes resolved HTML
 * - `closeBundle`: Restores original template content
 *
 * No-op in dev mode (serve).
 *
 * @returns Vite plugin instance
 */
export function templateErrorHtml(): Plugin {
	let originalContent: string | null = null;
	let errorHtmlPath = '';

	function restore(): void {
		if (originalContent !== null && errorHtmlPath) {
			writeFileSync(errorHtmlPath, originalContent, 'utf8');
			originalContent = null;
		}
	}

	return {
		name: 'template-error-html',
		apply: 'build',
		enforce: 'pre',

		config() {
			errorHtmlPath = resolve(import.meta.dirname ?? '.', 'src/error.html');
			originalContent = readFileSync(errorHtmlPath, 'utf8');
			const resolved = resolveErrorHtml(originalContent);
			writeFileSync(errorHtmlPath, resolved, 'utf8');

			// Safety net: restore on abrupt process exit (e.g. Ctrl+C, SIGTERM)
			process.on('exit', restore);
		},

		closeBundle() {
			restore();
			process.removeListener('exit', restore);
		},
	};
}
