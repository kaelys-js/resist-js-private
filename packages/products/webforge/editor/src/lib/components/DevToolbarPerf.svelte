<script lang="ts">
import Activity from '@lucide/svelte/icons/activity';
import Wifi from '@lucide/svelte/icons/wifi';
import Radio from '@lucide/svelte/icons/radio';
import XIcon from '@lucide/svelte/icons/x';
import * as Tooltip from '$lib/components/ui/tooltip/index.js';
import { Separator } from '$lib/components/ui/separator/index.js';
import { localeStore, t } from '$lib/i18n.svelte';
import type { Str, Num, Void } from '@/schemas/common';
import {
	getConnectionQuality,
	getEffectiveType,
	getSaveData,
	getIsLowEndDevice,
	getIsLowEndExperience,
	getDeviceMemory,
	getHardwareConcurrency,
} from '$lib/perf/connection.svelte';
import { getBeaconStatus } from '$lib/perf/vitals-beacon';
import { getVitalsPanelMetrics, type PanelMetric } from '$lib/perf/vitals-panel-store.svelte';

let { onclose }: { onclose?: () => Void } = $props();

// ── Vitals ─────────────────────────────────────────────────────────────
const panelMetrics: PanelMetric[] = $derived(getVitalsPanelMetrics());

/** Timing metrics that should display ms suffix. */
const TIMING_METRICS: ReadonlySet<Str> = new Set([
	'TTFB',
	'FCP',
	'LCP',
	'FID',
	'INP',
	'TBT',
	'NTBT',
]);

/**
 * Formats a metric value with appropriate unit.
 *
 * @param name - Metric name
 * @param value - Metric value
 * @returns Formatted string (e.g. "2450ms" or "0.05")
 */
function formatValue(name: Str, value: Num): Str {
	if (TIMING_METRICS.has(name)) return `${Math.round(value)}ms`;
	return String(value);
}

/**
 * Returns Tailwind classes for a rating badge.
 *
 * @param rating - The vitals rating
 * @returns Tailwind class string
 */
function ratingClass(rating: Str): Str {
	if (rating === 'good') return 'bg-green-500/20 text-green-400';
	if (rating === 'needsImprovement') return 'bg-yellow-500/20 text-yellow-400';
	if (rating === 'poor') return 'bg-red-500/20 text-red-400';
	return 'bg-muted text-muted-foreground';
}

/**
 * Returns a friendly localized label for connection quality tier.
 *
 * @param quality - Raw quality value ('fast', 'medium', 'slow', 'unknown')
 * @returns Localized friendly label
 */
function friendlyQuality(quality: Str): Str {
	if (quality === 'fast') return t(localeStore.t.devToolbar.qualityFast, 'Fast');
	if (quality === 'medium') return t(localeStore.t.devToolbar.qualityMedium, 'Medium');
	if (quality === 'slow') return t(localeStore.t.devToolbar.qualitySlow, 'Slow');
	return t(localeStore.t.devToolbar.qualityUnknown, 'Unknown');
}

/**
 * Returns a Tailwind color class for the quality indicator dot.
 *
 * @param quality - Raw quality value
 * @returns Tailwind background color class
 */
function qualityDotClass(quality: Str): Str {
	if (quality === 'fast') return 'bg-green-400';
	if (quality === 'medium') return 'bg-yellow-400';
	if (quality === 'slow') return 'bg-red-400';
	return 'bg-muted-foreground';
}

/**
 * Returns a friendly display label for the network effective type.
 *
 * @param type - Raw effective type ('4g', '3g', '2g', 'slow-2g', '')
 * @returns Friendly display string
 */
function friendlyEffectiveType(type: Str): Str {
	if (type === '4g') return '4G LTE';
	if (type === '3g') return '3G';
	if (type === '2g') return '2G';
	if (type === 'slow-2g') return 'Slow 2G';
	return '—';
}

// ── Beacon status (polled, not reactive) ───────────────────────────────
let beaconQueued: Num = $state(0);
let beaconQueuedItems: Array<{ name: Str; value: Num; rating: Str }> = $state([]);
let beaconSessionId: Str = $state('');
let beaconLastSent: Str | null = $state(null);
let beaconMaxQueue: Num = $state(10);

$effect(() => {
	/**
	 * Polls beacon status every 2 seconds to keep panel display current.
	 * Beacon module uses plain variables (not $state), so polling is required.
	 */
	function refreshBeaconStatus(): Void {
		const status = getBeaconStatus();
		beaconQueued = status.queued;
		beaconQueuedItems = status.queuedItems;
		beaconSessionId = status.sessionId;
		beaconLastSent = status.lastFlushAt;
		beaconMaxQueue = status.maxQueueSize;
	}

	refreshBeaconStatus();
	const interval: ReturnType<typeof setInterval> = setInterval(refreshBeaconStatus, 2000);
	return () => clearInterval(interval);
});
</script>

<div class="flex flex-1 min-h-0 flex-col overflow-hidden" data-testid="dev-toolbar-perf">
	<!-- Panel header — matches FeatureFlags/AppState/Debug style -->
	<div class="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.06] px-3 py-2.5">
		<h3 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
			<Activity class="size-4 text-primary" />
			{t(localeStore.t.devToolbar.performance, 'Performance')}
		</h3>
		{#if onclose}
			<Tooltip.Root delayDuration={300}>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							onclick={onclose}
							class="size-6 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							aria-label={t(localeStore.t.common.close, 'Close')}
							data-testid="panel-close-perf"
						>
							<XIcon class="size-3.5" />
						</button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content side="top" sideOffset={4} class="z-[100000]">
					<span class="flex items-center gap-1.5">{t(localeStore.t.common.close, 'Close')} <kbd class="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-mono leading-none text-muted-foreground shadow-sm">Esc</kbd></span>
				</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	</div>

	<!-- Scrollable content -->
	<div class="overflow-y-auto px-3 py-2 space-y-3" data-testid="dev-toolbar-perf-body">
		<!-- Web Vitals section -->
		<section data-testid="dev-toolbar-perf-vitals">
			<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
				{t(localeStore.t.devToolbar.webVitals, 'Web Vitals')}
			</h3>
			{#if panelMetrics.length === 0}
				<p class="text-xs text-muted-foreground/60 italic" data-testid="perf-no-data">{t(localeStore.t.devToolbar.noDataYet, 'No data yet')}</p>
			{:else}
				<div class="space-y-1">
					{#each panelMetrics as metric (metric.name)}
						<div
							class="flex items-center justify-between text-xs"
							data-testid="perf-metric-{metric.name}"
						>
							<span class="font-mono text-popover-foreground">{metric.name}</span>
							<div class="flex items-center gap-1.5">
								<span class="font-mono text-popover-foreground">
									{formatValue(metric.name, metric.value)}
								</span>
								<span
									class="px-1.5 py-0.5 rounded text-[10px] font-medium {ratingClass(metric.rating)}"
									data-testid="perf-rating-{metric.name}"
								>
									{metric.rating}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<Separator class="bg-white/[0.06]" />

		<!-- Device & Connection section -->
		<section data-testid="dev-toolbar-perf-device">
			<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
				<span class="inline-flex items-center gap-1">
					<Wifi class="size-3" />
					{t(localeStore.t.devToolbar.deviceConnection, 'Device & Connection')}
				</span>
			</h3>
			<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.connectionQuality, 'Connection Quality')}</span>
				<span class="text-popover-foreground font-mono inline-flex items-center gap-1.5" data-testid="perf-quality">
					<span class="size-2 rounded-full {qualityDotClass(getConnectionQuality())}"></span>
					{friendlyQuality(getConnectionQuality())}
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.networkSpeed, 'Network Speed')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-effective-type">
					{friendlyEffectiveType(getEffectiveType())}
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.deviceMemory, 'Device Memory')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-device-memory">
					{getDeviceMemory()}GB
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.cpuCores, 'CPU Cores')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-hw-concurrency">
					{getHardwareConcurrency()}
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.dataSaver, 'Data Saver')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-save-data">
					{getSaveData() ? 'Yes' : 'No'}
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.lowEndDevice, 'Low-End Device')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-low-end">
					{getIsLowEndDevice() ? 'Yes' : 'No'}
				</span>

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.lowEndExperience, 'Low-End Experience')}</span>
				<span class="text-popover-foreground font-mono" data-testid="perf-low-end-exp">
					{getIsLowEndExperience() ? 'Yes' : 'No'}
				</span>
			</div>
		</section>

		<Separator class="bg-white/[0.06]" />

		<!-- Beacon section -->
		<section data-testid="dev-toolbar-perf-beacon">
			<h3 class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
				<span class="inline-flex items-center gap-1">
					<Radio class="size-3" />
					{t(localeStore.t.devToolbar.beacon, 'Beacon')}
				</span>
			</h3>
			<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
				<!-- Queued Metrics with flush hint tooltip -->
				<Tooltip.Root delayDuration={200}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<span {...props} class="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
								{t(localeStore.t.devToolbar.queuedMetrics, 'Queued Metrics')}
							</span>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={4} class="z-[100000] max-w-xs">
						<span class="text-xs">{t(localeStore.t.devToolbar.flushHint, 'Sends on tab hide or at queue limit')}</span>
					</Tooltip.Content>
				</Tooltip.Root>
				<span class="text-popover-foreground font-mono" data-testid="perf-beacon-queued">
					{beaconQueued}/{beaconMaxQueue}
				</span>

				<!-- Queued items detail (shown when queue is non-empty) -->
				{#if beaconQueuedItems.length > 0}
					<div class="col-span-2 mt-0.5 mb-0.5 rounded bg-white/[0.03] p-1.5 space-y-0.5">
						{#each beaconQueuedItems as item (item.name)}
							<div class="flex items-center justify-between text-[10px] font-mono">
								<span class="text-popover-foreground">{item.name}</span>
								<div class="flex items-center gap-1">
									<span class="text-popover-foreground">{formatValue(item.name, item.value)}</span>
									<span class="px-1 py-0 rounded text-[9px] {ratingClass(item.rating)}">{item.rating}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<span class="text-muted-foreground">{t(localeStore.t.devToolbar.sessionId, 'Session ID')}</span>
				<Tooltip.Root delayDuration={200}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<span
								{...props}
								class="text-popover-foreground font-mono truncate cursor-help"
								data-testid="perf-beacon-session"
							>
								{beaconSessionId.slice(0, 8)}…
							</span>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={4} class="z-[100000]">
						<span class="font-mono text-xs">{beaconSessionId}</span>
					</Tooltip.Content>
				</Tooltip.Root>

				<!-- Last Sent with tooltip explaining what it means -->
				<Tooltip.Root delayDuration={200}>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<span {...props} class="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2">
								{t(localeStore.t.devToolbar.lastSent, 'Last Sent')}
							</span>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="top" sideOffset={4} class="z-[100000] max-w-xs">
						<span class="text-xs">Last time queued metrics were flushed to the server</span>
					</Tooltip.Content>
				</Tooltip.Root>
				<span class="text-popover-foreground font-mono" data-testid="perf-beacon-flush">
					{beaconLastSent ? new Date(beaconLastSent).toLocaleTimeString() : t(localeStore.t.devToolbar.never, 'Never')}
				</span>
			</div>
		</section>
	</div>
</div>
