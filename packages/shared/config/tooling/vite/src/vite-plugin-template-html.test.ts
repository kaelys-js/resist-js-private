import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';
import {
  deriveErrorIdPrefix,
  generateFontFaceCss,
  resolveAppHtml,
  resolveErrorHtml,
  templateAppHtml,
  templateErrorHtml,
  type AppHtmlConfig,
  type ErrorHtmlConfig,
  type FontFaceEntry,
} from './vite-plugin-template-html.js';

/* ------------------------------------------------------------------ */
/*  Test fixtures                                                      */
/* ------------------------------------------------------------------ */

const TEST_APP_NAME: Str = 'TestApp';

const TEST_TEMPLATE_PATH: Str = '/tmp/test-template.html';

const TEST_FONT_FAMILIES: Str =
  "'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'";

const TEST_FONT_FACES: FontFaceEntry[] = [
  { family: 'Inter', style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' },
  { family: 'Rajdhani', style: 'normal', weight: '600', src: '/fonts/rajdhani-latin-600.woff2' },
  { family: 'Rajdhani', style: 'normal', weight: '700', src: '/fonts/rajdhani-latin-700.woff2' },
];

const TEST_LOCALE = {
  serverError: 'Something went wrong',
  serverErrorDescription: "Oops! Something broke on our end. We're looking into it.",
  goHome: 'Go to homepage',
  copied: 'Copied!',
  copyFailed: 'Copy failed',
  copyErrorId: 'Copy error ID to clipboard',
  errorId: 'Reference: {id}',
};

const TEST_ERROR_CONFIG: ErrorHtmlConfig = {
  appName: TEST_APP_NAME,
  fontFamilies: TEST_FONT_FAMILIES,
  fontFaces: TEST_FONT_FACES,
  locale: TEST_LOCALE,
  templatePath: TEST_TEMPLATE_PATH,
};

const TEST_APP_CONFIG: AppHtmlConfig = {
  appName: TEST_APP_NAME,
  templatePath: TEST_TEMPLATE_PATH,
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('templateErrorHtml plugin', () => {
  it('returns a Vite plugin object with correct name', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    expect(plugin.name).toBe('template-error-html');
  });

  it('applies only to build mode', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    expect(plugin.apply).toBe('build');
  });

  it('enforces pre-ordering to run before SvelteKit', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    expect(plugin.enforce).toBe('pre');
  });

  it('uses config hook instead of buildStart', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    expect(plugin.config).toBeTypeOf('function');
  });

  it('config hook is no-op when command is serve', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    // Call config with 'serve' command — should not throw or write files
    if (typeof plugin.config === 'function') {
      plugin.config({} as never, { command: 'serve', mode: 'development' } as never);
    }
    // No error means the early return worked
  });

  it('has closeBundle hook', () => {
    const plugin = templateErrorHtml(TEST_ERROR_CONFIG);
    expect(plugin.closeBundle).toBeTypeOf('function');
  });
});

describe('generateFontFaceCss', () => {
  it('generates @font-face declarations for all entries', () => {
    const css = generateFontFaceCss(TEST_FONT_FACES);
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
    const css = generateFontFaceCss(TEST_FONT_FACES);
    const blockCount = (css.match(/@font-face/g) ?? []).length;
    expect(blockCount).toBe(3);
  });

  it('returns empty string for empty array', () => {
    const css = generateFontFaceCss([]);
    expect(css).toBe('');
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
var failed = '{{errors.copyFailed}}';
</script>
</body>
</html>`;

  it('replaces all known placeholders', () => {
    const result = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).not.toContain('{{');
    expect(result).not.toContain('}}');
  });

  it('inserts app name', () => {
    const result: Str = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).toContain(TEST_APP_NAME);
  });

  it('inserts font-family stack', () => {
    const result = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).toContain("'Inter'");
    expect(result).toContain('ui-sans-serif');
  });

  it('inserts @font-face CSS', () => {
    const result = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).toContain('@font-face');
    expect(result).toContain('/fonts/inter-latin.woff2');
  });

  it('inserts locale error strings', () => {
    const result = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).toContain('Something went wrong');
    expect(result).toContain('Go to homepage');
    expect(result).toContain('Copied!');
  });

  it('derives error ID prefix from parameterized locale string', () => {
    const result = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result).toContain("var prefix = 'Reference: '");
  });
});

describe('templateAppHtml plugin', () => {
  it('returns a Vite plugin object with correct name', () => {
    const plugin = templateAppHtml(TEST_APP_CONFIG);
    expect(plugin.name).toBe('template-app-html');
  });

  it('enforces pre-ordering', () => {
    const plugin = templateAppHtml(TEST_APP_CONFIG);
    expect(plugin.enforce).toBe('pre');
  });

  it('applies only to build mode', () => {
    const plugin = templateAppHtml(TEST_APP_CONFIG);
    expect(plugin.apply).toBe('build');
  });

  it('uses config hook', () => {
    const plugin = templateAppHtml(TEST_APP_CONFIG);
    expect(plugin.config).toBeTypeOf('function');
  });

  it('config hook is no-op when command is serve', () => {
    const plugin = templateAppHtml(TEST_APP_CONFIG);
    if (typeof plugin.config === 'function') {
      plugin.config({} as never, { command: 'serve', mode: 'development' } as never);
    }
    // No error means the early return worked
  });
});

describe('resolveAppHtml', () => {
  const APP_TEMPLATE = `<meta name="apple-mobile-web-app-title" content="{{APP_NAME}}" />
<script>(function () { try {
var m = localStorage.getItem('{{STORAGE_PREFIX}}:mode');
} catch (e) { console.error('[{{APP_NAME}}] failed:', e); }
})();</script>`;

  it('replaces all APP_NAME placeholders', () => {
    const result = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result).not.toContain('{{APP_NAME}}');
  });

  it('inserts app name', () => {
    const result: Str = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result).toContain(`content="${TEST_APP_NAME}"`);
    expect(result).toContain(`'[${TEST_APP_NAME}]`);
  });

  it('replaces STORAGE_PREFIX with lowercased app name by default', () => {
    const result: Str = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result).not.toContain('{{STORAGE_PREFIX}}');
    expect(result).toContain("'testapp:mode'");
  });

  it('uses custom storagePrefix when provided', () => {
    const config: AppHtmlConfig = { ...TEST_APP_CONFIG, storagePrefix: 'my-app' };
    const result: Str = resolveAppHtml(APP_TEMPLATE, config);
    expect(result).toContain("'my-app:mode'");
  });
});
