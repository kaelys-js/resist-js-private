/**
 * Lazy-loading Vite plugin factory.
 *
 * Creates dev-only plugins that defer module loading to ssrLoadModule,
 * avoiding esbuild's inability to resolve workspace aliases at config
 * bundling time.
 *
 * @module
 */

import * as v from 'valibot';
import type { Plugin } from 'vite';
import { NameSchema, PathSchema } from '@/schemas/common';
import type { Str } from '@/schemas/common';

// =============================================================================
// Schema
// =============================================================================

/** Schema for lazy Vite plugin options. */
const LazyPluginOptionsSchema = v.strictObject({
  /** Unique plugin name. */
  name: NameSchema,
  /** Module path to load via ssrLoadModule (relative to project root). */
  modulePath: PathSchema,
  /** Name of the setup function exported by the module. */
  setupFn: v.pipe(v.string(), v.minLength(1), v.regex(/^[a-zA-Z_]\w*$/, 'Must be a valid JS identifier')),
});

/** Options for creating a lazy Vite plugin. See {@link LazyPluginOptionsSchema}. */
export type LazyPluginOptions = v.InferOutput<typeof LazyPluginOptionsSchema>;

// =============================================================================
// Plugin
// =============================================================================

/**
 * Creates a dev-only Vite plugin that defers module loading to ssrLoadModule.
 *
 * This avoids esbuild's inability to resolve workspace aliases at config
 * bundling time. The real module is loaded at runtime through Vite's pipeline
 * which handles TS compilation and alias resolution.
 *
 * @param {LazyPluginOptions} root0 - Plugin configuration
 * @param {Str} root0.name - Unique plugin name
 * @param {Str} root0.modulePath - Module path to load via ssrLoadModule
 * @param {Str} root0.setupFn - Name of the setup function exported by the module
 * @returns {Plugin} Vite plugin that lazily loads the real implementation
 *
 * @example
 * ```typescript
 * createLazyPlugin({
 *   name: 'lens-preview-ws',
 *   modulePath: './src/lib/server/preview/vite-plugin-preview-ws.ts',
 *   setupFn: 'setupPreviewWs',
 * });
 * ```
 */
export function createLazyPlugin({ name, modulePath, setupFn }: LazyPluginOptions): Plugin {
  // integration boundary: returns Vite Plugin type, not Result
  return {
    name,
    apply: 'serve' as const, // cast safe: Vite literal union type

    async configureServer(server): Promise<void> {
      // cast safe: ssrLoadModule returns Record with unknown function signatures
      const mod: Record<Str, (...args: unknown[]) => unknown> = await server.ssrLoadModule(modulePath) as Record<Str, (...args: unknown[]) => unknown>;
      mod[setupFn](server);
    },
  };
}
