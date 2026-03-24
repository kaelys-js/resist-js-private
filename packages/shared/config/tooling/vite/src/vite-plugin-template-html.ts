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

import * as v from 'valibot';
import type { Plugin, UserConfig, ConfigEnv } from 'vite';

import {
  PathSchema,
  NameSchema,
  LocaleStringSchema,
  CssFontFamilySchema,
  CssFontWeightSchema,
  type NonNegativeInteger,
  type NullableStr,
  type Num,
  type Path,
  type Str,
  type Void,
} from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';
import { safeParse } from '@/utils/result/safe';
import { readFile, writeFile } from '@/utils/core/fs';

// =============================================================================
// Config Schemas
// =============================================================================

/** Valibot schema for a single @font-face entry for CSS generation. */
export const FontFaceEntrySchema = v.strictObject({
  /** Font family name (e.g. 'Inter'). */
  family: NameSchema,
  /** Font style (e.g. 'normal', 'italic'). */
  style: v.picklist(['normal', 'italic', 'oblique']),
  /** Font weight (e.g. '400', '100 900'). */
  weight: CssFontWeightSchema,
  /** Path to the font file (e.g. '/fonts/inter-latin.woff2'). */
  src: v.pipe(v.string(), v.minLength(1), v.startsWith('/')),
});

/** A single @font-face entry for CSS generation. See {@link FontFaceEntrySchema}. */
export type FontFaceEntry = v.InferOutput<typeof FontFaceEntrySchema>;

/** Valibot schema for an array of {@link FontFaceEntry}. */
export const FontFaceEntryArraySchema = v.array(FontFaceEntrySchema);

/** Array of {@link FontFaceEntry} objects. See {@link FontFaceEntryArraySchema}. */
export type FontFaceEntryArray = v.InferOutput<typeof FontFaceEntryArraySchema>;

/** Valibot schema for the error HTML template plugin configuration. */
export const ErrorHtmlConfigSchema = v.strictObject({
  /** Application display name. */
  appName: NameSchema,
  /** CSS font-family stack string (e.g. "'Inter', sans-serif"). */
  fontFamilies: CssFontFamilySchema,
  /** Font face entries for inline @font-face CSS. */
  fontFaces: v.array(FontFaceEntrySchema),
  /** Absolute path to the error.html template file. */
  templatePath: PathSchema,
  /** Locale strings for the error page. */
  locale: v.strictObject({
    /** Server error heading (e.g. "Something went wrong"). */
    serverError: LocaleStringSchema,
    /** Server error description text. */
    serverErrorDescription: LocaleStringSchema,
    /** "Go home" link text. */
    goHome: LocaleStringSchema,
    /** "Copied!" feedback text. */
    copied: LocaleStringSchema,
    /** "Copy failed" feedback text. */
    copyFailed: LocaleStringSchema,
    /** "Copy error ID" button label. */
    copyErrorId: LocaleStringSchema,
    /** Error ID template with `{id}` placeholder (e.g. "Reference: {id}"). */
    errorId: LocaleStringSchema,
  }),
});

/** Configuration for the error HTML template plugin. See {@link ErrorHtmlConfigSchema}. */
export type ErrorHtmlConfig = v.InferOutput<typeof ErrorHtmlConfigSchema>;

/** Valibot schema for the app HTML template plugin configuration. */
export const AppHtmlConfigSchema = v.strictObject({
  /** Application display name. */
  appName: NameSchema,
  /** Absolute path to the app.html template file. */
  templatePath: PathSchema,
  /** localStorage key prefix (defaults to `appName.toLowerCase()`). */
  storagePrefix: v.optional(
    v.pipe(v.string(), v.minLength(1), v.maxLength(50), v.regex(/^[a-zA-Z][\w-]*$/)),
  ),
});

/** Configuration for the app HTML template plugin. See {@link AppHtmlConfigSchema}. */
export type AppHtmlConfig = v.InferOutput<typeof AppHtmlConfigSchema>;

// =============================================================================
// Branded Types
// =============================================================================

/** Schema for validated CSS output string. */
const CssStrSchema = v.pipe(v.string(), v.minLength(1), v.brand('CssStr'));
/** Validated CSS string. */
type CssStr = v.InferOutput<typeof CssStrSchema>;

/** Schema for HTML template placeholder keys. */
const TemplatePlaceholderSchema = v.pipe(
  v.string(),
  v.regex(/^\{\{[A-Za-z_.]+\}\}$/),
  v.brand('TemplatePlaceholder'),
);
/** A validated template placeholder key. */
type TemplatePlaceholder = v.InferOutput<typeof TemplatePlaceholderSchema>;

/**
 * Cast a template literal to TemplatePlaceholder.
 *
 * @param {`{{${Str}}}`} key - Template literal key in `{{...}}` format.
 * @returns {TemplatePlaceholder} The key cast to a branded TemplatePlaceholder.
 */
const ph: (key: `{{${Str}}}`) => TemplatePlaceholder = (key: `{{${Str}}}`): TemplatePlaceholder =>
  key as TemplatePlaceholder; // cast safe: literal matches pattern

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generates inline `@font-face` CSS from font face entries.
 *
 * @param {readonly FontFaceEntry[]} fontFaces - Array of font face entries.
 * @returns {Result<CssStr>} CSS string containing all @font-face declarations.
 *
 * @example
 * ```typescript
 * generateFontFaceCss([{ family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter.woff2' }]);
 * // => { ok: true, data: '@font-face { font-family: \'Inter\'; ... }' }
 * ```
 */
export function generateFontFaceCss(fontFaces: readonly FontFaceEntry[]): Result<CssStr> {
  const validated: Result<FontFaceEntryArray> = safeParse(FontFaceEntryArraySchema, fontFaces);

  if (!validated.ok) {
    return validated;
  }

  const result: Str = validated.data
    .map(
      (f: FontFaceEntry): Str =>
        `@font-face {\n\tfont-family: '${f.family}';\n\tfont-style: ${f.style};\n\tfont-weight: ${f.weight};\n\tfont-display: swap;\n\tsrc: url('${f.src}') format('woff2');\n}`,
    )
    .join('\n');

  return ok(CssStrSchema, result);
}

/**
 * Derives the error ID prefix from the parameterized locale string.
 * e.g. `"Reference: {id}"` → `"Reference: "`
 *
 * @param {Str} template - Parameterized locale string containing `{id}` placeholder.
 * @returns {Result<Str>} The prefix portion before `{id}`.
 *
 * @example
 * ```typescript
 * deriveErrorIdPrefix('Reference: {id}');
 * // => { ok: true, data: 'Reference: ' }
 * ```
 */
export function deriveErrorIdPrefix(template: Str): Result<Str> {
  const validated: Result<Str> = safeParse(v.string(), template);

  if (!validated.ok) {
    return validated;
  }

  const rawIdx: Num = validated.data.indexOf('{id}');

  if (rawIdx < 0) {
    return ok(v.string(), validated.data);
  }

  const idx: NonNegativeInteger = rawIdx as NonNegativeInteger; // cast safe: checked >= 0

  return ok(v.string(), validated.data.slice(0, idx));
}

/**
 * Resolves all `{{placeholders}}` in error.html template content.
 *
 * @param {Str} template - Raw error.html content with `{{placeholders}}`.
 * @param {ErrorHtmlConfig} config - Error HTML configuration with app name, fonts, and locale.
 * @returns {Result<Str>} Resolved HTML with all placeholders replaced.
 *
 * @example
 * ```typescript
 * resolveErrorHtml('<title>{{APP_NAME}}</title>', config);
 * // => { ok: true, data: '<title>MyApp</title>' }
 * ```
 */
export function resolveErrorHtml(template: Str, config: ErrorHtmlConfig): Result<Str> {
  const tplResult: Result<Str> = safeParse(v.string(), template);

  if (!tplResult.ok) {
    return tplResult;
  }

  const cfgResult: Result<ErrorHtmlConfig> = safeParse(ErrorHtmlConfigSchema, config);

  if (!cfgResult.ok) {
    return cfgResult;
  }

  const fontCssResult: Result<CssStr> = generateFontFaceCss(cfgResult.data.fontFaces);

  if (!fontCssResult.ok) {
    return fontCssResult;
  }

  const errorIdPrefixResult: Result<Str> = deriveErrorIdPrefix(cfgResult.data.locale.errorId);

  if (!errorIdPrefixResult.ok) {
    return errorIdPrefixResult;
  }

  const replacements: Record<TemplatePlaceholder, Str> = {
    [ph('{{APP_NAME}}')]: cfgResult.data.appName,
    [ph('{{FONT_FAMILIES}}')]: cfgResult.data.fontFamilies,
    [ph('{{FONT_FACE_CSS}}')]: fontCssResult.data,
    [ph('{{errors.serverError}}')]: cfgResult.data.locale.serverError,
    [ph('{{errors.serverErrorDescription}}')]: cfgResult.data.locale.serverErrorDescription,
    [ph('{{errors.goHome}}')]: cfgResult.data.locale.goHome,
    [ph('{{errors.copied}}')]: cfgResult.data.locale.copied,
    [ph('{{errors.copyFailed}}')]: cfgResult.data.locale.copyFailed,
    [ph('{{errors.copyErrorId}}')]: cfgResult.data.locale.copyErrorId,
    [ph('{{errors.errorIdPrefix}}')]: errorIdPrefixResult.data,
  };

  let result: Str = tplResult.data;

  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }

  return ok(v.string(), result);
}

/**
 * Resolves `{{APP_NAME}}` and `{{STORAGE_PREFIX}}` in app.html template content.
 *
 * @param {Str} template - Raw app.html content with `{{APP_NAME}}` and `{{STORAGE_PREFIX}}`.
 * @param {AppHtmlConfig} config - App HTML configuration with app name and optional storage prefix.
 * @returns {Result<Str>} Resolved HTML with all placeholders replaced.
 *
 * @example
 * ```typescript
 * resolveAppHtml('<title>{{APP_NAME}}</title>', { appName: 'MyApp', templatePath: '/app.html' });
 * // => { ok: true, data: '<title>MyApp</title>' }
 * ```
 */
export function resolveAppHtml(template: Str, config: AppHtmlConfig): Result<Str> {
  const tplResult: Result<Str> = safeParse(v.string(), template);

  if (!tplResult.ok) {
    return tplResult;
  }

  const cfgResult: Result<AppHtmlConfig> = safeParse(AppHtmlConfigSchema, config);

  if (!cfgResult.ok) {
    return cfgResult;
  }

  const prefix: Str = cfgResult.data.storagePrefix ?? cfgResult.data.appName.toLowerCase();
  const result: Str = tplResult.data
    .replaceAll(ph('{{APP_NAME}}') as Str, cfgResult.data.appName) // cast safe: branded string extends Str
    .replaceAll(ph('{{STORAGE_PREFIX}}') as Str, prefix); // cast safe: branded string extends Str

  return ok(v.string(), result);
}

// =============================================================================
// Plugins
// =============================================================================

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
 * @param {ErrorHtmlConfig} config - Error HTML configuration with app name, fonts, locale, and template path.
 * @returns {Plugin} Vite plugin instance.
 *
 * @example
 * ```typescript
 * const plugin = templateErrorHtml(errorConfig);
 * // plugin.name === 'template-error-html'
 * ```
 */
export function templateErrorHtml(config: ErrorHtmlConfig): Plugin {
  // integration boundary: returns Vite Plugin type
  const configResult: Result<ErrorHtmlConfig> = safeParse(ErrorHtmlConfigSchema, config);

  if (!configResult.ok) {
    // integration boundary: Vite plugin callback
    throw configResult.error;
  }

  let originalContent: NullableStr = null;
  const errorHtmlPath: Path = configResult.data.templatePath;

  function restore(): Void {
    // integration boundary: Vite plugin callback
    if (originalContent !== null && errorHtmlPath) {
      const writeResult: Result<Void> = writeFile(errorHtmlPath, originalContent);

      if (!writeResult.ok) {
        // integration boundary: Vite plugin callback
        throw writeResult.error;
      }
      originalContent = null;
    }
    return undefined;
  }

  return {
    name: 'template-error-html',
    apply: 'build',
    enforce: 'pre',

    config(_viteConfig: UserConfig, env: ConfigEnv) {
      if (env.command !== 'build') {
        return;
      }

      const fileResult: Result<Str> = readFile(errorHtmlPath);

      if (!fileResult.ok) {
        // integration boundary: Vite plugin callback
        throw fileResult.error;
      }

      originalContent = fileResult.data;

      const resolved: Result<Str> = resolveErrorHtml(originalContent, config);

      if (!resolved.ok) {
        // integration boundary: Vite plugin callback
        throw resolved.error;
      }

      const writeResult: Result<Void> = writeFile(errorHtmlPath, resolved.data);

      if (!writeResult.ok) {
        // integration boundary: Vite plugin callback
        throw writeResult.error;
      }

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
 * @param {AppHtmlConfig} config - App HTML configuration with app name, template path, and optional storage prefix.
 * @returns {Plugin} Vite plugin instance.
 *
 * @example
 * ```typescript
 * templateAppHtml({ appName: 'MyApp', templatePath: '/app.html' });
 * ```
 */
export function templateAppHtml(config: AppHtmlConfig): Plugin {
  // integration boundary: returns Vite Plugin type
  const configResult: Result<AppHtmlConfig> = safeParse(AppHtmlConfigSchema, config);

  if (!configResult.ok) {
    // integration boundary: Vite plugin callback
    throw configResult.error;
  }

  let originalContent: NullableStr = null;
  const appHtmlPath: Path = configResult.data.templatePath;

  function restore(): Void {
    // integration boundary: Vite plugin callback
    if (originalContent !== null && appHtmlPath) {
      const writeResult: Result<Void> = writeFile(appHtmlPath, originalContent);

      if (!writeResult.ok) {
        // integration boundary: Vite plugin callback
        throw writeResult.error;
      }
      originalContent = null;
    }
    return undefined;
  }

  return {
    name: 'template-app-html',
    apply: 'build',
    enforce: 'pre',

    config(_viteConfig: UserConfig, env: ConfigEnv) {
      if (env.command !== 'build') {
        return;
      }

      const fileResult: Result<Str> = readFile(appHtmlPath);

      if (!fileResult.ok) {
        // integration boundary: Vite plugin callback
        throw fileResult.error;
      }

      originalContent = fileResult.data;

      const resolved: Result<Str> = resolveAppHtml(originalContent, config);

      if (!resolved.ok) {
        // integration boundary: Vite plugin callback
        throw resolved.error;
      }

      const writeResult: Result<Void> = writeFile(appHtmlPath, resolved.data);

      if (!writeResult.ok) {
        // integration boundary: Vite plugin callback
        throw writeResult.error;
      }

      process.on('exit', restore);
    },

    closeBundle() {
      restore();
      process.removeListener('exit', restore);
    },
  };
}
