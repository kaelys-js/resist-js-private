/**
 * Reactive mobile breakpoint detector.
 *
 * Extends Svelte 5's `MediaQuery` class to provide a reactive `.current`
 * boolean that is `true` when the viewport width is below the breakpoint.
 *
 * @module
 *
 * @example
 * ```svelte
 * <script>
 * import { IsMobile } from '@/ui/hooks/is-mobile.svelte';
 * const isMobile = new IsMobile();
 * </script>
 *
 * {#if isMobile.current}
 *   <MobileNav />
 * {/if}
 * ```
 */

import type { Num } from '@/schemas/common';
import { MediaQuery } from 'svelte/reactivity';

/** Default mobile breakpoint in pixels (matches Tailwind `md` = 768px). */
const DEFAULT_MOBILE_BREAKPOINT = 768;

/**
 * Reactive mobile breakpoint detector.
 *
 * Creates a `max-width` media query that reports `true` when the viewport
 * is narrower than the given breakpoint (default: 768px, matching Tailwind `md`).
 *
 * @example
 * ```typescript
 * const mobile = new IsMobile();     // < 768px
 * const tablet = new IsMobile(1024); // < 1024px
 * // mobile.current is reactive via Svelte 5's $state
 * ```
 */
export class IsMobile extends MediaQuery {
  constructor(breakpoint: Num = DEFAULT_MOBILE_BREAKPOINT) {
    super(`max-width: ${breakpoint - 1}px`);
  }
}
