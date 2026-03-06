/**
 * Vite plugins that template HTML files at build/dev time.
 *
 * `templateErrorHtml` — Build-only. Replaces `{{placeholders}}` in
 * `src/error.html` with values from `app-meta.ts` and `locales/en.ts`.
 *
 * `templateAppHtml` — Build-only. Replaces `{{APP_NAME}}` in
 * `src/app.html` with the app name from `app-meta.ts`.
 *
 * Both restore original template content after build or on process exit.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { Str } from '@/schemas/common';

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
export function generateFontFaceCss(): Str {
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
export function deriveErrorIdPrefix(template: Str): Str {
	const idx = template.indexOf('{id}');
	return idx >= 0 ? template.slice(0, idx) : template;
}

/**
 * Resolves all `{{placeholders}}` in error.html template content.
 *
 * @param template - Raw error.html content with `{{placeholders}}`
 * @returns Resolved HTML with all placeholders replaced
 */
export function resolveErrorHtml(template: Str): Str {
	const replacements: Record<Str, Str> = {
		'{{APP_NAME}}': APP_NAME,
		'{{FONT_FAMILIES}}': FONT_FAMILIES,
		'{{FONT_FACE_CSS}}': generateFontFaceCss(),
		'{{errors.serverError}}': en.errors.serverError,
		'{{errors.serverErrorDescription}}': en.errors.serverErrorDescription,
		'{{errors.goHome}}': en.errors.goHome,
		'{{errors.copied}}': en.errors.copied,
		'{{errors.copyFailed}}': en.errors.copyFailed,
		'{{errors.copyErrorId}}': en.errors.copyErrorId,
		'{{errors.errorIdPrefix}}': deriveErrorIdPrefix(en.errors.errorId),
	};

	let result = template;
	for (const [placeholder, value] of Object.entries(replacements)) {
		result = result.replaceAll(placeholder, value);
	}
	return result;
}

/**
 * Resolves `{{APP_NAME}}` in app.html template content.
 *
 * @param template - Raw app.html content with `{{APP_NAME}}`
 * @returns Resolved HTML with placeholder replaced
 */
export function resolveAppHtml(template: Str): Str {
	return template.replaceAll('{{APP_NAME}}', APP_NAME);
}

// ── Plugins ──────────────────────────────────────────────────────────────────

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

		config(_config, env) {
			if (env.command !== 'build') return;
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

/**
 * Vite plugin that templates `src/app.html` at build time.
 *
 * Replaces `{{APP_NAME}}` so the meta tag and console.error prefix
 * derive from `app-meta.ts` instead of being hardcoded.
 *
 * Build-only — in dev mode, raw `{{APP_NAME}}` is acceptable since
 * the meta tag is cosmetic and the catch block rarely triggers.
 *
 * @returns Vite plugin instance
 */
export function templateAppHtml(): Plugin {
	let originalContent: string | null = null;
	let appHtmlPath = '';

	function restore(): void {
		if (originalContent !== null && appHtmlPath) {
			writeFileSync(appHtmlPath, originalContent, 'utf8');
			originalContent = null;
		}
	}

	return {
		name: 'template-app-html',
		apply: 'build',
		enforce: 'pre',

		config(_config, env) {
			if (env.command !== 'build') return;
			appHtmlPath = resolve(import.meta.dirname ?? '.', 'src/app.html');
			originalContent = readFileSync(appHtmlPath, 'utf8');
			const resolved = resolveAppHtml(originalContent);
			writeFileSync(appHtmlPath, resolved, 'utf8');

			process.on('exit', restore);
		},

		closeBundle() {
			restore();
			process.removeListener('exit', restore);
		},
	};
}
