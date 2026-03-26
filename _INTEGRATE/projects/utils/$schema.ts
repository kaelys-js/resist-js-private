/* ============================================================================
   UNIVERSAL INFO COLLECTOR SCHEMA
   Minimal, clean, stable — for ALL environments
============================================================================ */

export interface InfoResult<T = any> {
    /* ---------------------------------------------------------
       STATUS
    --------------------------------------------------------- */
    ok: boolean;                         // collector succeeded
    name: string;                        // collector name
    timestamp: number;                   // unix ms

    /* ---------------------------------------------------------
       OUTPUT
    --------------------------------------------------------- */
    data?: T;                            // successful output
    error?: {
        message: string;
        stack?: string;
        code?: string;
        type?: string;                   // EvalError, TypeError, etc.
        retryable?: boolean;             // transient?
        phase?: "startup" | "runtime" | "shutdown" | "unknown";
    };

    /* ---------------------------------------------------------
       DEBUG / TRACE
    --------------------------------------------------------- */
    durationMs?: number;                 // execution time
    attempts?: number;                   // retries
    traceId?: string;                    // per-run trace ID
    correlationId?: string;              // ties multiple results together

    /* ---------------------------------------------------------
       PRIVACY / SECURITY
    --------------------------------------------------------- */
    privacy?: "safe" | "sensitive" | "local-only";

    /* ---------------------------------------------------------
       METADATA
    --------------------------------------------------------- */
    version?: string;                    // collector version
    schemaVersion?: string;              // data output schema version
    tags?: string[];                     // tags from collector
    category?: string;                   // category from collector

    /* ---------------------------------------------------------
       SYSTEM / DEVICE
    --------------------------------------------------------- */
    fingerprint?: string;                // machine fingerprint if available
    sessionId?: string;                  // stable ID for the current session

    /* ---------------------------------------------------------
       INTERNAL ENGINE DATA
    --------------------------------------------------------- */
    cached?: boolean;                    // returned from cache
    merged?: boolean;                    // output came from mergeStrategy
    source?: "collector" | "cache" | "fallback";
}

/* ============================================================================
   UNIVERSAL INFO COLLECTOR INTERFACE — FINAL VERSION
   Covers: Node, Bun, Browser, Worker, Cloud, Edge, Mobile, Deno, Electron,
           Serverless, Containers, CI, Framework SSR, and more.
============================================================================ */

export interface InfoCollector<T = any> {
    /* ----------------------------------------------------------------------
       IDENTIFICATION
    ---------------------------------------------------------------------- */
    name: string;                        // unique identifier
    description?: string;                // human readable description
    category?: string;                   // "os", "network", "cloud", etc.
    tags?: string[];                     // "mobile", "server", "edge", etc.

    /* ----------------------------------------------------------------------
       EXECUTION HOOKS
       when: lifecycle conditions (startup, exit, error, periodic, etc.)
       schedule: optional cron or ms interval ("5m", "1h", 3600000)
       immediate: run once at startup even if not in 'when'
    ---------------------------------------------------------------------- */
    when?: CollectorCondition[];         // lifecycle triggers
    schedule?: string | number;          // "1m" | 60000
    immediate?: boolean;                 // force run at startup

    /* ----------------------------------------------------------------------
       EXECUTION MODEL
       must NEVER throw — errors are wrapped in { error: {...} }
       timeout: kill if long-running
       retries: automatically retry transient failures
       requiresIdle: defer until CPU idle (browser / Node idle-notify)
    ---------------------------------------------------------------------- */
    run: () => Promise<T> | T;           // MUST NOT throw synchronously
    timeoutMs?: number;                  // kill if hangs
    retries?: number;                    // attempts for transient failures
    requiresIdle?: boolean;              // wait for idle callback if available

    /* ----------------------------------------------------------------------
       RUNTIME ENVIRONMENT CONSTRAINTS
       Only run in matching environments.
    ---------------------------------------------------------------------- */
    availableIn?: {
        node?: boolean;
        bun?: boolean;
        deno?: boolean;
        browser?: boolean;
        worker?: boolean;                // WebWorker
        serviceWorker?: boolean;         // SW
        edge?: boolean;                  // Cloudflare/Vercel/Netlify Edge
        cloudflareWorker?: boolean;
        electronMain?: boolean;
        electronRenderer?: boolean;
        reactNative?: boolean;
        serverless?: boolean;            // Lambda, Cloud Functions
        container?: boolean;             // Docker, Podman
        kubernetes?: boolean;
        ci?: boolean;                    // GitHub Actions/GitLab/Bitbucket
        mobile?: boolean;                // iOS/Android browser
        desktop?: boolean;               // Any desktop runtime
        tv?: boolean;                    // Tizen/TV Web Runtime
        automotive?: boolean;            // Android Auto, CarPlay (JS/WebView)
        appliance?: boolean;             // Smart fridge / IoT webview
    };

    /* ----------------------------------------------------------------------
       DEPENDENCY & ORDERING
       Requires collectors X and Y to run first.
       onlyIf: conditional execution
    ---------------------------------------------------------------------- */
    dependsOn?: string[];                // collector names
    onlyIf?: () => boolean | Promise<boolean>;

    /* ----------------------------------------------------------------------
       OUTPUT BEHAVIOR
       cacheable: allows memoization
       mergeStrategy: how to merge with previous runs
       redact?: optional PII reduction function
    ---------------------------------------------------------------------- */
    cacheable?: boolean;
    mergeStrategy?: "replace" | "deep-merge" | "append";
    redact?: (output: T) => any;

    /* ----------------------------------------------------------------------
       PRIVACY CLASSIFICATION
       "safe": can be sent to cloud analytics
       "sensitive": must be redacted before export
       "local-only": never leave the device
    ---------------------------------------------------------------------- */
    privacy?: "safe" | "sensitive" | "local-only";

    /* ----------------------------------------------------------------------
       COST MODEL (useful for mobile/serverless)
    ---------------------------------------------------------------------- */
    cost?: {
        cpu?: "low" | "medium" | "high";
        memory?: "low" | "medium" | "high";
        network?: "none" | "small" | "large";
        disk?: "none" | "read" | "write";
    };

    /* ----------------------------------------------------------------------
       ERROR HANDLING
       onError: custom handler
       suppressErrors: prevent global logs
    ---------------------------------------------------------------------- */
    suppressErrors?: boolean;
    onError?: (error: any) => void;

    /* ----------------------------------------------------------------------
       METADATA OUTPUT ABOUT THE COLLECTOR ITSELF
    ---------------------------------------------------------------------- */
    metadata?: {
        version?: string;
        author?: string;
        url?: string;
    };
}

export type CollectorCondition =
    | "startup"
    | "exit"
    | "error"
    | "periodic"
    | "interval"
    | "request"
    | "client-ready"
    | "idle"
    | "worker-boot"
    | "env-change"
    | "deploy"
    | "diagnostic-dump"
    | "cron"
    | "startup"
    | "exit"
    | "error"
    | "signal"
    | "periodic"
    | "client-ready"
    | "client-loaded"
    | "client-before-exit"
    | "visibility"
    | "worker-start"
    | "sw-install"
    | "sw-activate"
    | "sw-fetch"
    | "edge-startup"
    | "deno-start"
    | "electron-start"
    | "electron-ready"
    | "electron-before-exit"
    | "electron-empty"
    | "electron-renderer-start"
    | "react-native-start"
    | "appstate"
    | "next-ssr"
    | "nuxt-ssr"
    | "sveltekit-ssr"
    | "remix-ssr";


/* ============================================================================
   SAFE EXECUTION WRAPPER — NEVER THROWS
============================================================================ */

export async function runInfoCollector<T>(
    collector: InfoCollector<T>
): Promise<InfoResult<T>> {
    const ts = Date.now();
    try {
        const data = await collector.run();
        return {
            ok: true,
            name: collector.name,
            timestamp: ts,
            data
        };
    } catch (err: any) {
        return {
            ok: false,
            name: collector.name,
            timestamp: ts,
            error: {
                message: err?.message ?? String(err),
                stack: err?.stack,
                code: err?.code
            }
        };
    }
}


/* ============================================================================
   GLOBAL REGISTRY
============================================================================ */

export const INFO_COLLECTORS: InfoCollector<any>[] = [];

export function registerInfoCollector(c: InfoCollector<any>) {
    INFO_COLLECTORS.push(c);
}


/* ============================================================================
   RUN COLLECTORS BY CONDITION
============================================================================ */

export function runCollectorsByCondition(cond: CollectorCondition) {
    return Promise.all(
        INFO_COLLECTORS
            .filter(c => c.when?.includes(cond))
            .map(c => runInfoCollector(c))
    );
}


/* ============================================================================
   ULTIMATE UNIVERSAL LIFECYCLE WIRES
   Covers: Node, Bun, Deno, Browser, WebWorker, Service Worker, CF Worker,
           Vercel/Netlify Edge, Electron, React-Native, SSR, Serverless.
============================================================================ */

export function wireDefaultLifecycle() {
    /* ----------------------------------------------------------------------
       UNIVERSAL STARTUP (any environment)
    ---------------------------------------------------------------------- */
    runCollectorsByCondition("startup");

    /* ----------------------------------------------------------------------
       NODE / BUN ENVIRONMENTS
    ---------------------------------------------------------------------- */
    if (typeof process !== "undefined" && process.version) {
        // Exit
        try {
            process.on("exit", () => runCollectorsByCondition("exit"));
        } catch { }

        // Fatal errors
        try {
            process.on("uncaughtException", (err) =>
                runCollectorsByCondition("error", err)
            );
        } catch { }

        try {
            process.on("unhandledRejection", (err) =>
                runCollectorsByCondition("error", err)
            );
        } catch { }

        // Term signals
        try {
            process.on("SIGINT", () => runCollectorsByCondition("signal"));
            process.on("SIGTERM", () => runCollectorsByCondition("signal"));
        } catch { }
    }

    /* ----------------------------------------------------------------------
       BROWSER ENVIRONMENT
    ---------------------------------------------------------------------- */
    if (typeof window !== "undefined" && typeof document !== "undefined") {
        // DOM Ready
        window.addEventListener("DOMContentLoaded", () =>
            runCollectorsByCondition("client-ready")
        );

        // Full Load
        window.addEventListener("load", () =>
            runCollectorsByCondition("client-loaded")
        );

        // Before unload (browser closing)
        window.addEventListener("beforeunload", () =>
            runCollectorsByCondition("client-before-exit")
        );

        // Visibility changes (tab background/foreground)
        document.addEventListener("visibilitychange", () =>
            runCollectorsByCondition("visibility")
        );
    }

    /* ----------------------------------------------------------------------
       WEB WORKER / SERVICE WORKER
    ---------------------------------------------------------------------- */
    if (typeof self !== "undefined" && typeof window === "undefined") {
        // Worker startup
        runCollectorsByCondition("worker-start");

        // SW install
        if ("addEventListener" in self) {
            self.addEventListener("install", () =>
                runCollectorsByCondition("sw-install")
            );
            self.addEventListener("activate", () =>
                runCollectorsByCondition("sw-activate")
            );
            self.addEventListener("fetch", () =>
                runCollectorsByCondition("sw-fetch")
            );
        }
    }

    /* ----------------------------------------------------------------------
       CLOUDFLARE WORKERS / EDGE RUNTIME (Vercel/Netlify)
    ---------------------------------------------------------------------- */
    if (typeof globalThis?.WebSocketPair !== "undefined") {
        // Indicates Cloudflare Worker
        runCollectorsByCondition("edge-startup");
    }

    /* ----------------------------------------------------------------------
       DENO RUNTIME
    ---------------------------------------------------------------------- */
    if (typeof Deno !== "undefined") {
        runCollectorsByCondition("deno-start");

        try {
            Deno.addSignalListener("SIGTERM", () =>
                runCollectorsByCondition("signal")
            );
        } catch { }
    }

    /* ----------------------------------------------------------------------
       ELECTRON MAIN PROCESS
    ---------------------------------------------------------------------- */
    if (
        typeof process !== "undefined" &&
        process.versions &&
        process.versions.electron
    ) {
        runCollectorsByCondition("electron-start");

        try {
            const { app } = require("electron");
            app.on("ready", () => runCollectorsByCondition("electron-ready"));
            app.on("window-all-closed", () =>
                runCollectorsByCondition("electron-empty")
            );
            app.on("before-quit", () =>
                runCollectorsByCondition("electron-before-exit")
            );
        } catch { }
    }

    /* ----------------------------------------------------------------------
       ELECTRON RENDERER PROCESS
    ---------------------------------------------------------------------- */
    if (
        typeof window !== "undefined" &&
        navigator.userAgent.includes("Electron")
    ) {
        runCollectorsByCondition("electron-renderer-start");
    }

    /* ----------------------------------------------------------------------
       REACT NATIVE
    ---------------------------------------------------------------------- */
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
        runCollectorsByCondition("react-native-start");

        // App state changes
        try {
            const { AppState } = require("react-native");
            AppState.addEventListener("change", () =>
                runCollectorsByCondition("appstate")
            );
        } catch { }
    }

    /* ----------------------------------------------------------------------
       SSR FRAMEWORKS: Next / Nuxt / SvelteKit / Remix
    ---------------------------------------------------------------------- */
    if (typeof globalThis !== "undefined") {
        if (globalThis.__NEXT_DATA__) runCollectorsByCondition("next-ssr");
        if (globalThis.__NUXT__) runCollectorsByCondition("nuxt-ssr");
        if (globalThis.__SVELTEKIT_APP__) runCollectorsByCondition("sveltekit-ssr");
        if (globalThis.__remixContext) runCollectorsByCondition("remix-ssr");
    }

    /* ----------------------------------------------------------------------
       PERIODIC COLLECTION (Always Available)
    ---------------------------------------------------------------------- */
    try {
        setInterval(() => runCollectorsByCondition("periodic"), 60_000);
    } catch { }
}


/* ============================================================================
   OPTIONAL PERIODIC EXECUTION
============================================================================ */

export function startPeriodicCollectors(ms: number) {
    setInterval(() => runCollectorsByCondition("periodic"), ms).unref?.();
}


/* ============================================================================
   COLLECT EVERYTHING AT ONCE
============================================================================ */

export async function collectAllInfo() {
    const results = await Promise.all(INFO_COLLECTORS.map(runInfoCollector));

    return results.reduce((acc, r) => {
        acc[r.name] = r;
        return acc;
    }, {} as Record<string, InfoResult>);
}