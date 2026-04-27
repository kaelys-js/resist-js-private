/**
 * Page config for the per-component Lens documentation route —
 * disables SSR because the page resolves a dynamic
 * `import.meta.glob` entry for the requested component name at
 * runtime.
 *
 * @module
 */

/** Disable SSR — dynamic component imports require client-side rendering. */
export const ssr = false;
