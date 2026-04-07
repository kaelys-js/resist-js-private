/**
 * Ambient module declaration for Svelte 5 components.
 *
 * Svelte 5 uses `<script module>` blocks that export named types
 * and schema constants alongside the default component export.
 * The global `*.svelte` declaration only declares a default export,
 * so tsgo flags all named re-exports (TS2614).
 *
 * This permissive declaration allows any named export from .svelte
 * files using an index-signature export syntax that tsgo resolves
 * correctly. The resulting TS1005 parse diagnostic is suppressed in
 * the tsgo lint transform (see tools/tsgo.ts).
 *
 * @module
 */
declare module '*.svelte' {
  import type { Component } from 'svelte';

  /** Default export: the Svelte component itself. */
  const component: Component<Record<string, unknown>>;
  export default component;

  /** Allow arbitrary named exports from `<script module>` blocks. */
  export var [key: string]: unknown;
}
