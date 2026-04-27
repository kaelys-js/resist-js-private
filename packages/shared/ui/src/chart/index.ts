/**
 * Barrel re-export for the chart compound component — exposes
 * `ChartContainer` (alias `Container`) and `ChartTooltip` (alias
 * `Tooltip`), plus the `ChartConfig` type and the
 * `getPayloadConfigFromPayload` helper from `chart-utils.ts`.
 *
 * @module
 */

import ChartContainer from './chart-container.svelte';
import ChartTooltip from './chart-tooltip.svelte';

export { type ChartConfig, getPayloadConfigFromPayload } from './chart-utils.js';

export { ChartContainer, ChartTooltip, ChartContainer as Container, ChartTooltip as Tooltip };
