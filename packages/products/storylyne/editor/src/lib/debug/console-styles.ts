/**
 * Console styling utilities for the debug system.
 *
 * Provides CSS badge/pill styles for `console.log('%c...', style)` formatting,
 * timestamp formatting, and snapshot diffing for state change logging.
 *
 * @module
 */

import * as v from 'valibot';
import type { Str } from '@/schemas/common';

/**
 * CSS style strings for console badge/pill formatting.
 * Palette matches the SvelteKit client hook error system for visual consistency.
 * Used with `console.log('%cLabel', styles.storeBadge)`.
 */
export const styles = {
  /** Cyan background pill for store/module names. */
  storeBadge: 'background:#1a6b6b;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  /** Gray monospace for property paths (e.g., `app.theme`). */
  propPath: 'color:#888;font-family:monospace',
  /** Red text for old/previous values. */
  oldValue: 'color:#f44',
  /** Green text for new/current values. */
  newValue: 'color:#4f4',
  /** Dim gray small text for timestamps. */
  timestamp: 'color:#666;font-size:0.85em',
  /** Dark yellow pill for DEBUG-level messages. */
  debugBadge: 'background:#b8860b;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  /** Orange pill for WARN-level messages. */
  warnBadge: 'background:#f90;color:#000;padding:1px 6px;border-radius:3px;font-weight:bold',
  /** Red pill for ERROR-level messages. */
  errorBadge: 'background:#f44;color:#fff;padding:1px 6px;border-radius:3px;font-weight:bold',
  /** Dim gray for key/label text in key-value rows. */
  keyLabel: 'color:#888',
  /** Bright gray for value text in key-value rows. */
  valueText: 'color:#eee',
  /** Reset to default inherited color. */
  reset: 'color:inherit',
  /** Cyan prefix for app name in vitals output (matches debug banner). */
  vitalPrefix: 'color:#8cf;font-weight:bold',
  /** White bold for metric name in vitals output. */
  metricName: 'color:#fff;font-weight:bold',
  /** Green bold for good-rated vitals metrics. */
  ratingGood: 'color:#4caf50;font-weight:bold',
  /** Amber bold for needs-improvement vitals metrics. */
  ratingWarn: 'color:#ff9800;font-weight:bold',
  /** Red bold for poor-rated vitals metrics. */
  ratingPoor: 'color:#f44;font-weight:bold',
} as const;

/**
 * Formats the current time as `HH:MM:SS.mmm` for console output.
 *
 * @returns Formatted timestamp string
 *
 * @example
 * ```typescript
 * formatTimestamp(); // "14:30:45.123"
 * ```
 */
export function formatTimestamp(): Str {
  const now: Date = new Date();
  const h: Str = String(now.getHours()).padStart(2, '0');
  const m: Str = String(now.getMinutes()).padStart(2, '0');
  const s: Str = String(now.getSeconds()).padStart(2, '0');
  const ms: Str = String(now.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/** Schema for a single snapshot diff entry. */
export const SnapshotDiffSchema = v.strictObject({
  key: v.string(),
  old: v.unknown(),
  new: v.unknown(),
});

/** A single diff entry: which key changed, from what, to what. */
export type SnapshotDiff = v.InferOutput<typeof SnapshotDiffSchema>;

/**
 * Shallow-compares two plain objects and returns changed keys with old/new values.
 *
 * For primitive values, uses strict equality. For objects/arrays, compares via
 * JSON serialization to detect deep changes without requiring a full deep-diff library.
 *
 * @param prev - Previous snapshot
 * @param next - Current snapshot
 * @returns Array of diff entries for keys that changed
 *
 * @example
 * ```typescript
 * diffSnapshot({ theme: 'warm' }, { theme: 'midnight' });
 * // [{ key: 'theme', old: 'warm', new: 'midnight' }]
 * ```
 */
export function diffSnapshot(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];
  const allKeys = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);

  for (const key of allKeys) {
    const oldVal: unknown = prev[key];
    const newVal: unknown = next[key];

    // Primitive equality check
    if (oldVal === newVal) continue;

    // For objects/arrays, compare via JSON to detect deep changes
    if (
      typeof oldVal === 'object' &&
      typeof newVal === 'object' &&
      oldVal !== null &&
      newVal !== null &&
      JSON.stringify(oldVal) === JSON.stringify(newVal)
    ) {
      continue;
    }

    diffs.push({ key, old: oldVal, new: newVal });
  }

  return diffs;
}
