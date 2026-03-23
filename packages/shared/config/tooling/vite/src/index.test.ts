/**
 * Tests for the shared Vite configuration factory and lazy plugin creator.
 *
 * @module
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Str } from '@/schemas/common';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('--short HEAD')) return Buffer.from('abc1234\n');
    if (cmd.includes('rev-parse HEAD')) return Buffer.from('abc1234def5678901234567890abcdef12345678\n');
    if (cmd.includes('--abbrev-ref HEAD')) return Buffer.from('main\n');
    if (cmd.includes('--porcelain')) return Buffer.from('\n');
    return Buffer.from('');
  }),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => JSON.stringify({ version: '1.2.3' })),
  writeFileSync: vi.fn(),
}));

const { createViteConfig, createLazyPlugin } = await import('./index.js');
const { execSync } = await import('node:child_process');
const { readFileSync } = await import('node:fs');

beforeEach(() => {
  vi.clearAllMocks();
  // Re-set default mock implementations
  (execSync as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
    if (cmd.includes('--short HEAD')) return Buffer.from('abc1234\n');
    if (cmd.includes('rev-parse HEAD')) return Buffer.from('abc1234def5678901234567890abcdef12345678\n');
    if (cmd.includes('--abbrev-ref HEAD')) return Buffer.from('main\n');
    if (cmd.includes('--porcelain')) return Buffer.from('\n');
    return Buffer.from('');
  });
  (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ version: '1.2.3' }));
});

// ---------------------------------------------------------------------------
// createViteConfig
// ---------------------------------------------------------------------------

describe('createViteConfig', () => {
  it('returns a valid Vite config object', () => {
    const config = createViteConfig({ plugins: [] });
    expect(config).toHaveProperty('plugins');
    expect(config).toHaveProperty('define');
    expect(config).toHaveProperty('server');
    expect(config).toHaveProperty('ssr');
  });

  it('injects git metadata defines', () => {
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__APP_VERSION__).toBe(JSON.stringify('1.2.3'));
    expect(define.__GIT_COMMIT__).toBe(JSON.stringify('abc1234'));
    expect(define.__GIT_COMMIT_FULL__).toBe(JSON.stringify('abc1234def5678901234567890abcdef12345678'));
    expect(define.__GIT_BRANCH__).toBe(JSON.stringify('main'));
    expect(define.__GIT_DIRTY__).toBe(JSON.stringify(false));
    expect(define.__BUILD_TIMESTAMP__).toBeDefined();
  });

  it('merges extraDefines over defaults', () => {
    const config = createViteConfig({
      plugins: [],
      extraDefines: { __CUSTOM__: JSON.stringify('test') },
    });
    const define = config.define as Record<Str, Str>;
    expect(define.__CUSTOM__).toBe(JSON.stringify('test'));
    // Default defines still present
    expect(define.__APP_VERSION__).toBeDefined();
  });

  it('uses default ssrNoExternal when not provided', () => {
    const config = createViteConfig({ plugins: [] });
    expect(config.ssr?.noExternal).toEqual(['@lucide/svelte']);
  });

  it('uses custom ssrNoExternal when provided', () => {
    const config = createViteConfig({
      plugins: [],
      ssrNoExternal: ['custom-pkg', 'another-pkg'],
    });
    expect(config.ssr?.noExternal).toEqual(['custom-pkg', 'another-pkg']);
  });

  it('spreads extraConfig into the result', () => {
    const config = createViteConfig({
      plugins: [],
      extraConfig: { build: { target: 'es2024' } },
    });
    expect(config.build?.target).toBe('es2024');
  });

  it('falls back gracefully when git is unavailable', () => {
    (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('git not found');
    });
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__GIT_COMMIT__).toBe(JSON.stringify('unknown'));
    expect(define.__GIT_BRANCH__).toBe(JSON.stringify('unknown'));
  });

  it('falls back to unknown when package.json is missing', () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__APP_VERSION__).toBe(JSON.stringify('unknown'));
  });

  it('reads version from package.json', () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({ version: '5.0.0' }));
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__APP_VERSION__).toBe(JSON.stringify('5.0.0'));
  });

  it('falls back to unknown when package.json has no version field', () => {
    (readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify({}));
    const config = createViteConfig({ plugins: [] });
    const define = config.define as Record<Str, Str>;
    expect(define.__APP_VERSION__).toBe(JSON.stringify('unknown'));
  });

  it('server.watch.ignored includes standard directories', () => {
    const config = createViteConfig({ plugins: [] });
    const ignored = config.server?.watch?.ignored as string[];
    expect(ignored).toContain('**/.svelte-kit/**');
    expect(ignored).toContain('**/node_modules/**');
    expect(ignored).toContain('**/.vite/**');
  });
});

// ---------------------------------------------------------------------------
// createLazyPlugin
// ---------------------------------------------------------------------------

describe('createLazyPlugin', () => {
  it('returns plugin with correct name', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin',
      modulePath: './src/test.ts',
      setupFn: 'setup',
    });
    expect(plugin.name).toBe('test-plugin');
  });

  it('applies only to serve mode', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin',
      modulePath: './src/test.ts',
      setupFn: 'setup',
    });
    expect(plugin.apply).toBe('serve');
  });

  it('has configureServer hook', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin',
      modulePath: './src/test.ts',
      setupFn: 'setup',
    });
    expect(plugin.configureServer).toBeTypeOf('function');
  });

  it('configureServer calls ssrLoadModule and invokes setup function', async () => {
    const setupFn = vi.fn();
    const mockServer = {
      ssrLoadModule: vi.fn(async () => ({ mySetup: setupFn })),
    };

    const plugin = createLazyPlugin({
      name: 'test-plugin',
      modulePath: './src/test.ts',
      setupFn: 'mySetup',
    });

    // Call the configureServer hook
    await (plugin as { configureServer: (server: unknown) => Promise<void> }).configureServer(mockServer);

    expect(mockServer.ssrLoadModule).toHaveBeenCalledWith('./src/test.ts');
    expect(setupFn).toHaveBeenCalledWith(mockServer);
  });
});
