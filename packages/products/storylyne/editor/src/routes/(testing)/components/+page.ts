/**
 * Page config for the Lens Overview page — disables SSR because
 * the dashboard depends on client-only `import.meta.glob` lens
 * discovery and runtime metric collection.
 *
 * @module
 */

export const ssr = false;
