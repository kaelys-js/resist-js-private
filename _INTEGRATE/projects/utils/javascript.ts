export function getJavaScriptInfo() {
    return {
        runtime: detectRuntime(),
        engine: detectJSEngine(),
        moduleSystem: detectModuleSystem(),
        globals: detectGlobals(),
        timers: detectTimers(),
        webAPIs: detectWebAPIs(),
        nodeAPIs: detectNodeAPIs(),
        denoAPIs: detectDenoAPIs(),
        bunAPIs: detectBunAPIs(),
        cfWorkerAPIs: detectCloudflareWorkerAPIs(),
        browserInfo: detectBrowserInfo(),
        esmFeatures: detectESMFeatures(),

        memory: detectMemoryLimits(),
        wasm: detectWasmSupport(),
        bigint: detectBigIntSupport(),
        internationalization: detectIntlFeatures(),
        regex: detectRegexFeatures(),
        eventLoop: detectEventLoopCapabilities(),
        performance: detectPerformanceAPIs(),
        crypto: detectCryptoCapabilities(),
        typedArrays: detectTypedArrayCapabilities(),
    };
}

/* ============================================================
   JS RUNTIME (Node / Bun / Deno / Browser / Edge)
============================================================ */
function detectRuntime() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (typeof window !== "undefined" && typeof document !== "undefined")
        return "browser";
    if (typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope)
        return "web-worker";
    if (typeof WebSocketPair !== "undefined" && typeof caches !== "undefined")
        return "cloudflare-worker";
    if (process?.versions?.node) return "node";
    return "unknown";
}

/* ============================================================
   JS ENGINE (V8 / JavaScriptCore / SpiderMonkey / Hermes)
============================================================ */
function detectJSEngine() {
    return {
        v8: !!(globalThis?.process?.versions?.v8),
        jsc: typeof navigator !== "undefined" && navigator.userAgent.includes("Apple"),
        hermes: typeof HermesInternal !== "undefined",
        spidermonkey: typeof dump === "function" && !globalThis.process,
        version: globalThis?.process?.versions?.v8 ?? null,
    };
}

/* ============================================================
   MODULE SYSTEM (ESM/CommonJS/Bun loader)
============================================================ */
function detectModuleSystem() {
    return {
        isESM: typeof import === "function" && !!import.meta,
        isCJS: typeof module !== "undefined" && !!module.exports,
        esmSupported: true,
        importMeta: typeof import !== "undefined" ? true : false,
        dynamicImport: typeof import === "function",
        topLevelAwait: supportsTopLevelAwait(),
    };
}

function supportsTopLevelAwait() {
    try {
        new Function("return (async()=>1)()")();
        return true;
    } catch {
        return false;
    }
}

/* ============================================================
   GLOBALS
============================================================ */
function detectGlobals() {
    const globs = [
        "fetch", "WebSocket", "File", "Blob", "ReadableStream",
        "WritableStream", "TransformStream", "crypto", "navigator",
        "location", "document", "window", "process", "Bun", "Deno"
    ];
    const out: Record<string, boolean> = {};
    for (const g of globs) out[g] = typeof (globalThis as any)[g] !== "undefined";
    return out;
}

/* ============================================================
   TIMERS
============================================================ */
function detectTimers() {
    return {
        setTimeout: typeof setTimeout !== "undefined",
        setInterval: typeof setInterval !== "undefined",
        queueMicrotask: typeof queueMicrotask !== "undefined",
        nextTick: typeof process?.nextTick === "function",
        performanceNow: typeof performance?.now === "function",
    };
}

/* ============================================================
   WEB APIS
============================================================ */
function detectWebAPIs() {
    const apis = [
        "fetch",
        "URL",
        "URLSearchParams",
        "Headers",
        "Request",
        "Response",
        "FormData",
        "WebSocket",
        "BroadcastChannel",
        "EventTarget",
        "CustomEvent",
        "AbortController"
    ];
    const out: Record<string, boolean> = {};
    for (const a of apis) out[a] = typeof (globalThis as any)[a] !== "undefined";
    return out;
}

/* ============================================================
   NODE APIs
============================================================ */
function detectNodeAPIs() {
    if (!process?.versions?.node) return null;

    return {
        fs: tryRequire("fs"),
        path: tryRequire("path"),
        crypto: tryRequire("crypto"),
        http: tryRequire("http"),
        http2: tryRequire("http2"),
        https: tryRequire("https"),
        workerThreads: tryRequire("worker_threads"),
        vm: tryRequire("vm"),
        util: tryRequire("util"),
        cluster: tryRequire("cluster"),
        dns: tryRequire("dns"),
        os: tryRequire("os"),
        childProcess: tryRequire("child_process"),
        inspector: tryRequire("inspector"),
        timers: true,
    };
}

function tryRequire(name: string) {
    try { require(name); return true; } catch { return false; }
}

/* ============================================================
   DENO APIs
============================================================ */
function detectDenoAPIs() {
    if (typeof Deno === "undefined") return null;

    return {
        version: Deno.version,
        permissions: !!Deno.permissions,
        net: !!Deno.listen,
        fs: !!Deno.readFile,
        subprocess: !!Deno.run,
        kv: !!Deno.openKv,
    };
}

/* ============================================================
   BUN APIs
============================================================ */
function detectBunAPIs() {
    if (typeof Bun === "undefined") return null;

    return {
        version: Bun.version,
        runtime: Bun.revision,
        ffi: typeof Bun.ffi !== "undefined",
        serve: typeof Bun.serve === "function",
        file: typeof Bun.file === "function",
        sql: typeof Bun.sqlite === "function",
        hash: typeof Bun.hash === "function",
        events: typeof Bun.spawn === "function",
    };
}

/* ============================================================
   CLOUDFLARE WORKERS EDGE APIs
============================================================ */
function detectCloudflareWorkerAPIs() {
    return {
        isCFWorker: typeof WebSocketPair !== "undefined" && typeof caches !== "undefined",
        durableObjects: typeof (globalThis as any).DurableObject !== "undefined",
        kv: typeof (globalThis as any).KVNamespace !== "undefined",
        r2: typeof (globalThis as any).R2Bucket !== "undefined",
        queues: typeof (globalThis as any).Queue !== "undefined",
        htmlRewriter: typeof (globalThis as any).HTMLRewriter !== "undefined",
    };
}

/* ============================================================
   BROWSER INFO (ONLY IF BROWSER)
============================================================ */
function detectBrowserInfo() {
    if (typeof window === "undefined") return null;

    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        languages: navigator.languages,
        screen: {
            width: screen.width,
            height: screen.height,
            pixelRatio: window.devicePixelRatio,
        },
        storage: {
            localStorage: typeof localStorage !== "undefined",
            sessionStorage: typeof sessionStorage !== "undefined",
            indexedDB: typeof indexedDB !== "undefined"
        },
    };
}

/* ============================================================
   ESM FEATURES
============================================================ */
function detectESMFeatures() {
    return {
        dynamicImport: typeof import === "function",
        importMeta: typeof import.meta !== "undefined",
        topLevelAwait: supportsTopLevelAwait(),
        jsonModules: tryFeature("import('data:application/json,{\"x\":1}')"),
    };
}

function tryFeature(code: string) {
    try { new Function(code); return true; } catch { return false; }
}

/* ============================================================
   MEMORY LIMITS
============================================================ */
function detectMemoryLimits() {
    return {
        heapTotal: tryNodeMemory("heapTotal"),
        heapUsed: tryNodeMemory("heapUsed"),
        external: tryNodeMemory("external"),
        rss: tryNodeMemory("rss"),
        maxOldSpaceSize: process.env.NODE_OPTIONS?.match(/max-old-space-size=\d+/)?.[0] ?? null,
    };
}

function tryNodeMemory(field: string) {
    try { return process.memoryUsage?.()[field] ?? null; } catch { return null; }
}

/* ============================================================
   WASM SUPPORT
============================================================ */
function detectWasmSupport() {
    return {
        supported: typeof WebAssembly !== "undefined",
        streamCompile: typeof WebAssembly?.compileStreaming !== "undefined",
        instantiateStreaming: typeof WebAssembly?.instantiateStreaming !== "undefined",
    };
}

/* ============================================================
   BIGINT SUPPORT
============================================================ */
function detectBigIntSupport() {
    return {
        bigint: typeof BigInt !== "undefined",
        bigint64Array: typeof BigInt64Array !== "undefined",
        bigint128: false // not yet
    };
}

/* ============================================================
   INTL
============================================================ */
function detectIntlFeatures() {
    return {
        hasIntl: typeof Intl !== "undefined",
        locales: Intl?.DateTimeFormat?.supportedLocalesOf?.(["en", "fr", "ja", "zh"]) ?? [],
        numberFormat: typeof Intl?.NumberFormat !== "undefined",
        pluralRules: typeof Intl?.PluralRules !== "undefined",
        relativeTime: typeof Intl?.RelativeTimeFormat !== "undefined",
        segmenter: typeof Intl?.Segmenter !== "undefined",
    };
}

/* ============================================================
   REGEX ENGINE
============================================================ */
function detectRegexFeatures() {
    return {
        namedGroups: tryRegex(() => /(?<x>test)/.test("test")),
        lookbehind: tryRegex(() => /(?<=x)y/.test("xy")),
        unicodeSets: tryRegex(() => /\p{L}/u.test("A")),
        dotAll: tryRegex(() => /./s.test("\n")),
    };
}

function tryRegex(fn: Function) {
    try { return fn(); } catch { return false; }
}

/* ============================================================
   EVENT LOOP CAPABILITIES
============================================================ */
function detectEventLoopCapabilities() {
    return {
        microtasks: typeof queueMicrotask === "function",
        macrotasks: typeof setTimeout === "function",
        immediate: typeof setImmediate === "function",
        nextTick: typeof process?.nextTick === "function",
    };
}

/* ============================================================
   PERFORMANCE TIMERS
============================================================ */
function detectPerformanceAPIs() {
    return {
        now: typeof performance?.now === "function",
        timeOrigin: performance?.timeOrigin ?? null,
        memory: performance?.memory ?? null,
        eventCounts: performance?.eventCounts ?? null,
    };
}

/* ============================================================
   CRYPTO SUPPORT
============================================================ */
function detectCryptoCapabilities() {
    return {
        webcrypto: typeof crypto?.subtle !== "undefined",
        randomUUID: typeof crypto?.randomUUID === "function",
        randomValues: typeof crypto?.getRandomValues === "function",
    };
}

/* ============================================================
   TYPED ARRAY SUPPORT
============================================================ */
function detectTypedArrayCapabilities() {
    return {
        arrayBuffer: typeof ArrayBuffer !== "undefined",
        sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
        atomics: typeof Atomics !== "undefined",
        uint8: typeof Uint8Array !== "undefined",
        float64: typeof Float64Array !== "undefined",
        hugeArray: testHugeArraySupport(),
    };
}

function testHugeArraySupport() {
    try {
        new Uint8Array(2 ** 30);
        return true;
    } catch {
        return false;
    }
}