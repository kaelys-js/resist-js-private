<script lang="ts">
  /**
   * DevToolbarDebug — debug-flag dropdown for the dev toolbar.
   *
   * Exposes per-namespace logger toggles (debug categories) plus a
   * global debug-mode switch with searchable selection and reset
   * controls.
   *
   * @module
   */
  import Bug from '@lucide/svelte/icons/bug';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
  import SearchX from '@lucide/svelte/icons/search-x';
  import { tick } from 'svelte';
  import { Switch } from '@/ui/switch/index.js';
  import { Label } from '@/ui/label/index.js';
  import { Button } from '@/ui/button/index.js';
  import * as Command from '@/ui/command/index.js';
  import * as Popover from '@/ui/popover/index.js';
  import { cn } from '@/ui/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import LinkIcon from '@lucide/svelte/icons/link';
  import TerminalIcon from '@lucide/svelte/icons/terminal';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import XIcon from '@lucide/svelte/icons/x';
  import {
    discoverDebugFields,
    generateDebugUrl,
    humanizeKey,
    humanizeOption,
    type FieldDescriptor,
  } from '@/utils/devtools/dev-toolbar-registry';
  import { DebugStateSchema } from '@/utils/devtools/debug-state-schema';
  import { getBuildInfo } from '@/utils/core/build-info';
  import type { BuildInfo } from '@/utils/core/build-info-schema';
  import { localeStore, t } from '$lib/stores/i18n.svelte';
  import { log } from '@/utils/core/logger';
  import { announce } from '@/ui/announce/announce.svelte';
  import * as v from 'valibot';
  import type { Str, Bool, Void } from '@/schemas/common';
  import type { Result } from '@/schemas/result/result';
  import type { EditorStore } from '$lib/stores/editor-state.svelte';
  import type { DebugStore } from '$lib/stores/debug-state.svelte';
  import { URL_PARAM_PREFIX, type DebugState } from '$lib/schemas/debug-state';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import TooltipLabel from '@/ui/tooltip-label/TooltipLabel.svelte';
  import { getDevtoolsKey, type DevtoolsAPI } from '@/utils/devtools/devtools-api.svelte';
  import { APP_NAME } from '$lib/config/app-meta';

  let {
    editorStore,
    debugStore,
    onclose,
  }: { editorStore: EditorStore; debugStore: DebugStore; onclose?: () => Void } = $props();

  const DEVTOOLS_KEY = getDevtoolsKey(APP_NAME);

  const debugFields: FieldDescriptor[] = discoverDebugFields(
    DebugStateSchema.entries as unknown as Record<Str, Record<Str, unknown>>,
  );

  const urlOverrideEntries: Array<[Str, unknown]> = $derived(
    Object.entries(debugStore.urlOverrides),
  );
  const hasOverrides: Bool = $derived(urlOverrideEntries.length > 0);

  const picklistKeys: Str[] = debugFields.flatMap((f) => (f.type === 'picklist' ? [f.key] : []));
  let openPicklists: Record<Str, Bool> = $state(
    Object.fromEntries(picklistKeys.map((k) => [k, false])),
  );
  let triggerRefs: Record<Str, HTMLButtonElement | null> = $state(
    Object.fromEntries(picklistKeys.map((k) => [k, null])),
  );
  let searchValues: Record<Str, Str> = $state(Object.fromEntries(picklistKeys.map((k) => [k, ''])));

  /**
   * Auto-maps a debug field key to its setter method name on DebugStore.
   * e.g., 'enabled' → 'setEnabled', 'logLevel' → 'setLogLevel'
   *
   * @param key - The debug field key
   * @param value - The value to set
   */
  function callSetter(key: Str, value: unknown): Void {
    const setterName: Str = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    // Dynamic setter access — store type doesn't expose string-indexed setters
    const setter = (debugStore as unknown as Record<Str, (v: unknown) => unknown>)[setterName];

    if (typeof setter === 'function') {
      setter(value);
    }
  }

  async function selectOption(key: Str, value: Str): Promise<Void> {
    callSetter(key, value);
    openPicklists[key] = false;
    await tick();
    triggerRefs[key]?.focus();
  }

  /** Schema for feedback state: idle → success/failed → idle (after timeout). */
  const FeedbackStateSchema = v.picklist(['idle', 'success', 'failed']);

  /** Feedback state type. */
  type FeedbackState = v.InferOutput<typeof FeedbackStateSchema>;

  let logStateState: FeedbackState = $state('idle');
  let logFeaturesState: FeedbackState = $state('idle');
  let debugUrlCopyState: FeedbackState = $state('idle');
  let buildInfoCopyState: FeedbackState = $state('idle');

  let logStateTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
  let logFeaturesTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
  let debugUrlCopyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);
  let buildInfoCopyTimeout: ReturnType<typeof setTimeout> | undefined = $state(undefined);

  function logState(): Void {
    // Window global access — cast required for devtools API on window
    const devtools = (window as unknown as Record<Str, DevtoolsAPI | undefined>)[DEVTOOLS_KEY];
    devtools?.logState();
    logStateState = 'success';
    clearTimeout(logStateTimeout);
    logStateTimeout = setTimeout(() => {
      logStateState = 'idle';
    }, 2000);
  }

  function logFeatures(): Void {
    // Window global access — cast required for devtools API on window
    const devtools = (window as unknown as Record<Str, DevtoolsAPI | undefined>)[DEVTOOLS_KEY];
    devtools?.logFeatures();
    logFeaturesState = 'success';
    clearTimeout(logFeaturesTimeout);
    logFeaturesTimeout = setTimeout(() => {
      logFeaturesState = 'idle';
    }, 2000);
  }

  async function copyDebugUrl(): Promise<Void> {
    try {
      const { getDevtoolsConfig } = await import('$lib/config/devtools-config');
      const url: Str = generateDebugUrl(editorStore, debugStore, getDevtoolsConfig());
      await navigator.clipboard.writeText(url);
      debugUrlCopyState = 'success';
      announce(t(localeStore.t.errors.copied, 'Copied!'));
    } catch {
      debugUrlCopyState = 'failed';
      announce(t(localeStore.t.errors.copyFailed, 'Copy failed'));
    }
    clearTimeout(debugUrlCopyTimeout);
    debugUrlCopyTimeout = setTimeout(() => {
      debugUrlCopyState = 'idle';
    }, 2000);
  }

  const buildInfoResult: Result<BuildInfo> = getBuildInfo();

  if (!buildInfoResult.ok) {
    log.warn(`Build info error: ${buildInfoResult.error.code}`);
  }
  // UI boundary — build info error logged, fallback used

  const buildInfo: BuildInfo | null = buildInfoResult.ok ? buildInfoResult.data : null;

  async function copyBuildInfo(): Promise<Void> {
    if (!buildInfo) {
      return;
    }
    try {
      const dirtyLabel: Str = t(
        buildInfo.dirty
          ? localeStore.t.devToolbar.labels.dirtyYes
          : localeStore.t.devToolbar.labels.dirtyNo,
        buildInfo.dirty ? 'Yes' : 'No',
      );
      const text = [
        `Version: ${buildInfo.version}`,
        `Commit: ${buildInfo.commit}`,
        `Branch: ${buildInfo.branch}`,
        `Dirty: ${dirtyLabel}`,
        `Built: ${buildInfo.buildTimestamp}`,
      ].join('\n');
      await navigator.clipboard.writeText(text);
      buildInfoCopyState = 'success';
      announce(t(localeStore.t.errors.copied, 'Copied!'));
    } catch {
      buildInfoCopyState = 'failed';
      announce(t(localeStore.t.errors.copyFailed, 'Copy failed'));
    }
    clearTimeout(buildInfoCopyTimeout);
    buildInfoCopyTimeout = setTimeout(() => {
      buildInfoCopyState = 'idle';
    }, 2000);
  }

  function labelFor(key: Str): Str {
    // Locale DeepReadonly workaround — dynamic key access needs cast
    const entry = (localeStore.t.devToolbar.labels as unknown as Record<Str, () => Result<Str>>)[
      key
    ];

    return entry === undefined ? humanizeKey(key) : t(entry, humanizeKey(key));
  }

  function optionLabel(key: Str, value: Str): Str {
    if (key === 'logLevel') {
      const logLevelKey: Str = `logLevel${value.charAt(0).toUpperCase()}${value.slice(1)}`;
      // Locale DeepReadonly workaround — dynamic key access needs cast
      const entry = (localeStore.t.devToolbar as unknown as Record<Str, () => Result<Str>>)[
        logLevelKey
      ];

      return entry === undefined
        ? humanizeOption(key, value)
        : t(entry, humanizeOption(key, value));
    }
    return humanizeOption(key, value);
  }
</script>

<div class="flex flex-1 min-h-0 flex-col overflow-hidden" data-testid="dev-toolbar-debug">
  <div
    class="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.06] px-3 py-2.5"
  >
    <h3 class="text-sm font-semibold text-foreground inline-flex items-center gap-2">
      <Bug class="size-4 text-primary" />{t(
        localeStore.t.devToolbar.debugSettings,
        'Debug Settings',
      )}
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
              data-testid="panel-close-debug"
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
  <div class="min-h-0 flex-1 overflow-y-auto flex flex-col gap-3 p-3">
    <div class="flex flex-col gap-3">
      {#each debugFields as field (field.key)}
        {@const currentValue = debugStore.debug[field.key as keyof DebugState]}

        {#if field.type === 'boolean'}
          <div class="flex items-center justify-between gap-2">
            <Label class="text-xs" for="debug-{field.key}">
              {labelFor(field.key)}
            </Label>
            <Switch
              id="debug-{field.key}"
              checked={Boolean(currentValue)}
              onCheckedChange={(value: boolean) => callSetter(field.key, value)}
            />
          </div>
        {:else if field.type === 'picklist' && field.options}
          <div class="flex items-center justify-between gap-3">
            <Label class="text-xs shrink-0">
              {labelFor(field.key)}
            </Label>
            <Popover.Root bind:open={openPicklists[field.key]}>
              <Popover.Trigger bind:ref={triggerRefs[field.key]}>
                {#snippet child({ props }: { props: Record<string, unknown> })}
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    class="h-8 w-36 justify-between text-xs bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]"
                    role="combobox"
                    aria-expanded={openPicklists[field.key]}
                  >
                    <span class="truncate">{optionLabel(field.key, String(currentValue))}</span>
                    <ChevronsUpDown class="size-3.5 shrink-0 opacity-50" />
                  </Button>
                {/snippet}
              </Popover.Trigger>
              <Popover.Content
                class="z-[100000] w-36 p-0 animation-duration-150 data-[state=closed]:animation-duration-150"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <Command.Root>
                  <div class="relative">
                    <Command.Input
                      bind:value={searchValues[field.key]}
                      placeholder={t(localeStore.t.devToolbar.search, 'Search…')}
                      class="h-8 text-xs"
                    />
                    {#if searchValues[field.key]}
                      <button
                        type="button"
                        class="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        onclick={() => {
                          searchValues[field.key] = '';
                        }}
                        aria-label={t(localeStore.t.devToolbar.clearSearch, 'Clear search')}
                      >
                        <XIcon class="size-3" />
                      </button>
                    {/if}
                  </div>
                  <Command.List>
                    <Command.Empty>
                      <div class="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                        <SearchX class="size-5" />
                        <p class="text-xs font-medium">
                          {t(localeStore.t.devToolbar.noResultsFound, 'No results found')}
                        </p>
                        <p class="text-[10px] text-muted-foreground/70">
                          {t(localeStore.t.devToolbar.noResultsHint, 'Try a different search term')}
                        </p>
                      </div>
                    </Command.Empty>
                    <Command.Group>
                      {#each field.options as option (option)}
                        <Command.Item
                          value={optionLabel(field.key, String(option))}
                          onSelect={() => selectOption(field.key, String(option))}
                          class="text-xs"
                        >
                          <CheckIcon
                            class={cn(
                              'size-3.5 shrink-0',
                              String(currentValue) !== String(option) && 'text-transparent',
                            )}
                          />
                          {optionLabel(field.key, String(option))}
                        </Command.Item>
                      {/each}
                    </Command.Group>
                  </Command.List>
                </Command.Root>
              </Popover.Content>
            </Popover.Root>
          </div>
        {/if}
      {/each}
    </div>

    <div class="flex flex-col gap-2 border-t border-white/[0.06] pt-2">
      <h4 class="text-xs font-medium text-muted-foreground">
        {t(localeStore.t.devToolbar.quickActions, 'Quick Actions')}
      </h4>
      <div class="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          class="h-7 text-xs flex-1 bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08] {logStateState ===
          'success'
            ? 'text-green-500'
            : ''}"
          onclick={logState}
          data-testid="log-state-btn"
        >
          {#if logStateState === 'success'}
            <CheckIcon class="size-3 mr-1" />
            {t(localeStore.t.devToolbar.logged, 'Logged!')}
          {:else}
            <TerminalIcon class="size-3 mr-1" />
            {t(localeStore.t.devToolbar.logState, 'Log State')}
          {/if}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          class="h-7 text-xs flex-1 bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08] {logFeaturesState ===
          'success'
            ? 'text-green-500'
            : ''}"
          onclick={logFeatures}
          data-testid="log-features-btn"
        >
          {#if logFeaturesState === 'success'}
            <CheckIcon class="size-3 mr-1" />
            {t(localeStore.t.devToolbar.logged, 'Logged!')}
          {:else}
            <TerminalIcon class="size-3 mr-1" />
            {t(localeStore.t.devToolbar.logFeatures, 'Log Features')}
          {/if}
        </Button>
      </div>
      <Button
        variant="secondary"
        size="sm"
        class="h-7 text-xs w-full bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08] {debugUrlCopyState ===
        'success'
          ? 'text-green-500'
          : ''}{debugUrlCopyState === 'failed' ? 'text-red-500' : ''}"
        onclick={copyDebugUrl}
        data-testid="copy-debug-url"
      >
        {#if debugUrlCopyState === 'success'}
          <CheckIcon class="size-3 mr-1" />
          {t(localeStore.t.errors.copied, 'Copied!')}
        {:else if debugUrlCopyState === 'failed'}
          <XIcon class="size-3 mr-1" />
          {t(localeStore.t.errors.copyFailed, 'Copy failed')}
        {:else}
          <LinkIcon class="size-3 mr-1" />
          {t(localeStore.t.devToolbar.copyDebugUrl, 'Copy Debug URL')}
        {/if}
      </Button>
    </div>

    {#if hasOverrides}
      <div
        class="flex flex-col gap-1 border-t border-white/[0.06] pt-2"
        data-testid="url-overrides"
      >
        <h4 class="text-xs font-medium text-muted-foreground">
          {t(localeStore.t.devToolbar.urlOverrides, 'URL Overrides')}
        </h4>
        <div class="flex flex-col gap-0.5">
          {#each urlOverrideEntries as [key, value] (key)}
            <div class="text-xs font-mono text-muted-foreground">
              <span class="text-primary">{URL_PARAM_PREFIX}{key}</span> = {value}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if buildInfo}
      <div class="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2" data-testid="build-info">
        <h4 class="text-xs font-medium text-muted-foreground">
          {t(localeStore.t.devToolbar.buildInfo, 'Build Info')}
        </h4>
        <div class="flex flex-col gap-0.5 text-xs">
          <div class="flex justify-between">
            <span class="text-muted-foreground"
              >{t(localeStore.t.devToolbar.labels.version, 'Version')}</span
            >
            <span class="font-mono">{buildInfo.version}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground"
              >{t(localeStore.t.devToolbar.labels.commit, 'Commit')}</span
            >
            <span class="font-mono">{buildInfo.commit}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground"
              >{t(localeStore.t.devToolbar.labels.branch, 'Branch')}</span
            >
            <span class="font-mono">{buildInfo.branch}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground"
              >{t(localeStore.t.devToolbar.labels.dirty, 'Dirty')}</span
            >
            <span class="flex items-center gap-1 font-mono">
              {#if buildInfo.dirty}
                <TriangleAlertIcon class="size-4 text-yellow-500" />
              {/if}
              {t(
                buildInfo.dirty
                  ? localeStore.t.devToolbar.labels.dirtyYes
                  : localeStore.t.devToolbar.labels.dirtyNo,
                buildInfo.dirty ? 'Yes' : 'No',
              )}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground"
              >{t(localeStore.t.devToolbar.labels.built, 'Built')}</span
            >
            <span class="font-mono text-[10px]">{buildInfo.buildTimestamp}</span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          class="h-7 text-xs w-full mt-1 bg-white/[0.10] hover:bg-white/[0.15] border-white/[0.08] {buildInfoCopyState ===
          'success'
            ? 'text-green-500'
            : ''}{buildInfoCopyState === 'failed' ? 'text-red-500' : ''}"
          onclick={copyBuildInfo}
          data-testid="copy-build-info"
        >
          {#if buildInfoCopyState === 'success'}
            <CheckIcon class="size-3 mr-1" />
            {t(localeStore.t.errors.copied, 'Copied!')}
          {:else if buildInfoCopyState === 'failed'}
            <XIcon class="size-3 mr-1" />
            {t(localeStore.t.errors.copyFailed, 'Copy failed')}
          {:else}
            <CopyIcon class="size-3 mr-1" />
            {t(localeStore.t.devToolbar.copyBuildInfo, 'Copy Build Info')}
          {/if}
        </Button>
      </div>
    {/if}
  </div>
</div>
