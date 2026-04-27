/**
 * Page config for the Browser & Device Support page — disables SSR
 * because the support matrix is built from runtime feature
 * detection that depends on `window`/`navigator` APIs unavailable
 * during server rendering.
 *
 * @module
 */

export const ssr = false;
