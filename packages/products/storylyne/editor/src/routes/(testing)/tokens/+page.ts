/**
 * Page config for the Design Token Viewer — disables SSR because
 * the page reads runtime CSS custom properties from `getComputedStyle`
 * which is only available in the browser.
 *
 * @module
 */

export const ssr = false;
