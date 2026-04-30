/**
 * Dynamic Viewport Unit Measurement
 *
 * Provides a JavaScript snippet for measuring `svh`, `lvh`, and `dvh`
 * viewport units via CDP or WebKit Inspector `Runtime.evaluate`.
 * These units differ from `vh` on mobile browsers where the URL bar
 * and toolbars can resize the viewport.
 *
 * - `svh` — small viewport height (URL bar visible)
 * - `lvh` — large viewport height (URL bar hidden)
 * - `dvh` — dynamic viewport height (current state)
 *
 * @module
 */

import type { Num, Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Dynamic viewport unit measurements in CSS pixels. */
export type ViewportUnits = {
  /** Small viewport height (1svh in CSS pixels). */
  svh: Num;
  /** Large viewport height (1lvh in CSS pixels). */
  lvh: Num;
  /** Dynamic viewport height (1dvh in CSS pixels). */
  dvh: Num;
};

/* ------------------------------------------------------------------ */
/*  Script building                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build a JavaScript expression for measuring dynamic viewport units.
 *
 * Uses CSS custom properties set via `100svh`, `100lvh`, `100dvh`
 * on a temporary element to extract the computed pixel values.
 *
 * @returns {Str} JavaScript expression that evaluates to a JSON string
 *
 * @example
 * const script = buildViewportUnitsScript();
 * // Evaluate via Runtime.evaluate({ expression: script })
 * // Result: '{"svh":7.12,"lvh":8.44,"dvh":7.12}'
 */
export function buildViewportUnitsScript(): Str {
  return `(function() {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;';
  document.body.appendChild(el);
  el.style.height = '100svh';
  var svh = el.getBoundingClientRect().height / 100;
  el.style.height = '100lvh';
  var lvh = el.getBoundingClientRect().height / 100;
  el.style.height = '100dvh';
  var dvh = el.getBoundingClientRect().height / 100;
  document.body.removeChild(el);
  return JSON.stringify({ svh: Math.round(svh * 100) / 100, lvh: Math.round(lvh * 100) / 100, dvh: Math.round(dvh * 100) / 100 });
})()` as Str;
}

/* ------------------------------------------------------------------ */
/*  Result parsing                                                     */
/* ------------------------------------------------------------------ */

/**
 * Parse the JSON result of a viewport units measurement.
 *
 * @param {Str} json - JSON string from `Runtime.evaluate` result
 * @returns {ViewportUnits | null} Parsed viewport units or null if invalid
 *
 * @example
 * const units = parseViewportUnitsResult('{"svh":7.12,"lvh":8.44,"dvh":7.12}');
 */
export function parseViewportUnitsResult(json: Str): ViewportUnits | null {
  if (!(json as string)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(json as string);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const obj: Record<string, unknown> = parsed as Record<string, unknown>;

    if (typeof obj.svh !== 'number' || typeof obj.lvh !== 'number' || typeof obj.dvh !== 'number') {
      return null;
    }

    return {
      svh: obj.svh as Num,
      lvh: obj.lvh as Num,
      dvh: obj.dvh as Num,
    };
  } catch {
    /* Invalid JSON */
    return null;
  }
}
