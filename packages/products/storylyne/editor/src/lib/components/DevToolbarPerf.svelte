<script lang="ts">
  import Activity from '@lucide/svelte/icons/activity';
  import Wifi from '@lucide/svelte/icons/wifi';
  import Radio from '@lucide/svelte/icons/radio';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import XIcon from '@lucide/svelte/icons/x';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import TooltipLabel from '@/ui/tooltip-label/TooltipLabel.svelte';
  import { Separator } from '@/ui/separator/index.js';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import type { Str, Num, Bool, Void } from '@/schemas/common';
  import {
    getConnectionQuality,
    getEffectiveType,
    getSaveData,
    getIsLowEndDevice,
    getIsLowEndExperience,
    getDeviceMemory,
    getHardwareConcurrency,
  } from '@/utils/web-vitals/connection.svelte';
  import { getBeaconStatus } from '@/utils/web-vitals/vitals-beacon';
  import {
    getVitalsPanelMetrics,
    type PanelMetric,
  } from '@/utils/web-vitals/vitals-panel-store.svelte';

  let { onclose }: { onclose?: () => Void } = $props();

  /**
   * Unwraps a {@link Result} to its data, falling back to the supplied default
   * when the result is an error. Centralises the `.data`-vs-fallback pattern
   * used throughout this dev-only panel where metric reads are best-effort.
   */
  function unwrap<T>(r: { ok: true; data: T } | { ok: false }, fallback: T): T {
    return r.ok ? r.data : fallback;
  }

  // ── Vitals ─────────────────────────────────────────────────────────────
  const panelMetrics: PanelMetric[] = $derived(
    unwrap(getVitalsPanelMetrics(), []) as PanelMetric[],
  );

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
    if (TIMING_METRICS.has(name)) {
      return `${Math.round(value)}ms`;
    }
    return String(value);
  }

  /**
   * Returns Tailwind classes for a rating badge.
   *
   * @param rating - The vitals rating
   * @returns Tailwind class string
   */
  function ratingClass(rating: Str): Str {
    if (rating === 'good') {
      return 'bg-green-500/20 text-green-400';
    }
    if (rating === 'needsImprovement') {
      return 'bg-yellow-500/20 text-yellow-400';
    }
    if (rating === 'poor') {
      return 'bg-red-500/20 text-red-400';
    }
    return 'bg-muted text-muted-foreground';
  }

  /**
   * Returns a friendly, localized label for a vitals rating.
   *
   * @param rating - Raw rating value ('good', 'needsImprovement', 'poor')
   * @returns Localized friendly label
   */
  function friendlyRating(rating: Str): Str {
    if (rating === 'good') {
      return t(localeStore.t.devToolbar.ratingGood, 'Good');
    }
    if (rating === 'needsImprovement') {
      return t(localeStore.t.devToolbar.ratingNeedsWork, 'Needs Work');
    }
    if (rating === 'poor') {
      return t(localeStore.t.devToolbar.ratingPoor, 'Poor');
    }
    return rating;
  }

  /**
   * Formats threshold boundaries with localized labels.
   *
   * @param thresholds - Threshold data from diagnostics
   * @returns Localized threshold string (e.g. "Good < 2500ms · Poor > 4000ms")
   */
  function localizedThresholds(thresholds: { good: Num; poor: Num; unit: Str }): Str {
    const suffix: Str = thresholds.unit === 'ms' ? 'ms' : '';
    const goodVal: Str =
      thresholds.unit === 'score'
        ? thresholds.good.toString()
        : Math.round(thresholds.good).toString();
    const poorVal: Str =
      thresholds.unit === 'score'
        ? thresholds.poor.toString()
        : Math.round(thresholds.poor).toString();
    const goodLabel: Str = t(localeStore.t.devToolbar.thresholdGood, 'good');
    const poorLabel: Str = t(localeStore.t.devToolbar.thresholdPoor, 'poor');
    return `${goodLabel} < ${goodVal}${suffix} · ${poorLabel} > ${poorVal}${suffix}`;
  }

  /**
   * Maps a diagnostic finding label to its localized equivalent.
   * Labels come from vitals-diagnostics.ts as English keys; this
   * function translates them at the rendering boundary.
   *
   * @param label - English label from DiagnosticFinding
   * @returns Localized label string
   */
  function localizeLabel(label: Str): Str {
    const dt = localeStore.t.devToolbar;
    const trimmed: Str = label.trim();
    const map: Record<Str, () => Str> = {
      'LCP Element': () => t(dt.diagLcpElement, 'LCP Element'),
      Resource: () => t(dt.diagResource, 'Resource'),
      Timing: () => t(dt.diagTiming, 'Timing'),
      'Render Time': () => t(dt.diagRenderTime, 'Render Time'),
      'Load Time': () => t(dt.diagLoadTime, 'Load Time'),
      'Element Size': () => t(dt.diagElementSize, 'Element Size'),
      'Layout Shifts': () => t(dt.diagLayoutShifts, 'Layout Shifts'),
      'Largest Shift': () => t(dt.diagLargestShift, 'Largest Shift'),
      Waterfall: () => t(dt.diagWaterfall, 'Waterfall'),
      Bottleneck: () => t(dt.diagBottleneck, 'Bottleneck'),
      'Render-Blocking': () => t(dt.diagRenderBlocking, 'Render-Blocking'),
      'TTFB Impact': () => t(dt.diagTtfbImpact, 'TTFB Impact'),
      Note: () => t(dt.diagNote, 'Note'),
      Slowest: () => t(dt.diagSlowest, 'Slowest'),
      Breakdown: () => t(dt.diagBreakdown, 'Breakdown'),
      Interactions: () => t(dt.diagInteractions, 'Interactions'),
      'Long Tasks': () => t(dt.diagLongTasks, 'Long Tasks'),
      Longest: () => t(dt.diagLongest, 'Longest'),
    };
    const resolver = map[trimmed];
    // Preserve leading whitespace (indented "  Resource" labels)
    if (resolver) {
      const indent: Str = label.slice(0, label.length - trimmed.length);
      return `${indent}${resolver()}`;
    }
    return label;
  }

  /**
   * Localizes a diagnostic finding value if it's a known English phrase.
   *
   * @param value - English value from DiagnosticFinding
   * @returns Localized value string
   */
  function localizeValue(value: Str): Str {
    const dt = localeStore.t.devToolbar;
    if (value === 'No interactions recorded yet — interact with the page first') {
      return t(dt.diagNoInteractions, value);
    }
    if (value === 'None observed (main thread was responsive)') {
      return t(dt.diagNoneLongTasks, value);
    }
    return value;
  }

  // ── Diagnostics expand/collapse ────────────────────────────────────
  /** Tracks which metric names have their diagnostics expanded. */
  let expandedMetrics: Set<Str> = $state(new Set<Str>());

  /**
   * Toggles the expanded state of a metric's diagnostics.
   *
   * @param name - Metric name to toggle
   */
  function toggleDiagnostics(name: Str): Void {
    const next: Set<Str> = new Set<Str>(expandedMetrics);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    expandedMetrics = next;
  }

  /**
   * Whether a metric has diagnostics data to show.
   *
   * @param metric - The panel metric
   * @returns True if diagnostics are available
   */
  function hasDiagnostics(metric: PanelMetric): Bool {
    return (
      metric.diagnostics !== null &&
      metric.diagnostics !== undefined &&
      metric.diagnostics.findings.length > 0
    );
  }

  /**
   * Returns a friendly localized label for connection quality tier.
   *
   * @param quality - Raw quality value ('fast', 'medium', 'slow', 'unknown')
   * @returns Localized friendly label
   */
  function friendlyQuality(quality: Str): Str {
    if (quality === 'fast') {
      return t(localeStore.t.devToolbar.qualityFast, 'Fast');
    }
    if (quality === 'medium') {
      return t(localeStore.t.devToolbar.qualityMedium, 'Medium');
    }
    if (quality === 'slow') {
      return t(localeStore.t.devToolbar.qualitySlow, 'Slow');
    }
    return t(localeStore.t.devToolbar.qualityUnknown, 'Unknown');
  }

  /**
   * Returns a Tailwind color class for the quality indicator dot.
   *
   * @param quality - Raw quality value
   * @returns Tailwind background color class
   */
  function qualityDotClass(quality: Str): Str {
    if (quality === 'fast') {
      return 'bg-green-400';
    }
    if (quality === 'medium') {
      return 'bg-yellow-400';
    }
    if (quality === 'slow') {
      return 'bg-red-400';
    }
    return 'bg-muted-foreground';
  }

  /**
   * Returns a friendly display label for the network effective type.
   *
   * @param type - Raw effective type ('4g', '3g', '2g', 'slow-2g', '')
   * @returns Friendly display string
   */
  function friendlyEffectiveType(type: Str): Str {
    if (type === '4g') {
      return '4G LTE';
    }
    if (type === '3g') {
      return '3G';
    }
    if (type === '2g') {
      return '2G';
    }
    if (type === 'slow-2g') {
      return 'Slow 2G';
    }
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
      const result = getBeaconStatus();
      if (!result.ok) {
        return;
      }
      const status = result.data;
      beaconQueued = status.queued;
      beaconQueuedItems = status.queuedItems as unknown as Array<{
        name: Str;
        value: Num;
        rating: Str;
      }>;
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
  <div
    class="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.06] px-3 py-2.5"
  >
    <h3 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
      <Activity class="size-4 text-primary" />
      {t(localeStore.t.devToolbar.performance, 'Performance')}
    </h3>
    {#if onclose}
      <Tooltip.Root delayDuration={300}>
        <Tooltip.Trigger>
          {#snippet child({ props }: { props: Record<string, unknown> })}
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
          <TooltipLabel
            label={t(localeStore.t.common.close, 'Close')}
            shortcutLabel="Esc"
            shortcutAlwaysVisible
          />
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
        <p class="text-xs text-muted-foreground/60 italic" data-testid="perf-no-data">
          {t(localeStore.t.devToolbar.noDataYet, 'No data yet')}
        </p>
      {:else}
        <div class="space-y-1">
          {#each panelMetrics as metric (metric.name)}
            <div data-testid="perf-metric-{metric.name}">
              <!-- Metric header row -->
              {#if hasDiagnostics(metric)}
                <button
                  class="flex w-full items-center justify-between text-xs hover:bg-white/[0.04] rounded px-0.5 -mx-0.5 transition-colors"
                  onclick={() => toggleDiagnostics(metric.name)}
                  data-testid="perf-metric-toggle-{metric.name}"
                >
                  <span class="font-mono text-popover-foreground inline-flex items-center gap-1">
                    <ChevronDown
                      class="size-3 text-muted-foreground transition-transform {expandedMetrics.has(
                        metric.name,
                      )
                        ? ''
                        : '-rotate-90'}"
                    />
                    {metric.name}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono text-popover-foreground">
                      {formatValue(metric.name, metric.value)}
                    </span>
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium {ratingClass(
                        metric.rating,
                      )}"
                      data-testid="perf-rating-{metric.name}"
                    >
                      {friendlyRating(metric.rating)}
                    </span>
                  </div>
                </button>
              {:else}
                <div class="flex items-center justify-between text-xs">
                  <span class="font-mono text-popover-foreground">{metric.name}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono text-popover-foreground">
                      {formatValue(metric.name, metric.value)}
                    </span>
                    <span
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium {ratingClass(
                        metric.rating,
                      )}"
                      data-testid="perf-rating-{metric.name}"
                    >
                      {friendlyRating(metric.rating)}
                    </span>
                  </div>
                </div>
              {/if}

              <!-- Expandable diagnostics detail -->
              {#if hasDiagnostics(metric) && expandedMetrics.has(metric.name)}
                <div
                  class="mt-0.5 mb-1 ml-4 rounded bg-white/[0.03] p-1.5 space-y-0.5"
                  data-testid="perf-diagnostics-{metric.name}"
                >
                  <!-- Threshold context -->
                  {#if metric.diagnostics}
                    <div class="text-[10px] text-muted-foreground/70 italic mb-0.5">
                      {localizedThresholds(metric.diagnostics.thresholds)}
                    </div>
                    <!-- Findings -->
                    {#each metric.diagnostics.findings as finding}
                      <div class="flex text-[10px] font-mono gap-1.5">
                        {#if finding.label}
                          <span class="text-muted-foreground shrink-0"
                            >{localizeLabel(finding.label)}</span
                          >
                        {/if}
                        <span class="text-popover-foreground break-all"
                          >{localizeValue(finding.value)}</span
                        >
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}
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
        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.connectionQuality, 'Connection Quality')}</span
        >
        <span
          class="text-popover-foreground font-mono inline-flex items-center gap-1.5"
          data-testid="perf-quality"
        >
          <span
            class="size-2 rounded-full {qualityDotClass(unwrap(getConnectionQuality(), 'unknown'))}"
          ></span>
          {friendlyQuality(unwrap(getConnectionQuality(), 'unknown'))}
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.networkSpeed, 'Network Speed')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-effective-type">
          {friendlyEffectiveType(unwrap(getEffectiveType(), '' as Str))}
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.deviceMemory, 'Device Memory')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-device-memory">
          {unwrap(getDeviceMemory(), 0 as Num)}GB
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.cpuCores, 'CPU Cores')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-hw-concurrency">
          {unwrap(getHardwareConcurrency(), 0 as Num)}
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.dataSaver, 'Data Saver')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-save-data">
          {unwrap(getSaveData(), false as Bool) ? 'Yes' : 'No'}
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.lowEndDevice, 'Low-End Device')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-low-end">
          {unwrap(getIsLowEndDevice(), false as Bool) ? 'Yes' : 'No'}
        </span>

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.lowEndExperience, 'Low-End Experience')}</span
        >
        <span class="text-popover-foreground font-mono" data-testid="perf-low-end-exp">
          {unwrap(getIsLowEndExperience(), false as Bool) ? 'Yes' : 'No'}
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
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <span
                {...props}
                class="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2"
              >
                {t(localeStore.t.devToolbar.queuedMetrics, 'Queued Metrics')}
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4} class="z-[100000] max-w-xs">
            <span class="text-xs"
              >{t(localeStore.t.devToolbar.flushHint, 'Sends on tab hide or at queue limit')}</span
            >
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
                  <span class="px-1 py-0 rounded text-[9px] {ratingClass(item.rating)}"
                    >{friendlyRating(item.rating)}</span
                  >
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <span class="text-muted-foreground"
          >{t(localeStore.t.devToolbar.sessionId, 'Session ID')}</span
        >
        <Tooltip.Root delayDuration={200}>
          <Tooltip.Trigger>
            {#snippet child({ props }: { props: Record<string, unknown> })}
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
            {#snippet child({ props }: { props: Record<string, unknown> })}
              <span
                {...props}
                class="text-muted-foreground cursor-help underline decoration-dotted underline-offset-2"
              >
                {t(localeStore.t.devToolbar.lastSent, 'Last Sent')}
              </span>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content side="top" sideOffset={4} class="z-[100000] max-w-xs">
            <span class="text-xs"
              >{t(
                localeStore.t.devToolbar.lastSentTooltip,
                'Last time queued metrics were flushed to the server',
              )}</span
            >
          </Tooltip.Content>
        </Tooltip.Root>
        <span class="text-popover-foreground font-mono" data-testid="perf-beacon-flush">
          {beaconLastSent
            ? new Date(beaconLastSent).toLocaleTimeString()
            : t(localeStore.t.devToolbar.never, 'Never')}
        </span>
      </div>
    </section>
  </div>
</div>
