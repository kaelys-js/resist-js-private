/**
 * Perfume.js initialization wrapper.
 *
 * Wraps the `initPerfume()` call in a Result-returning function and defines
 * the `AnalyticsTrackerFn` type used by downstream modules (vitals logger,
 * vitals beacon, connection store).
 *
 * Call `setupPerfume(tracker)` once from `hooks.client.ts` to start
 * collecting Web Vitals (TTFB, FCP, LCP, CLS, INP, TBT, NTBT).
 *
 * @module
 */

import {
  initPerfume,
  type IAnalyticsTrackerOptions,
  type INavigatorInfo,
  type IVitalsScore,
  type INavigationType,
} from 'perfume.js';
import type { Void } from '@/schemas/common';
import { okUnchecked, type Result } from '@/schemas/result/result';

// ── Re-exported types ────────────────────────────────────────────────────────

/** Re-export of Perfume.js analytics tracker options for downstream consumers. */
export type AnalyticsTrackerOptions = IAnalyticsTrackerOptions;

/** Re-export of Perfume.js navigator information for downstream consumers. */
export type NavigatorInfo = INavigatorInfo;

/** Re-export of Perfume.js vitals score for downstream consumers. */
export type VitalsScore = IVitalsScore;

/** Re-export of Perfume.js navigation type for downstream consumers. */
export type { INavigationType as NavigationType };

/** Analytics tracker callback signature. */
export type AnalyticsTrackerFn = (options: IAnalyticsTrackerOptions) => void;

/**
 * Initializes Perfume.js with the given analytics tracker callback.
 *
 * Collects all default metrics (TTFB, FCP, LCP, CLS, INP, TBT, NTBT,
 * navigationTiming, networkInformation) and reports each one via the
 * tracker callback.
 *
 * Must be called client-side only (guard with `browser` check at call site).
 *
 * @param tracker - Callback invoked for each metric Perfume.js reports
 * @returns `Result<Void>` — always succeeds
 *
 * @example
 * setupPerfume((options) => {
 *   console.log(options.metricName, options.data, options.rating);
 * });
 */
export function setupPerfume(tracker: AnalyticsTrackerFn): Result<Void> {
  initPerfume({
    analyticsTracker: tracker,
    resourceTiming: false,
    elementTiming: false,
  });
  return okUnchecked<Void>(undefined);
}
