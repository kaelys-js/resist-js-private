import { describe, expect, it } from 'vitest';
import type { Path, Str, Name, CssFontFamily, LocaleString } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
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

// =============================================================================
// Test fixtures
// =============================================================================

// cast safe: test fixture literals to branded types
const TEST_APP_NAME: Name = 'TestApp' as Name;

const TEST_TEMPLATE_PATH: Path = '/tmp/test-template.html' as Path;

// cast safe: test fixture literal to branded CssFontFamily
const TEST_FONT_FAMILIES: CssFontFamily =
  "'Inter', ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'" as CssFontFamily;

const TEST_FONT_FACES: FontFaceEntry[] = [
  { family: 'Inter' as Name, style: 'normal', weight: '100 900', src: '/fonts/inter-latin.woff2' }, // cast safe: test fixture
  { family: 'Rajdhani' as Name, style: 'normal', weight: '600', src: '/fonts/rajdhani-latin-600.woff2' }, // cast safe: test fixture
  { family: 'Rajdhani' as Name, style: 'normal', weight: '700', src: '/fonts/rajdhani-latin-700.woff2' }, // cast safe: test fixture
];

// cast safe: test fixture literals to branded LocaleString
const TEST_LOCALE = {
  serverError: 'Something went wrong' as LocaleString,
  serverErrorDescription: "Oops! Something broke on our end. We're looking into it." as LocaleString,
  goHome: 'Go to homepage' as LocaleString,
  copied: 'Copied!' as LocaleString,
  copyFailed: 'Copy failed' as LocaleString,
  copyErrorId: 'Copy error ID to clipboard' as LocaleString,
  errorId: 'Reference: {id}' as LocaleString,
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

// =============================================================================
// Tests
// =============================================================================

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
      const configFn = plugin.config;
      configFn.call({} as never, {} as never, { command: 'serve', mode: 'development' } as never);
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
    const result = generateFontFaceCss(TEST_FONT_FACES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const css = result.data;
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
    const result = generateFontFaceCss(TEST_FONT_FACES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const css = result.data;
    const blockCount: number = (css.match(/@font-face/g) ?? []).length;
    expect(blockCount).toBe(3);
  });

  it('returns error for empty array (CssStr requires minLength 1)', () => {
    const result = generateFontFaceCss([]);
    expect(result.ok).toBe(false);
  });
});

describe('deriveErrorIdPrefix', () => {
  it('extracts prefix before {id} placeholder', () => {
    const result: Result<Str> = deriveErrorIdPrefix('Reference: {id}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBe('Reference: ');
  });

  it('returns full string when no {id} placeholder exists', () => {
    const result: Result<Str> = deriveErrorIdPrefix('No placeholder here');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBe('No placeholder here');
  });

  it('handles empty prefix', () => {
    const result: Result<Str> = deriveErrorIdPrefix('{id}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBe('');
  });
});

describe('resolveErrorHtml', () => {
  const TEMPLATE: Str = `<!doctype html>
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
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toContain('{{');
    expect(result.data).not.toContain('}}');
  });

  it('inserts app name', () => {
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain(TEST_APP_NAME);
  });

  it('inserts font-family stack', () => {
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain("'Inter'");
    expect(result.data).toContain('ui-sans-serif');
  });

  it('inserts @font-face CSS', () => {
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain('@font-face');
    expect(result.data).toContain('/fonts/inter-latin.woff2');
  });

  it('inserts locale error strings', () => {
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain('Something went wrong');
    expect(result.data).toContain('Go to homepage');
    expect(result.data).toContain('Copied!');
  });

  it('derives error ID prefix from parameterized locale string', () => {
    const result: Result<Str> = resolveErrorHtml(TEMPLATE, TEST_ERROR_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain("var prefix = 'Reference: '");
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
      const configFn = plugin.config;
      configFn.call({} as never, {} as never, { command: 'serve', mode: 'development' } as never);
    }
    // No error means the early return worked
  });
});

describe('resolveAppHtml', () => {
  const APP_TEMPLATE: Str = `<meta name="apple-mobile-web-app-title" content="{{APP_NAME}}" />
<script>(function () { try {
var m = localStorage.getItem('{{STORAGE_PREFIX}}:mode');
} catch (e) { console.error('[{{APP_NAME}}] failed:', e); }
})();</script>`;

  it('replaces all APP_NAME placeholders', () => {
    const result: Result<Str> = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toContain('{{APP_NAME}}');
  });

  it('inserts app name', () => {
    const result: Result<Str> = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain(`content="${TEST_APP_NAME}"`);
    expect(result.data).toContain(`'[${TEST_APP_NAME}]`);
  });

  it('replaces STORAGE_PREFIX with lowercased app name by default', () => {
    const result: Result<Str> = resolveAppHtml(APP_TEMPLATE, TEST_APP_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).not.toContain('{{STORAGE_PREFIX}}');
    expect(result.data).toContain("'testapp:mode'");
  });

  it('uses custom storagePrefix when provided', () => {
    const appConfig: AppHtmlConfig = { ...TEST_APP_CONFIG, storagePrefix: 'my-app' };
    const result: Result<Str> = resolveAppHtml(APP_TEMPLATE, appConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toContain("'my-app:mode'");
  });
});
