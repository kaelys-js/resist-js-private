/**
 * Tests for the lazy Vite plugin factory.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Name, Path } from '@/schemas/common';

const { createLazyPlugin } = await import('./vite-plugin-lazy.ts');

// =============================================================================
// createLazyPlugin
// =============================================================================

describe('createLazyPlugin', () => {
  it('returns plugin with correct name', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin' as Name, // cast safe: test fixture
      modulePath: './src/test.ts' as Path, // cast safe: test fixture
      setupFn: 'setup',
    });
    expect(plugin.name).toBe('test-plugin');
  });

  it('applies only to serve mode', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin' as Name, // cast safe: test fixture
      modulePath: './src/test.ts' as Path, // cast safe: test fixture
      setupFn: 'setup',
    });
    expect(plugin.apply).toBe('serve');
  });

  it('has configureServer hook', () => {
    const plugin = createLazyPlugin({
      name: 'test-plugin' as Name, // cast safe: test fixture
      modulePath: './src/test.ts' as Path, // cast safe: test fixture
      setupFn: 'setup',
    });
    expect(plugin.configureServer).toBeTypeOf('function');
  });

  it('configureServer calls ssrLoadModule and invokes setup function', async () => {
    const setupFn = vi.fn();
    const mockServer = {
      ssrLoadModule: vi.fn(() => ({ mySetup: setupFn })),
    };

    const plugin = createLazyPlugin({
      name: 'test-plugin' as Name, // cast safe: test fixture
      modulePath: './src/test.ts' as Path, // cast safe: test fixture
      setupFn: 'mySetup',
    });

    await (plugin as { configureServer: (server: unknown) => Promise<void> }).configureServer(
      mockServer,
    );

    expect(mockServer.ssrLoadModule).toHaveBeenCalledWith('./src/test.ts');
    expect(setupFn).toHaveBeenCalledWith(mockServer);
  });

  it('does not throw when setup function is missing from module', async () => {
    const mockServer = {
      ssrLoadModule: vi.fn(() => ({})),
    };

    const plugin = createLazyPlugin({
      name: 'test-plugin' as Name, // cast safe: test fixture
      modulePath: './src/test.ts' as Path, // cast safe: test fixture
      setupFn: 'nonExistent',
    });

    await expect(
      (plugin as { configureServer: (server: unknown) => Promise<void> }).configureServer(
        mockServer,
      ),
    ).resolves.toBeUndefined();
  });
});
