/**
 * Page config for the per-category Lens page — disables SSR
 * because the page resolves dynamic `import.meta.glob` lens
 * entries for the requested category at runtime.
 *
 * @module
 */

export const ssr = false;
