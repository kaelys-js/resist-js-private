/**
 * @module
 *
 * Vite `define` constants injected at build time.
 *
 * These are replaced by Vite's `define` plugin during compilation.
 * The vitest config provides test values via its own `define` block.
 */

declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;
declare const __GIT_COMMIT_FULL__: string;
declare const __GIT_BRANCH__: string;
declare const __GIT_DIRTY__: string;
declare const __BUILD_TIMESTAMP__: string;

declare global {
  var __APP_VERSION__: string;
  var __GIT_COMMIT__: string;
  var __GIT_COMMIT_FULL__: string;
  var __GIT_BRANCH__: string;
  var __GIT_DIRTY__: string;
  var __BUILD_TIMESTAMP__: string;
}

/** Description. */
export type BuildGlobalKey =
  | '__APP_VERSION__'
  | '__GIT_COMMIT__'
  | '__GIT_COMMIT_FULL__'
  | '__GIT_BRANCH__'
  | '__GIT_DIRTY__'
  | '__BUILD_TIMESTAMP__';
