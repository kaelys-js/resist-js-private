/**
 * Devtools Window Global API
 *
 * Registers `window[devtoolsKey]` when debug mode is enabled.
 * Provides state inspection, mutation, and an extension registry.
 *
 * Product-agnostic — schemas, app name, and navigation are injected
 * via {@link DevtoolsConfig}.
 *
 * @module
 */

import type { Str, Num, Bool, Void } from '@/schemas/common';
import { styles } from './console-styles';
import { createWatcher, type WatcherCleanup } from './state-logger.svelte';
import type { AppStoreContract, DebugStoreContract, DevtoolsConfig, DebugState } from './types';
import { getBuildInfo } from '@/utils/core/build-info';
import type { BuildInfo } from '@/utils/core/build-info-schema';
import {
  discoverAppPreferences,
  discoverFeatureFlags,
  generateDebugUrl,
} from './dev-toolbar-registry';
import {
  getVitalsPanelMetrics,
  type PanelMetric,
} from '@/utils/web-vitals/vitals-panel-store.svelte';
import { getBeaconStatus } from '@/utils/web-vitals/vitals-beacon';
import {
  getConnectionSnapshot,
  type ConnectionSnapshot,
} from '@/utils/web-vitals/connection.svelte';
import { formatThresholds } from '@/utils/web-vitals/vitals-diagnostics';

// =============================================================================
// Key Generators
// =============================================================================

/** Returns the window global key for the devtools API. */
export function getDevtoolsKey(appName: Str): Str {
  return `__${appName.toUpperCase()}_DEVTOOLS__`;
}

/** Returns the window global key for build info. */
export function getBuildKey(appName: Str): Str {
  return `__${appName.toUpperCase()}_BUILD__`;
}

// =============================================================================
// Types
// =============================================================================

/** Beacon status snapshot returned by `perf.beacon()`. */
export type BeaconStatus = {
  readonly queued: Num;
  readonly queuedItems: ReadonlyArray<{ name: Str; value: Num; rating: Str }>;
  readonly lastFlushAt: Str | null;
  readonly sessionId: Str;
  readonly maxQueueSize: Num;
};

/**
 * Performance namespace on the devtools API.
 * Exposes Web Vitals, beacon queue, and device/connection data.
 */
export type DevtoolsPerf = {
  vitals(): PanelMetric[];
  beacon(): BeaconStatus;
  device(): ConnectionSnapshot;
  logVitals(): Void;
  logDevice(): Void;
};

/**
 * The devtools API surface exposed on the window object.
 * Product-agnostic — works with any app/debug store combination.
 */
export type DevtoolsAPI = {
  readonly state: {
    readonly app: Record<Str, unknown>;
    readonly features: Record<Str, Bool>;
    readonly debug: DebugState;
  };

  set(path: Str, value: unknown): Void;
  setTheme(theme: Str): Void;
  setMode(mode: Str): Void;
  setLocale(locale: Str): Void;
  setSidebarOpen(open: Bool): Void;
  setFeature(flag: Str, enabled: Bool): Void;
  setLogLevel(level: Str): Void;

  enable(): Void;
  disable(): Void;

  logState(): Void;
  logFeatures(): Void;

  registerWatcher(name: Str, getter: () => Record<Str, unknown>): Void;
  unregisterWatcher(name: Str): Void;

  register(namespace: Str, api: Record<Str, unknown>): Void;
  unregister(namespace: Str): Void;

  readonly appName: Str;
  readonly buildInfo: BuildInfo | null;
  readonly perf: DevtoolsPerf;

  resetToDefaults(): Void;
  resetAllToDefaults(): Void;
  copyDebugUrl(): Promise<Void>;

  login(): Void;
  logout(): Void;

  help(): Void;
  toString(): Str;
  readonly [Symbol.toStringTag]: Str;
};

// =============================================================================
// Build info (cached at module level)
// =============================================================================

const buildInfoResult = getBuildInfo();
const BUILD_INFO: BuildInfo | null = buildInfoResult.ok ? buildInfoResult.data : null;

// =============================================================================
// Help badge styles
// =============================================================================

const HELP_HEADER =
  'background:#2a1a3a;color:#c8f;padding:2px 8px;border-radius:3px;font-weight:bold;font-size:13px';
const HELP_SECTION = 'color:#8cf;font-weight:bold;font-size:11px;margin-top:4px';
const HELP_METHOD = 'color:#ccc;font-family:monospace;font-size:11px';
const HELP_DESC = 'color:#888;font-size:11px';

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates and registers the devtools API on the window object.
 *
 * @param appStore - The app state store (conforms to AppStoreContract)
 * @param debugStore - The debug state store (conforms to DebugStoreContract)
 * @param config - Product-specific devtools configuration
 * @returns Object with `destroy()` method to unregister the global
 */
export function createDevtoolsAPI(
  appStore: AppStoreContract,
  debugStore: DebugStoreContract,
  config: DevtoolsConfig,
): { destroy(): Void } {
  const extensions: Map<Str, Record<Str, unknown>> = new Map<Str, Record<Str, unknown>>();
  const watchers: Map<Str, WatcherCleanup> = new Map<Str, WatcherCleanup>();

  const devtoolsKey: Str = getDevtoolsKey(config.appName);
  const appName: Str = config.appName;

  // Build setter map from schema
  const appSetterMap: Record<Str, Str> = {};
  for (const key of Object.keys(config.appPreferencesSchema)) {
    const capitalized: Str = key.charAt(0).toUpperCase() + key.slice(1);
    appSetterMap[key] = `set${capitalized}`;
  }

  const featureKeys: Set<Str> = new Set<Str>(Object.keys(config.featureFlagsSchema));

  const devtools: DevtoolsAPI = {
    get state() {
      return {
        app: { ...appStore.app },
        features: { ...appStore.features },
        debug: { ...debugStore.debug },
      };
    },

    set(path: Str, value: unknown): Void {
      const [section, key] = path.split('.');
      if (!section || !key) return;

      if (section === 'app') {
        const setterName: Str | undefined = appSetterMap[key];
        if (setterName) {
          const setter = (appStore as Record<Str, unknown>)[setterName];
          if (typeof setter === 'function') {
            (setter as (v: unknown) => Void)(value);
          }
        }
      } else if (section === 'features') {
        if (featureKeys.has(key)) {
          appStore.setFeature(key, value as Bool);
        }
      } else if (section === 'debug') {
        if (key === 'enabled') {
          debugStore.setEnabled(value as Bool);
        } else if (key === 'logLevel') {
          debugStore.setLogLevel(value as Str);
        }
      }
    },

    setTheme(theme: Str): Void {
      const setter = (appStore as Record<Str, unknown>).setTheme;
      if (typeof setter === 'function') (setter as (v: Str) => void)(theme);
    },
    setMode(mode: Str): Void {
      const setter = (appStore as Record<Str, unknown>).setMode;
      if (typeof setter === 'function') (setter as (v: Str) => void)(mode);
    },
    setLocale(locale: Str): Void {
      const setter = (appStore as Record<Str, unknown>).setLocale;
      if (typeof setter === 'function') (setter as (v: Str) => void)(locale);
    },
    setSidebarOpen(open: Bool): Void {
      const setter = (appStore as Record<Str, unknown>).setSidebarOpen;
      if (typeof setter === 'function') (setter as (v: Bool) => void)(open);
    },
    setFeature(flag: Str, enabled: Bool): Void {
      appStore.setFeature(flag, enabled);
    },
    setLogLevel(level: Str): Void {
      debugStore.setLogLevel(level);
    },

    enable(): Void {
      debugStore.setEnabled(true);
    },
    disable(): Void {
      debugStore.setEnabled(false);
    },

    logState(): Void {
      const snapshot = devtools.state;
      console.log('%c %s State %c', styles.storeBadge, appName, styles.reset);
      for (const [key, val] of Object.entries(snapshot.app)) {
        console.log(`  %capp.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
      }
      for (const [key, val] of Object.entries(snapshot.features)) {
        console.log(`  %cfeatures.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
      }
      for (const [key, val] of Object.entries(snapshot.debug)) {
        console.log(`  %cdebug.${key}%c  ${JSON.stringify(val)}`, styles.propPath, styles.reset);
      }
    },

    logFeatures(): Void {
      console.table(devtools.state.features);
    },

    registerWatcher(name: Str, getter: () => Record<Str, unknown>): Void {
      const existing: WatcherCleanup | undefined = watchers.get(name);
      if (existing) existing();
      watchers.set(name, createWatcher(name, getter, debugStore, `${appName}Store`));
    },

    unregisterWatcher(name: Str): Void {
      const cleanup: WatcherCleanup | undefined = watchers.get(name);
      if (cleanup) {
        cleanup();
        watchers.delete(name);
      }
    },

    register(namespace: Str, api: Record<Str, unknown>): Void {
      extensions.set(namespace, api);
      Object.defineProperty(devtools, namespace, {
        value: api,
        configurable: true,
        enumerable: true,
      });
    },

    unregister(namespace: Str): Void {
      extensions.delete(namespace);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional extension unregistration
      delete (devtools as Record<Str, unknown>)[namespace];
    },

    get appName(): Str {
      return (appStore.app.appName as Str) ?? config.appName;
    },

    get buildInfo(): BuildInfo | null {
      return BUILD_INFO;
    },

    perf: {
      vitals(): PanelMetric[] {
        const result = getVitalsPanelMetrics();
        if (!result.ok) return [];
        return $state.snapshot(result.data) as PanelMetric[];
      },

      beacon(): BeaconStatus {
        const result = getBeaconStatus();
        if (!result.ok)
          return {
            queued: 0 as Num,
            queuedItems: [],
            lastFlushAt: null,
            sessionId: '' as Str,
            maxQueueSize: 0 as Num,
          };
        return result.data as BeaconStatus;
      },

      device(): ConnectionSnapshot {
        const result = getConnectionSnapshot();
        if (!result.ok)
          return {
            effectiveType: '',
            saveData: false,
            rtt: 0,
            downlink: 0,
            quality: 'unknown',
            isLowEndDevice: false,
            isLowEndExperience: false,
            deviceMemory: 0,
            hardwareConcurrency: 0,
          } as ConnectionSnapshot;
        return result.data;
      },

      logVitals(): Void {
        const vitalsResult = getVitalsPanelMetrics();
        const metrics: PanelMetric[] = vitalsResult.ok ? (vitalsResult.data as PanelMetric[]) : [];
        if (metrics.length === 0) {
          console.log(
            '%c[Perf] %cNo Web Vitals collected yet',
            'color:#8cf;font-weight:bold',
            'color:#aaa',
          );
          return;
        }
        // eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
        console.log('%c Web Vitals ', HELP_HEADER);
        for (const m of metrics) {
          const isTimingMetric: Bool =
            m.name !== 'CLS' && m.name !== 'navigationTiming' && m.name !== 'networkInformation';
          const formatted: Str = isTimingMetric
            ? `${Math.round(m.value)}ms`
            : String(Math.round(m.value * 10_000) / 10_000);
          let ratingColor: Str = 'color:#f44';
          if (m.rating === 'good') ratingColor = 'color:#4f4';
          else if (m.rating === 'needsImprovement') ratingColor = 'color:#fa0';
          console.log(
            `  %c${m.name.padEnd(6)}%c ${formatted.padEnd(10)} %c${m.rating}`,
            'color:#8cf;font-weight:bold',
            'color:#ccc',
            ratingColor,
          );

          if (m.diagnostics && m.rating !== 'good') {
            console.log(
              '    %cThresholds: %c%s',
              'color:#666;font-style:italic',
              'color:#999',
              formatThresholds(m.diagnostics.thresholds),
            );
            for (const finding of m.diagnostics.findings) {
              if (finding.label) {
                console.log(
                  `    %c${finding.label.padEnd(16)}%c ${finding.value}`,
                  'color:#888;font-family:monospace',
                  'color:#bbb',
                );
              } else {
                console.log(`    %c${finding.value}`, 'color:#bbb');
              }
            }
          }
        }
      },

      logDevice(): Void {
        const snapResult = getConnectionSnapshot();
        if (!snapResult.ok) return;
        const snap: ConnectionSnapshot = snapResult.data;
        // eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
        console.log('%c Device & Connection ', HELP_HEADER);
        const entries: Array<[Str, Str]> = [
          ['Quality', snap.quality],
          ['Effective Type', snap.effectiveType || '—'],
          ['RTT', `${String(snap.rtt)}ms`],
          ['Downlink', `${String(snap.downlink)} Mbps`],
          ['Data Saver', snap.saveData ? 'Yes' : 'No'],
          ['Device Memory', snap.deviceMemory > 0 ? `${String(snap.deviceMemory)} GB` : '—'],
          ['CPU Cores', snap.hardwareConcurrency > 0 ? String(snap.hardwareConcurrency) : '—'],
          ['Low-End Device', snap.isLowEndDevice ? 'Yes' : 'No'],
          ['Low-End Experience', snap.isLowEndExperience ? 'Yes' : 'No'],
        ];
        for (const [key, val] of entries) {
          console.log(`  %c${key.padEnd(18)}%c ${val}`, styles.keyLabel, styles.valueText);
        }
      },
    },

    resetToDefaults(): Void {
      const prefs = discoverAppPreferences(
        config.appPreferencesSchema as Record<Str, Record<Str, unknown>>,
      );
      for (const pref of prefs) {
        const setterName: Str = `set${pref.key.charAt(0).toUpperCase()}${pref.key.slice(1)}`;
        const setter = (appStore as unknown as Record<Str, (v: unknown) => unknown>)[setterName];
        if (typeof setter === 'function') {
          setter(pref.default);
        }
      }
      console.log(
        '%c[Reset] %cApp preferences reset to defaults',
        'color:#fa0;font-weight:bold',
        'color:#aaa',
      );
    },

    resetAllToDefaults(): Void {
      devtools.resetToDefaults();

      const flags = discoverFeatureFlags(
        config.featureFlagsSchema as Record<Str, Record<Str, unknown>>,
      );
      for (const flag of flags) {
        appStore.setFeature(flag.key, flag.default);
      }

      debugStore.setLogLevel('info');

      console.log(
        '%c[Reset] %cAll state reset to defaults (preferences, features, debug)',
        'color:#fa0;font-weight:bold',
        'color:#aaa',
      );
    },

    async copyDebugUrl(): Promise<Void> {
      try {
        const url: Str = generateDebugUrl(appStore, debugStore, config);
        await navigator.clipboard.writeText(url);
        console.log('%c[Copied] %c%s', 'color:#4f4;font-weight:bold', 'color:#aaa', url);
      } catch {
        const url: Str = generateDebugUrl(appStore, debugStore, config);
        console.log('%c[Debug URL] %c%s', 'color:#fa0;font-weight:bold', 'color:#aaa', url);
      }
    },

    login(): Void {
      const url: URL = new URL(window.location.href);
      url.searchParams.delete(`${config.urlParamPrefix}auth`);
      config.goto(url.toString(), { invalidateAll: true });
    },

    logout(): Void {
      const url: URL = new URL(window.location.href);
      url.searchParams.set(`${config.urlParamPrefix}auth`, 'false');
      config.goto(url.toString(), { invalidateAll: true });
    },

    toString(): Str {
      const version: Str = BUILD_INFO ? BUILD_INFO.version : 'unknown';
      return `[${appName} Devtools v${version}] — type .help() for API reference`;
    },

    get [Symbol.toStringTag](): Str {
      return `${appName} Devtools`;
    },

    help(): Void {
      const globalName = `window.${devtoolsKey}`;

      // eslint-disable-next-line unicorn/no-console-spaces -- Intentional badge padding for %c styled output
      console.log(`%c ${appName} Devtools `, HELP_HEADER);
      console.log(`%cAccess via: %c${globalName}`, HELP_DESC, HELP_METHOD);
      console.log('');

      console.log('%cState Inspection', HELP_SECTION);
      console.log('  %c.state            %c Live snapshot of all state', HELP_METHOD, HELP_DESC);
      console.log('  %c.buildInfo         %c Build metadata', HELP_METHOD, HELP_DESC);
      console.log('  %c.appName           %c Current app name', HELP_METHOD, HELP_DESC);
      console.log('  %c.logState()        %c Pretty-print state', HELP_METHOD, HELP_DESC);
      console.log('  %c.logFeatures()     %c Feature flags table', HELP_METHOD, HELP_DESC);
      console.log('');

      console.log('%cState Mutation', HELP_SECTION);
      console.log('  %c.set(path, value)  %c Generic setter', HELP_METHOD, HELP_DESC);
      console.log('  %c.setTheme(t)       %c Change theme', HELP_METHOD, HELP_DESC);
      console.log('  %c.setMode(m)        %c Set color mode', HELP_METHOD, HELP_DESC);
      console.log('  %c.setLocale(l)      %c Set locale', HELP_METHOD, HELP_DESC);
      console.log('  %c.setSidebarOpen(b) %c Toggle sidebar', HELP_METHOD, HELP_DESC);
      console.log('  %c.setFeature(f, b)  %c Toggle feature flag', HELP_METHOD, HELP_DESC);
      console.log('  %c.setLogLevel(l)    %c Set log level', HELP_METHOD, HELP_DESC);
      console.log('');

      console.log('%cActions', HELP_SECTION);
      console.log('  %c.enable() / .disable()    %c Toggle debug mode', HELP_METHOD, HELP_DESC);
      console.log('  %c.login() / .logout()      %c Simulate auth state', HELP_METHOD, HELP_DESC);
      console.log('  %c.resetToDefaults()        %c Reset app preferences', HELP_METHOD, HELP_DESC);
      console.log('  %c.resetAllToDefaults()     %c Reset all state', HELP_METHOD, HELP_DESC);
      console.log('  %c.copyDebugUrl()           %c Copy debug URL', HELP_METHOD, HELP_DESC);
      console.log('');

      console.log('%cPerformance (.perf)', HELP_SECTION);
      console.log('  %c.perf.vitals()      %c Current Web Vitals', HELP_METHOD, HELP_DESC);
      console.log('  %c.perf.beacon()      %c Beacon queue status', HELP_METHOD, HELP_DESC);
      console.log('  %c.perf.device()      %c Device & connection info', HELP_METHOD, HELP_DESC);
      console.log('  %c.perf.logVitals()   %c Pretty-print vitals', HELP_METHOD, HELP_DESC);
      console.log('  %c.perf.logDevice()   %c Pretty-print device', HELP_METHOD, HELP_DESC);
      console.log('');

      console.log('%cWatchers & Extensions', HELP_SECTION);
      console.log('  %c.registerWatcher(name, fn) %c Watch state changes', HELP_METHOD, HELP_DESC);
      console.log('  %c.unregisterWatcher(name)   %c Remove watcher', HELP_METHOD, HELP_DESC);
      console.log('  %c.register(ns, api)         %c Add extension', HELP_METHOD, HELP_DESC);
      console.log('  %c.unregister(ns)            %c Remove extension', HELP_METHOD, HELP_DESC);
      console.log('');
      console.log('  %c.help()                    %c Show this reference', HELP_METHOD, HELP_DESC);
    },
  };

  // Register on window
  (window as unknown as Record<Str, unknown>)[devtoolsKey] = devtools;

  return {
    destroy(): Void {
      for (const cleanup of watchers.values()) {
        cleanup();
      }
      watchers.clear();

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Intentional global cleanup
      delete (window as unknown as Record<Str, unknown>)[devtoolsKey];
    },
  };
}
