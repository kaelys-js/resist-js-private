export function getBunOnlyInfo() {
    return {
        bun: {
            version: Bun.version,
            revision: Bun.revision ?? null,
            execPath: Bun.execPath,
            cwd: Bun.cwd,
            argv: Bun.argv,
            env: extractBunEnv(),
            apis: listBunApis(),
            features: detectBunFeatures(),
            transpilerDefaults: getTranspilerDefaults(),
            buildInfo: getBunBuildInfo(),
            compileInfo: getCompileSupportInfo(),
            testRunner: getTestRunnerInfo(),
            httpCapabilities: getHttpCapabilities(),
            shellSupport: typeof Bun.$ === "function",
            jsc: getJscRuntimeInfo(),
            wasiAvailable: !!(Bun as any).wasi
        }
    };
}

/* ------------------------------
   Bun ENV (only Bun-owned keys)
--------------------------------*/
function extractBunEnv() {
    const bunEnvKeys = [
        "BUN_INSTALL",
        "BUN_DEBUG",
        "BUN_PROFILE",
        "BUN_AUTOINSTALL",
        "BUN_COLOR",
        "BUN_VERSION",
        "BUN_CACHE_DIR",
        "BUN_ENV",
        "BUN_WORKDIR",
        "BUN_DISABLE_AUTOUPDATE"
    ];

    const out: Record<string, string | null> = {};
    for (const key of bunEnvKeys) out[key] = Bun.env[key] ?? null;
    return out;
}

/* ------------------------------
   Bun API surface
--------------------------------*/
function listBunApis() {
    return Object.getOwnPropertyNames(Bun).sort();
}

/* ------------------------------
   Bun runtime features
--------------------------------*/
function detectBunFeatures() {
    return {
        esm: true,
        commonjs: true,
        typescript: true,
        jsx: true,
        macros: true,
        fileIO: typeof Bun.file === "function",
        fetch: typeof Bun.fetch === "function",
        ffi: typeof Bun.ffi === "function",
        subprocess: typeof Bun.spawn === "function",
        bundler: typeof Bun.build === "function",
        http: typeof Bun.serve === "function",
        websockets: typeof Bun.serve === "function",
        pluginSystem: typeof Bun.plugin === "function",
        shell: typeof Bun.$ === "function",
    };
}

/* ------------------------------
   Bun Transpiler defaults
--------------------------------*/
function getTranspilerDefaults() {
    const t = new Bun.Transpiler({ loader: "ts" });
    return {
        loader: t.loader,
        platform: t.platform,
        tsconfig: t.tsconfig ?? null,
        minify: t.minify ?? false,
        jsx: t.jsx ?? null,
        env: t.env ?? null
    };
}

/* ------------------------------
   Bun build info (internal)
--------------------------------*/
function getBunBuildInfo() {
    // _buildInfo is undocumented but widely used
    const raw = (Bun as any)._buildInfo ?? null;

    if (!raw) return null;

    return {
        commitHash: raw.commit ?? null,
        target: raw.target ?? null,
        optimize: raw.optimize ?? null,
        profile: raw.profile ?? null,
        timestamp: raw.timestamp ?? null,
        version: raw.version ?? null,
        features: raw.features ?? null,
        arch: raw.arch ?? null,
        os: raw.os ?? null
    };
}

/* ------------------------------
   Bun.build() capability report
--------------------------------*/
function getCompileSupportInfo() {
    if (typeof Bun.build !== "function") return null;

    return {
        supportsBuild: true,
        // Show what Bun accepts as build loaders / formats
        supportedOptions: [
            "entrypoints", "outdir", "minify", "sourcemap", "target",
            "external", "format", "platform", "root", "loader",
            "splitting", "plugins", "define"
        ]
    };
}

/* ------------------------------
   Bun test runner info
--------------------------------*/
function getTestRunnerInfo() {
    return {
        jestShim: !!(Bun as any).jest,
        bunTest: typeof Bun.test === "function",
        expect: typeof Bun.expect === "function"
    };
}

/* ------------------------------
   Bun HTTP/TCP/WebSocket capabilities
--------------------------------*/
function getHttpCapabilities() {
    if (typeof Bun.serve !== "function") return null;

    try {
        const caps = Bun.serve({
            port: 0,
            fetch(req) { return new Response("ok"); }
        });

        const out = {
            supportsFetchHandler: true,
            supportsWebSocket: typeof caps.upgrade === "function",
            hostname: caps.hostname ?? null,
            port: caps.port ?? null,
        };

        caps.stop();
        return out;
    } catch {
        return {
            supportsFetchHandler: false,
            supportsWebSocket: false
        };
    }
}

/* ------------------------------
   JavaScriptCore internal runtime info
--------------------------------*/
function getJscRuntimeInfo() {
    const jsc = (Bun as any).jsc;
    if (!jsc) return null;

    return {
        vmVersion: jsc.vmVersion ?? null,
        bytecodeVersion: jsc.bytecodeVersion ?? null,
        jitEnabled: jsc.isJITEnabled?.() ?? null,
        heap: tryCall(() => jsc.heap?.(), null),
        memoryUsage: tryCall(() => jsc.memoryUsage?.(), null),
        gc: {
            runGC: typeof jsc.gc === "function",
            lastGC: tryCall(() => jsc.gc?.(), null)
        }
    };
}

function tryCall(fn: () => any, fallback: any) {
    try { return fn(); } catch { return fallback; }
}

console.log(getBunOnlyInfo())