/**
 * Vite plugins that template HTML files at build/dev time.
 *
 * `templateErrorHtml` — Build-only. Replaces `{{placeholders}}` in
 * `error.html` with values from the provided config (app name,
 * fonts, locale strings).
 *
 * `templateAppHtml` — Build-only. Replaces `{{APP_NAME}}` and
 * `{{STORAGE_PREFIX}}` in `app.html` with the provided config values.
 *
 * Both restore original template content after build or on process exit.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import type { Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Config types                                                       */
/* ------------------------------------------------------------------ */

/** A single @font-face entry for CSS generation. */
export interface FontFaceEntry {
  /** Font family name (e.g. 'Inter'). */
  family: Str;
  /** Font style (e.g. 'normal', 'italic'). */
  style: Str;
  /** Font weight (e.g. '400', '100 900'). */
  weight: Str;
  /** Path to the font file (e.g. '/fonts/inter-latin.woff2'). */
  src: Str;
}

/** Configuration for the error HTML template plugin. */
export interface ErrorHtmlConfig {
  /** Application display name. */
  appName: Str;
  /** CSS font-family stack string. */
  fontFamilies: Str;
  /** Font face entries for inline @font-face CSS. */
  fontFaces: FontFaceEntry[];
  /** Absolute path to the error.html template file. */
  templatePath: Str;
  /** Locale strings for the error page. */
  locale: {
    /** Server error heading (e.g. "Something went wrong"). */
    serverError: Str;
    /** Server error description text. */
    serverErrorDescription: Str;
    /** "Go home" link text. */
    goHome: Str;
    /** "Copied!" feedback text. */
    copied: Str;
    /** "Copy failed" feedback text. */
    copyFailed: Str;
    /** "Copy error ID" button label. */
    copyErrorId: Str;
    /** Error ID template with `{id}` placeholder (e.g. "Reference: {id}"). */
    errorId: Str;
  };
}

/** Configuration for the app HTML template plugin. */
export interface AppHtmlConfig {
  /** Application display name. */
  appName: Str;
  /** Absolute path to the app.html template file. */
  templatePath: Str;
  /** localStorage key prefix (defaults to `appName.toLowerCase()`). */
  storagePrefix?: Str;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Generates inline `@font-face` CSS from font face entries.
 *
 * @param fontFaces - Array of font face entries
 * @returns CSS string containing all @font-face declarations
 *
 * @example
 * generateFontFaceCss([{ family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter.woff2' }])
 * // @font-face { font-family: 'Inter'; ... }
 */
export function generateFontFaceCss(fontFaces: FontFaceEntry[]): Str {
  return fontFaces
    .map(
      (f) =>
        `@font-face {\n\tfont-family: '${f.family}';\n\tfont-style: ${f.style};\n\tfont-weight: ${f.weight};\n\tfont-display: swap;\n\tsrc: url('${f.src}') format('woff2');\n}`,
    )
    .join('\n');
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
 * @param config - Error HTML configuration with app name, fonts, and locale
 * @returns Resolved HTML with all placeholders replaced
 */
export function resolveErrorHtml(template: Str, config: ErrorHtmlConfig): Str {
  const replacements: Record<Str, Str> = {
    '{{APP_NAME}}': config.appName,
    '{{FONT_FAMILIES}}': config.fontFamilies,
    '{{FONT_FACE_CSS}}': generateFontFaceCss(config.fontFaces),
    '{{errors.serverError}}': config.locale.serverError,
    '{{errors.serverErrorDescription}}': config.locale.serverErrorDescription,
    '{{errors.goHome}}': config.locale.goHome,
    '{{errors.copied}}': config.locale.copied,
    '{{errors.copyFailed}}': config.locale.copyFailed,
    '{{errors.copyErrorId}}': config.locale.copyErrorId,
    '{{errors.errorIdPrefix}}': deriveErrorIdPrefix(config.locale.errorId),
  };

  let result = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }
  return result;
}

/**
 * Resolves `{{APP_NAME}}` and `{{STORAGE_PREFIX}}` in app.html template content.
 *
 * @param template - Raw app.html content with `{{APP_NAME}}` and `{{STORAGE_PREFIX}}`
 * @param config - App HTML configuration with app name and optional storage prefix
 * @returns Resolved HTML with all placeholders replaced
 */
export function resolveAppHtml(template: Str, config: AppHtmlConfig): Str {
  const prefix: Str = config.storagePrefix ?? config.appName.toLowerCase();
  return template
    .replaceAll('{{APP_NAME}}', config.appName)
    .replaceAll('{{STORAGE_PREFIX}}', prefix);
}

/* ------------------------------------------------------------------ */
/*  Plugins                                                            */
/* ------------------------------------------------------------------ */

/**
 * Vite plugin that templates error.html at build time.
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
 * @param config - Error HTML configuration with app name, fonts, locale, and template path
 * @returns Vite plugin instance
 */
export function templateErrorHtml(config: ErrorHtmlConfig): Plugin {
  let originalContent: string | null = null;
  const errorHtmlPath: Str = config.templatePath;

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

    config(_viteConfig, env) {
      if (env.command !== 'build') return;
      originalContent = readFileSync(errorHtmlPath, 'utf8');
      const resolved = resolveErrorHtml(originalContent, config);
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
 * Vite plugin that templates app.html at build time.
 *
 * Replaces `{{APP_NAME}}` and `{{STORAGE_PREFIX}}` so meta tags, console
 * prefixes, and localStorage keys derive from config instead of being hardcoded.
 *
 * Build-only — in dev mode, raw placeholders are acceptable since
 * the meta tag is cosmetic and the catch block rarely triggers.
 *
 * @param config - App HTML configuration with app name, template path, and optional storage prefix
 * @returns Vite plugin instance
 */
export function templateAppHtml(config: AppHtmlConfig): Plugin {
  let originalContent: string | null = null;
  const appHtmlPath: Str = config.templatePath;

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

    config(_viteConfig, env) {
      if (env.command !== 'build') return;
      originalContent = readFileSync(appHtmlPath, 'utf8');
      const resolved = resolveAppHtml(originalContent, config);
      writeFileSync(appHtmlPath, resolved, 'utf8');

      process.on('exit', restore);
    },

    closeBundle() {
      restore();
      process.removeListener('exit', restore);
    },
  };
}
