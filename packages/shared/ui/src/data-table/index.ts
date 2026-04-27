/**
 * Barrel re-export for the data-table compound — exposes the
 * `FlexRender` Svelte helper for rendering header / cell columns,
 * the `renderComponent` / `renderSnippet` render helpers, and the
 * `createSvelteTable` factory that wraps `@tanstack/table-core`
 * with Svelte 5 reactivity.
 *
 * @module
 */

export { default as FlexRender } from './flex-render.svelte';
export { renderComponent, renderSnippet } from './render-helpers.js';
export { createSvelteTable } from './data-table.svelte.js';
