/**
 * Debug Service Orchestrator
 *
 * Single entry point that conditionally starts/stops all debug services
 * based on `debugStore.debug.enabled`. Call once in `+layout.svelte`
 * after both stores are initialized.
 *
 * Product-agnostic — the product provides its config via {@link DevtoolsConfig}.
 *
 * @module
 */

import { styles } from './console-styles';
import { createStateLogger } from './state-logger.svelte';
import { createDevtoolsAPI, getDevtoolsKey, type DevtoolsAPI } from './devtools-api.svelte';
import { getBuildInfo } from '@/utils/core/build-info';
import type { Bool, Str, Void } from '@/schemas/common';
import type { AppStoreContract, DebugStoreContract, DevtoolsConfig } from './types';

// =============================================================================
// Types
// =============================================================================

/** Handle returned by `activateDebugServices` for cleanup. */
export type DebugServicesHandle = {
  /** Destroys all active debug services. */
  destroy(): Void;
};

// =============================================================================
// Activation / Deactivation
// =============================================================================

/**
 * Activates debug services — creates state logger and devtools API.
 * Returns a handle to destroy all services.
 *
 * @param appStore - The app state store
 * @param debugStore - The debug state store
 * @param config - Product-specific devtools configuration
 * @returns Handle with `destroy()` method
 */
export function activateDebugServices(
  appStore: AppStoreContract,
  debugStore: DebugStoreContract,
  config: DevtoolsConfig,
): DebugServicesHandle {
  const loggerCleanup = createStateLogger(
    [
      { name: 'app', getter: () => ({ ...appStore.app }) },
      { name: 'features', getter: () => ({ ...appStore.features }) },
      { name: 'debug', getter: () => ({ ...debugStore.debug }) },
    ],
    debugStore,
    `${config.appName}Store`,
  );
  const devtoolsCleanup = createDevtoolsAPI(appStore, debugStore, config);

  logWelcomeBanner(appStore, debugStore, config);

  return {
    destroy(): Void {
      loggerCleanup.destroy();
      devtoolsCleanup.destroy();

      console.log(`%c ${config.appName} %c Debug mode disabled`, styles.debugBadge, styles.reset);
    },
  };
}

// =============================================================================
// Welcome Banner
// =============================================================================

/** Feature flag override prefix within URL_PARAM_PREFIX params. */
const FF_PREFIX = 'ff.';

/**
 * Checks whether a URL override key is recognized by the system.
 */
function isRecognizedOverrideKey(key: Str, config: DevtoolsConfig): Bool {
  if (key === 'debug' || key === 'logLevel') return true;
  if (key.startsWith(FF_PREFIX)) {
    return config.isValidFeatureFlag(key.slice(FF_PREFIX.length));
  }
  return config.isValidAppKey(key);
}

// ── Badge styles ───────────────────────────────────────────────────────
const BADGE_STATE =
  'background:#1a3a4a;color:#8cf;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_FLAGS =
  'background:#1a3a2a;color:#8f8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_OVERRIDES =
  'background:#3a3a1a;color:#fc8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_BUILD =
  'background:#2a2a1a;color:#fd8;padding:1px 6px;border-radius:3px;font-weight:bold';
const BADGE_API =
  'background:#2a1a3a;color:#c8f;padding:1px 6px;border-radius:3px;font-weight:bold';

/**
 * Builds a single formatted log string from key-value pairs.
 */
function buildKVBlock(entries: Array<[Str, Str]>, pad = 14): [Str, ...Str[]] {
  const parts: Str[] = [];
  const styleArgs: Str[] = [];
  for (const [key, value] of entries) {
    parts.push(`  %c${key.padEnd(pad)}%c ${value}`);
    styleArgs.push(styles.keyLabel, styles.valueText);
  }
  return [parts.join('\n'), ...styleArgs];
}

function logWelcomeBanner(
  appStore: AppStoreContract,
  debugStore: DebugStoreContract,
  config: DevtoolsConfig,
): Void {
  const appName: Str = config.appName;
  const devtoolsKey: Str = getDevtoolsKey(appName);
  const globalName = `window.${devtoolsKey}`;
  const { logLevel } = debugStore.debug;
  const { features } = appStore;
  const overrides: Record<Str, Str> = debugStore.urlOverrides;
  const overrideKeys: Str[] = Object.keys(overrides);

  // ── Header
  console.log(`%c[${appName}] %cDebug mode enabled`, 'color:#8cf;font-weight:bold', 'color:#aaa');

  // ── Build Info
  const buildResult = getBuildInfo();
  if (buildResult.ok) {
    const b = buildResult.data;
    console.groupCollapsed(`%c ${appName} · Build Info `, BADGE_BUILD);
    const buildBlock = buildKVBlock([
      ['version', b.version],
      ['commit', b.commit],
      ['branch', b.branch],
      ['dirty', b.dirty ? 'Yes' : 'No'],
      ['built', b.buildTimestamp],
    ]);
    console.log(...buildBlock);
    console.groupEnd();
  }

  // ── Current State
  console.groupCollapsed(`%c ${appName} · Current State `, BADGE_STATE);
  const devtools = (window as unknown as Record<Str, DevtoolsAPI | undefined>)[devtoolsKey];
  if (devtools) {
    devtools.logState();
  }
  console.groupEnd();

  // ── Feature Flags
  console.groupCollapsed(`%c ${appName} · Feature Flags `, BADGE_FLAGS);
  const flagEntries: Array<[Str, Str]> = Object.entries(features).map(([key, val]) => [
    key,
    String(val),
  ]);
  const flagsBlock = buildKVBlock(flagEntries, 20);
  console.log(...flagsBlock);
  console.groupEnd();

  // ── URL Overrides
  if (overrideKeys.length > 0) {
    const validKeys: Str[] = [];
    const unknownKeys: Str[] = [];
    for (const key of overrideKeys) {
      if (isRecognizedOverrideKey(key, config)) {
        validKeys.push(key);
      } else {
        unknownKeys.push(key);
      }
    }

    const suffix = `${validKeys.length} applied${unknownKeys.length > 0 ? `, ${unknownKeys.length} unknown` : ''}`;
    console.groupCollapsed(
      `%c ${appName} · URL Overrides %c ${suffix}`,
      BADGE_OVERRIDES,
      'color:#aaa',
    );
    if (validKeys.length > 0) {
      const validEntries: Array<[Str, Str]> = validKeys.map((key) => [
        `${config.urlParamPrefix}${key}`,
        overrides[key] ?? '',
      ]);
      const validBlock = buildKVBlock(validEntries, 20);
      console.log(...validBlock);
    }
    for (const key of unknownKeys) {
      console.warn(`  ✗ ${config.urlParamPrefix}${key} = ${overrides[key]}  (unknown — ignored)`);
    }
    console.groupEnd();
  }

  // ── Devtools API
  console.groupCollapsed(`%c ${appName} · Devtools API %c ${globalName}`, BADGE_API, 'color:#aaa');
  console.log(
    `%cType %c${globalName}.help()%c for a full API reference`,
    'color:#aaa',
    'color:#c8f;font-weight:bold',
    'color:#aaa',
  );
  const apiBlock = buildKVBlock(
    [
      ['.state', 'Full state snapshot (app, features, debug)'],
      ['.buildInfo', 'Build metadata (version, commit, branch)'],
      ['.perf.vitals()', 'Current Web Vitals'],
      ['.perf.beacon()', 'Beacon queue status'],
      ['.perf.device()', 'Device & connection info'],
      ['.set(path, value)', 'Generic setter'],
      ['.enable() / .disable()', 'Toggle debug mode'],
      ['.logState()', 'Pretty-print state'],
      ['.resetAllToDefaults()', 'Reset all state'],
      ['.copyDebugUrl()', 'Copy debug URL'],
      ['.login() / .logout()', 'Simulate auth state'],
      ['.help()', 'Print full API reference'],
    ],
    22,
  );
  console.log(...apiBlock);
  console.log(
    `  %cURL params%c ?${config.urlParamPrefix}debug=true&${config.urlParamPrefix}theme=midnight&${config.urlParamPrefix}logLevel=debug&${config.urlParamPrefix}ff.settings=false`,
    styles.keyLabel,
    styles.valueText,
  );
  console.groupEnd();

  // ── State Logger Hint
  if (logLevel !== 'trace' && logLevel !== 'debug') {
    console.log(
      `%c[${appName}] %c[Tip] %cState change logging requires logLevel "debug" or "trace". Currently: "%s". Set via: %s.setLogLevel("debug")`,
      'color:#8cf;font-weight:bold',
      'color:#fa0;font-weight:bold',
      'color:#aaa',
      logLevel,
      globalName,
    );
  } else {
    console.log(
      `%c[${appName}] %c[Logger] %cState change logging active — store mutations will be logged below`,
      'color:#8cf;font-weight:bold',
      'color:#4f4;font-weight:bold',
      'color:#aaa',
    );
  }
}

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Initializes all debug services reactively. Call once in `+layout.svelte`
 * inside a `$effect` block to watch `debug.enabled` for transitions.
 *
 * @param appStore - The app state store
 * @param debugStore - The debug state store
 * @param config - Product-specific devtools configuration
 * @param handle - Current active handle (or null if not active)
 * @returns Updated handle (or null if deactivated)
 */
export function syncDebugServices(
  appStore: AppStoreContract,
  debugStore: DebugStoreContract,
  config: DevtoolsConfig,
  handle: DebugServicesHandle | null,
): DebugServicesHandle | null {
  const { enabled } = debugStore.debug;

  if (enabled && !handle) {
    return activateDebugServices(appStore, debugStore, config);
  }
  if (!enabled && handle) {
    handle.destroy();
    return null;
  }
  return handle;
}
