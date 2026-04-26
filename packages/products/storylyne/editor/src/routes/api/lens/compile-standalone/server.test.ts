/**
 * Tests for the compile-standalone API endpoint.
 *
 * All expensive dependencies (svelte/compiler, esbuild, @tailwindcss/node,
 * node:fs) are mocked so each test runs in milliseconds and exercises a
 * specific branch without touching the workspace filesystem.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as NodeUrlModule from 'node:url';
import type * as NodeFsModule from 'node:fs';

/* ------------------------------------------------------------------ */
/*  Mocks — declared before import of the module under test            */
/* ------------------------------------------------------------------ */

/**
 * Shared in-memory filesystem used across all mocked fs calls.
 * Keys are absolute paths; values are either 'FILE:...' strings (file
 * content) or 'DIR' (directory marker).
 */
const FS: Map<string, string> = new Map();

/** Reset of the shared in-memory FS between tests. */
function resetFs(): void {
  FS.clear();
  /* Workspace root marker so resolveUiSrcDir / resolveEditorSrcDir
   * terminate their walk-up loop predictably. */
  FS.set('/ws/pnpm-workspace.yaml', 'FILE:workspace');
  FS.set('/ws', 'DIR');
  FS.set('/ws/packages', 'DIR');
  FS.set('/ws/packages/shared', 'DIR');
  FS.set('/ws/packages/shared/ui', 'DIR');
  FS.set('/ws/packages/shared/ui/src', 'DIR');
  FS.set('/ws/packages/products', 'DIR');
  FS.set('/ws/packages/products/storylyne', 'DIR');
  FS.set('/ws/packages/products/storylyne/editor', 'DIR');
  FS.set('/ws/packages/products/storylyne/editor/src', 'DIR');
  FS.set(
    '/ws/packages/products/storylyne/editor/src/app.css',
    `FILE:@import 'tailwindcss';
@source '../**/*';
@import 'tw-animate-css';
:root { --background: white; --foreground: black; }
.dark { --background: black; --foreground: white; }
[data-theme='midnight'] { --accent: navy; }
[data-theme='midnight'].dark { --accent: cyan; }`,
  );
  /* Place the route file where the module's import.meta.url would be
   * so the walk-up hits /ws cleanly. Our mocked fileURLToPath returns
   * this path. */
}

vi.mock('node:url', async () => {
  const actual = await vi.importActual<typeof NodeUrlModule>('node:url');
  return {
    ...actual,
    fileURLToPath: vi.fn(
      (): string =>
        '/ws/packages/products/storylyne/editor/src/routes/api/lens/compile-standalone/+server.ts',
    ),
  };
});

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof NodeFsModule>('node:fs');
  return {
    ...actual,
    readFileSync: vi.fn((p: unknown, _enc?: unknown): string => {
      const key: string = String(p);
      const entry: string | undefined = FS.get(key);
      if (entry && entry.startsWith('FILE:')) {
        return entry.slice('FILE:'.length);
      }
      const err = new Error(`ENOENT: ${key}`);
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      throw err;
    }),
    readdirSync: vi.fn((p: unknown): string[] => {
      const prefix: string = `${String(p)}/`;
      const out: string[] = [];
      for (const key of FS.keys()) {
        if (!key.startsWith(prefix)) {
          continue;
        }
        const rest: string = key.slice(prefix.length);
        if (rest.includes('/')) {
          continue;
        }
        out.push(rest);
      }
      if (!FS.has(String(p))) {
        const err = new Error(`ENOENT: ${String(p)}`);
        (err as NodeJS.ErrnoException).code = 'ENOENT';
        throw err;
      }
      return out;
    }),
    statSync: vi.fn((p: unknown): { isDirectory(): boolean; isFile(): boolean } => {
      const key: string = String(p);
      const entry: string | undefined = FS.get(key);
      if (!entry) {
        const err = new Error(`ENOENT: ${key}`);
        (err as NodeJS.ErrnoException).code = 'ENOENT';
        throw err;
      }
      const isDir: boolean = entry === 'DIR';
      return { isDirectory: (): boolean => isDir, isFile: (): boolean => !isDir };
    }),
  };
});

const svelteCompileMock = vi.fn();
const svelteCompileModuleMock = vi.fn();

vi.mock('svelte/compiler', () => ({
  compile: (...args: unknown[]): unknown => svelteCompileMock(...args),
  compileModule: (...args: unknown[]): unknown => svelteCompileModuleMock(...args),
}));

const esbuildBuildMock = vi.fn();
vi.mock('esbuild', () => ({
  build: (...args: unknown[]): unknown => esbuildBuildMock(...args),
}));

const tailwindCompileMock = vi.fn();
vi.mock('@tailwindcss/node', () => ({
  compile: (...args: unknown[]): unknown => tailwindCompileMock(...args),
}));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/lens/compile-standalone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function installComponent(dirName: string, files: Record<string, string>): void {
  const base: string = `/ws/packages/shared/ui/src/${dirName}`;
  FS.set(base, 'DIR');
  for (const [name, content] of Object.entries(files)) {
    FS.set(`${base}/${name}`, `FILE:${content}`);
  }
}

function installDefaultMocks(): void {
  svelteCompileMock.mockReturnValue({ js: { code: '/*compiled*/' } });
  svelteCompileModuleMock.mockReturnValue({ js: { code: '/*compiled-module*/' } });
  esbuildBuildMock.mockResolvedValue({
    outputFiles: [{ text: 'var bundle=1;' }],
  });
  tailwindCompileMock.mockResolvedValue({
    build: (): string => '.p-4{padding:1rem}',
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('POST /api/lens/compile-standalone', () => {
  beforeEach(() => {
    vi.resetModules();
    resetFs();
    installDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /* ---------- input validation ---------- */

  describe('input validation', () => {
    it('returns 400 for invalid JSON body', async () => {
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: new Request('http://localhost', { method: 'POST', body: 'not json{{{' }),
      } as never);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Invalid JSON body');
    });

    it('returns 400 for missing componentDir', async () => {
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ props: {} }),
      } as never);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing componentDir');
    });

    it('returns 400 when componentDir is empty string', async () => {
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: '' }),
      } as never);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing componentDir');
    });

    it('returns 400 when componentDir is a number (wrong type)', async () => {
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 42 }),
      } as never);
      expect(response.status).toBe(400);
      expect(await response.text()).toBe('Missing componentDir');
    });
  });

  /* ---------- 404 paths ---------- */

  describe('component directory discovery', () => {
    it('returns 404 when component directory does not exist at all', async () => {
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'nonexistent-xyz' }),
      } as never);
      expect(response.status).toBe(404);
      const body: string = await response.text();
      expect(body).toContain('"nonexistent-xyz"');
      expect(body).toContain('not found');
    });

    it('returns 404 when directory exists but has no .svelte primary file', async () => {
      installComponent('no-primary', {
        'helper.ts': 'export const x = 1;',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'no-primary' }),
      } as never);
      expect(response.status).toBe(404);
      const body: string = await response.text();
      expect(body).toContain('Could not find primary .svelte file');
      expect(body).toContain('"no-primary"');
    });
  });

  /* ---------- primary file discovery (kebab → Pascal) ---------- */

  describe('primary .svelte file discovery', () => {
    it('resolves kebab-case dir to PascalCase primary file', async () => {
      installComponent('my-button', {
        'MyButton.svelte': '<button>hi</button>',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'my-button' }),
      } as never);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toContain('my-button-standalone.html');
    });

    it('resolves single-word dir to Pascal primary file', async () => {
      installComponent('button', {
        'Button.svelte': '<button>hi</button>',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(200);
    });

    it('falls back to first matching .svelte file when Pascal primary missing', async () => {
      installComponent('odd-name', {
        'some-other.svelte': '<div>x</div>',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'odd-name' }),
      } as never);
      /* Has a matching .svelte file within /odd-name/ so the fallback
       * candidate scan picks it up. */
      expect(response.status).toBe(200);
    });
  });

  /* ---------- wrapper compile fallback ---------- */

  describe('wrapper compile branch', () => {
    it('uses wrapper when wrapper compiles successfully (default path)', async () => {
      installComponent('button', {
        'Button.svelte': '<button>hi</button>',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(200);
      /* Wrapper path triggers exactly 2+ svelteCompile calls:
       * once for the primary file, once for the wrapper. */
      expect(svelteCompileMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('falls back to direct mount when wrapper compile throws', async () => {
      installComponent('button', {
        'Button.svelte': '<button>hi</button>',
      });
      /* First call (primary) succeeds; second call (wrapper) throws. */
      svelteCompileMock
        .mockReturnValueOnce({ js: { code: '/*primary*/' } })
        .mockImplementationOnce(() => {
          throw new Error('wrapper compile failed');
        });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(200);
      /* Verify entry code went through esbuild with the direct-mount
       * import (not the wrapper). */
      expect(esbuildBuildMock).toHaveBeenCalled();
      const entry: string = esbuildBuildMock.mock.calls[0]![0]!.stdin!.contents as string;
      expect(entry).toContain("import Component from './Button.svelte'");
      expect(entry).not.toContain('__standalone_wrapper__');
    });
  });

  /* ---------- primary-file compile error branch ---------- */

  describe('svelte compile error handling', () => {
    it('skips a .svelte file whose compile throws but keeps processing others', async () => {
      installComponent('button', {
        'Button.svelte': '<button>hi</button>',
        'Extra.svelte': '<div>x</div>',
      });
      /* Compile sequence: first call might be for Extra or Button depending on map order.
       * We throw for any file whose source contains '<div>x</div>' and succeed otherwise. */
      svelteCompileMock.mockImplementation((source: unknown) => {
        if (String(source).includes('<div>x</div>')) {
          throw new Error('boom');
        }
        return { js: { code: '/*ok*/' } };
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(200);
    });

    it('returns 404 when every .svelte file fails to compile leaving no primary', async () => {
      installComponent('all-fail', {
        'AllFail.svelte': '<x>x</x>',
      });
      svelteCompileMock.mockImplementation(() => {
        throw new Error('always fails');
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'all-fail' }),
      } as never);
      expect(response.status).toBe(404);
      expect(await response.text()).toContain('Could not find primary .svelte file');
    });
  });

  /* ---------- rune module (.svelte.ts) path ---------- */

  describe('rune module compile path', () => {
    it('uses compileModule for .svelte.ts files', async () => {
      installComponent('runic', {
        'Runic.svelte': '<div/>',
        'state.svelte.ts': 'let count = $state(0);',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'runic' }),
      } as never);
      expect(response.status).toBe(200);
      expect(svelteCompileModuleMock).toHaveBeenCalled();
    });

    it('falls back to raw source when compileModule throws on .svelte.ts', async () => {
      installComponent('runic', {
        'Runic.svelte': '<div/>',
        'state.svelte.ts': 'let count = $state(0);',
      });
      svelteCompileModuleMock.mockImplementation(() => {
        throw new Error('module compile failed');
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'runic' }),
      } as never);
      /* Fall-through puts raw source into compiledFiles; build still succeeds. */
      expect(response.status).toBe(200);
    });
  });

  /* ---------- esbuild error path ---------- */

  describe('esbuild bundling errors', () => {
    it('returns 500 with the Error.message when esbuild throws an Error', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      esbuildBuildMock.mockRejectedValueOnce(new Error('bundle exploded'));
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('esbuild bundling failed: bundle exploded');
    });

    it('returns 500 with "Unknown bundling error" when esbuild rejects a non-Error', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      esbuildBuildMock.mockRejectedValueOnce('weird');
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('esbuild bundling failed: Unknown bundling error');
    });

    it('returns empty body from bundle when outputFiles is missing', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      esbuildBuildMock.mockResolvedValueOnce({ outputFiles: [] });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.status).toBe(200);
      const html: string = await response.text();
      /* The <script type="module"> block should still render, just empty. */
      expect(html).toContain('<script type="module">');
    });
  });

  /* ---------- tailwind branches ---------- */

  describe('Tailwind CSS generation', () => {
    it('injects compiled Tailwind output into the HTML', async () => {
      installComponent('button', { 'Button.svelte': '<button class="p-4"/>' });
      tailwindCompileMock.mockResolvedValueOnce({
        build: (): string => '.p-4{padding:1rem}',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      const html: string = await response.text();
      expect(html).toContain('.p-4{padding:1rem}');
    });

    it('falls back to :root and .dark blocks from app.css when tailwindCompile throws', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      tailwindCompileMock.mockRejectedValueOnce(new Error('tailwind failed'));
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      const html: string = await response.text();
      expect(html).toContain(':root { --background: white; --foreground: black; }');
      /* .dark block appears in themeVars only when darkMode=true. The
       * fallback branch of generateTailwindCss includes .dark too, so
       * either contributes. */
      expect(html).toContain('.dark { --background: black; --foreground: white; }');
    });

    it('returns empty tailwind section when app.css cannot be read', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      FS.delete('/ws/packages/products/storylyne/editor/src/app.css');
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      /* Still 200 — empty CSS is valid. */
      expect(response.status).toBe(200);
    });
  });

  /* ---------- theme / darkMode branches ---------- */

  describe('theme and dark-mode variations', () => {
    it('adds class="dark" to <html> when darkMode=true', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button', darkMode: true }),
      } as never);
      const html: string = await response.text();
      expect(html).toMatch(/<html[^>]*class="dark"/);
      expect(html).toContain('color-scheme: dark;');
    });

    it('omits class="dark" when darkMode=false', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button', darkMode: false }),
      } as never);
      const html: string = await response.text();
      expect(html).not.toMatch(/<html[^>]*class="dark"/);
      expect(html).toContain('color-scheme: light;');
    });

    it('includes data-theme attribute and theme-specific block when theme is set', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button', theme: 'midnight' }),
      } as never);
      const html: string = await response.text();
      expect(html).toMatch(/<html[^>]*data-theme="midnight"/);
      expect(html).toContain("[data-theme='midnight'] { --accent: navy; }");
    });

    it('includes dark-theme variant when darkMode=true AND theme is set', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button', darkMode: true, theme: 'midnight' }),
      } as never);
      const html: string = await response.text();
      expect(html).toContain("[data-theme='midnight'].dark { --accent: cyan; }");
    });
  });

  /* ---------- children / props branches ---------- */

  describe('props and children in generated entry code', () => {
    it('serializes props object into entry code', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      await POST({
        request: makeRequest({
          componentDir: 'button',
          props: { variant: 'default', size: 'md' },
        }),
      } as never);
      const entry: string = esbuildBuildMock.mock.calls[0]![0]!.stdin!.contents as string;
      expect(entry).toContain('"variant":"default"');
      expect(entry).toContain('"size":"md"');
    });

    it('injects children snippet when children is non-empty', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      await POST({
        request: makeRequest({ componentDir: 'button', children: 'Hello!' }),
      } as never);
      const entry: string = esbuildBuildMock.mock.calls[0]![0]!.stdin!.contents as string;
      expect(entry).toContain('props.children = (anchor) =>');
      expect(entry).toContain('"Hello!"');
    });

    it('omits children snippet when children is empty (default)', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      await POST({ request: makeRequest({ componentDir: 'button' }) } as never);
      const entry: string = esbuildBuildMock.mock.calls[0]![0]!.stdin!.contents as string;
      expect(entry).not.toContain('props.children = (anchor)');
    });
  });

  /* ---------- response headers ---------- */

  describe('response metadata', () => {
    it('sets text/html Content-Type', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    });

    it('sets attachment Content-Disposition named after componentDir', async () => {
      installComponent('my-button', { 'MyButton.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'my-button' }),
      } as never);
      expect(response.headers.get('Content-Disposition')).toBe(
        'attachment; filename="my-button-standalone.html"',
      );
    });

    it('sets Cache-Control: no-cache', async () => {
      installComponent('button', { 'Button.svelte': '<button/>' });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'button' }),
      } as never);
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });
  });

  /* ---------- sibling-dir import collection ---------- */

  describe('sibling directory dependency discovery', () => {
    it('collects ../sibling/ imports from component sources', async () => {
      installComponent('main', {
        'Main.svelte': "<script>import { x } from '../helper/util.ts';</script>",
      });
      installComponent('helper', {
        'util.ts': 'export const x = 1;',
      });
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'main' }),
      } as never);
      expect(response.status).toBe(200);
    });

    it('collects ./sibling-subdir/ imports from component sources', async () => {
      installComponent('main', {
        'Main.svelte': "<script>import { x } from './nested/util.ts';</script>",
      });
      FS.set('/ws/packages/shared/ui/src/nested', 'DIR');
      FS.set('/ws/packages/shared/ui/src/nested/util.ts', 'FILE:export const x = 1;');
      const { POST } = await import('./+server.ts');
      const response: Response = await POST({
        request: makeRequest({ componentDir: 'main' }),
      } as never);
      expect(response.status).toBe(200);
    });
  });
});
