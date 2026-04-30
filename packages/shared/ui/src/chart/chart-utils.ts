/**
 * Chart utilities — shared types (`ChartConfig`, `TooltipPayload`)
 * and Svelte context helpers (`setChartContext` / `useChart` /
 * `getPayloadConfigFromPayload`) that wire chart-container,
 * chart-style, and chart-tooltip together.
 *
 * @module
 */

import type { Tooltip } from 'layerchart';
import { type Component, type ComponentProps, getContext, type Snippet, setContext } from 'svelte';

export const THEMES = { dark: '.dark', light: '' } as const;

/** Description. */
export type ChartConfig = Record<
  string,
  {
    label?: string;
    icon?: Component;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

/** Description. */
export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never;

/** Description. */
export type TooltipPayload = ExtractSnippetParams<
  ComponentProps<typeof Tooltip.Root>['children']
>['payload'][number];

/**
 * Resolves the per-item `ChartConfig` entry that matches a
 * tooltip payload by trying `payload.key`, `payload.name`, an
 * inline `key` field, and finally the nested `payload.payload`.
 *
 * @param config - The full ChartConfig to look up
 * @param payload - One tooltip payload entry
 * @param key - The fallback config key when no match is found
 * @returns The matched `ChartConfig` entry, or `undefined`
 */
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: TooltipPayload,
  key: string,
) {
  if (typeof payload !== 'object' || payload === null) {
    return;
  }

  const payloadPayload =
    'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (payload.key === key) {
    configLabelKey = payload.key;
  } else if (payload.name === key) {
    configLabelKey = payload.name;
  } else if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload !== undefined &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

type ChartContextValue = {
  config: ChartConfig;
};

const chartContextKey = Symbol('chart-context');

/**
 * Stores the chart's shared `ChartContextValue` (current
 * `config`) under the chart context key for descendants.
 *
 * @param value - The ChartContextValue to publish
 * @returns The stored value (Svelte's `setContext` return)
 */
export function setChartContext(value: ChartContextValue) {
  return setContext(chartContextKey, value);
}

/**
 * Reads the nearest ancestor's `ChartContextValue` set via
 * `setChartContext`.
 *
 * @returns The current chart context, or `undefined` if none
 */
export function useChart() {
  return getContext<ChartContextValue>(chartContextKey);
}
