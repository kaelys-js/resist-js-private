/**
 * UNIVERSAL DEBUG INFORMATION
 * Works in: Bun, Node, Deno, Cloudflare Workers, AWS/GCP/Azure,
 * Docker, Kubernetes, CI, serverless, browser-like runtimes,
 * anything with a JS engine / V8 / JSC / QuickJS.
 */

export async function getUniversalDebugInfo() {
    const env = safeEnv();

    return {
        timestamp: new Date().toISOString(),
        runtime: getRuntimeInfo(),
        process: getProcessInfo(),
        memory: getMemoryInfo(),
        platform: getPlatformInfo(),
        env: getSafeEnvVars(env),
        terminal: getTerminalInfo(env),
        workspace: getWorkspaceInfo(),
        repository: await getRepoInfo(),
        container: getContainerInfo(env),
        cloud: getCloudProviderInfo(env),
        frameworks: getFrameworkInfo(),
        capabilities: getCapabilityInfo(),
        summary: getSummary()
    };
}

/* ============================================================
   SAFE ENV ACCESS (NEVER THROWS)
============================================================ */
function safeEnv() {
    try { return typeof process !== "undefined" ? process.env ?? {} : {}; }
    catch { return {}; }
}

/* ============================================================
   RUNTIME INFORMATION
============================================================ */
function getRuntimeInfo() {
    let runtime = "unknown";
    if (typeof Bun !== "undefined") runtime = "bun";
    else if (typeof Deno !== "undefined") runtime = "deno";
    else if (typeof EdgeRuntime !== "undefined") runtime = "edge-runtime";
    else if (typeof WebSocketPair !== "undefined" && typeof caches !== "undefined") runtime = "cloudflare-worker";
    else if (typeof process !== "undefined" && process.release?.name === "node") runtime = "node";
    else if (typeof window !== "undefined") runtime = "browser";

    return {
        runtime,
        version: getRuntimeVersion(),
        engine: detectEngine(),
        moduleSystem: detectModuleType(),
    };
}

function getRuntimeVersion() {
    try {
        if (typeof Bun !== "undefined") return Bun.version;
        if (typeof Deno !== "undefined") return Deno.version;
        if (typeof process !== "undefined" && process.version) return process.version;
    } catch {}
    return null;
}

function detectEngine() {
    if (typeof Bun !== "undefined") return "JavaScriptCore";
    if (typeof Deno !== "undefined") return "V8";
    if (typeof process !== "undefined") return "V8";
    if (typeof WebSocketPair !== "undefined") return "V8 (Cloudflare)";
    return "Unknown";
}

function detectModuleType() {
    try {
        if (typeof document !== "undefined") return "ESM";
        if (typeof Bun !== "undefined") return "ESM";
        if (typeof Deno !== "undefined") return "ESM";
        if (typeof process !== "undefined") {
            return process.env?.NODE_OPTIONS?.includes("--experimental-modules")
                ? "ESM"
                : "CommonJS or Mixed";
        }
    } catch {}
    return "Unknown";
}

/* ============================================================
   PROCESS INFORMATION (UNIVERSAL SAFE)
============================================================ */
function getProcessInfo() {
    try {
        if (typeof process === "undefined") return null;
        return {
            pid: process.pid,
            ppid: process.ppid,
            argv: process.argv,
            execPath: process.execPath,
            cwd: safeCwd(),
            uptime: process.uptime?.(),
            platform: process.platform,
            arch: process.arch
        };
    } catch {
        return null;
    }
}

function safeCwd() {
    try { return process.cwd(); } catch { return null; }
}

/* ============================================================
   MEMORY + CPU INFORMATION
============================================================ */
function getMemoryInfo() {
    let mem = {};
    try {
        mem = typeof process !== "undefined" && process.memoryUsage
            ? process.memoryUsage()
            : {};
    } catch {}

    const cpus = (() => {
        try { return require("os").cpus() ?? null; }
        catch { return null; }
    })();

    return {
        memory: mem,
        cpuCount: cpus ? cpus.length : null,
        loadAverage: safeLoadAvg()
    };
}

function safeLoadAvg() {
    try { return require("os").loadavg(); }
    catch { return null; }
}

/* ============================================================
   PLATFORM INFORMATION
============================================================ */
function getPlatformInfo() {
    return {
        os: safeOS(),
        release: safeOSRelease(),
        version: safePlatformVersion()
    };
}

function safeOS() {
    try { return require("os").platform(); } catch { return null; }
}
function safeOSRelease() {
    try { return require("os").release(); } catch { return null; }
}
function safePlatformVersion() {
    try { return require("os").version(); } catch { return null; }
}

/* ============================================================
   SAFE ENV (ONLY NON-SENSITIVE VARIABLES)
============================================================ */
function getSafeEnvVars(env: Record<string, string | undefined>) {
    const SAFE_PREFIXES = [
        "CI", "BUILD", "VERCEL", "NETLIFY", "CLOUDFLARE",
        "AWS", "AZURE", "GCP", "GOOGLE", "DENO",
        "NODE_", "BUN_", "PNPM_", "YARN", "NPM_",
        "HOME", "PATH", "LANG", "SHELL", "TERM", "TZ"
    ];

    const out: Record<string, string> = {};

    for (const k in env) {
        if (SAFE_PREFIXES.some(p => k.startsWith(p))) out[k] = env[k]!;
    }
    return out;
}

/* ============================================================
   TERMINAL INFORMATION
============================================================ */
function getTerminalInfo(env: Record<string, string | undefined>) {
    return {
        term: env.TERM ?? null,
        shell: env.SHELL ?? null,
        color: env.COLORTERM ?? null,
        program: env.TERM_PROGRAM ?? null,
        interactive: isInteractive(),
        supportsColor: detectColorSupport()
    };
}

function isInteractive() {
    try { return !!process.stdout.isTTY; }
    catch { return null; }
}

function detectColorSupport() {
    try { return require("supports-color")?.stdout ?? null; }
    catch { return null; }
}

/* ============================================================
   WORKSPACE INFORMATION
============================================================ */
function getWorkspaceInfo() {
    return {
        cwd: safeCwd(),
        packageJson: safePackageJson(),
        lockfiles: detectLockfiles(),
        monorepo: detectMonorepo()
    };
}

function safePackageJson() {
    try {
        const fs = require("fs");
        if (fs.existsSync("package.json"))
            return JSON.parse(fs.readFileSync("package.json", "utf8"));
    } catch {}
    return null;
}

function detectLockfiles() {
    const fs = safeFS();
    if (!fs) return null;

    return {
        bun: fs.existsSync("bun.lockb") || fs.existsSync("bun.lock"),
        npm: fs.existsSync("package-lock.json"),
        yarn: fs.existsSync("yarn.lock"),
        pnpm: fs.existsSync("pnpm-lock.yaml")
    };
}

function detectMonorepo() {
    const fs = safeFS();
    if (!fs) return null;

    return {
        pnpmWorkspace: fs.existsSync("pnpm-workspace.yaml"),
        yarnWorkspaces: safePackageJson()?.workspaces ?? null,
        turbo: fs.existsSync("turbo.json"),
        nx: fs.existsSync("nx.json"),
        lerna: fs.existsSync("lerna.json")
    };
}

/* ============================================================
   REPOSITORY INFO (SAFE)
============================================================ */
async function getRepoInfo() {
    const fs = safeFS();
    if (!fs) return null;

    if (!fs.existsSync(".git")) return { inGitRepo: false };

    return {
        inGitRepo: true,
        commit: await safeGit("git rev-parse HEAD"),
        branch: await safeGit("git rev-parse --abbrev-ref HEAD"),
        lastCommit: await safeGit("git log -1 --pretty=%B")
    };
}

async function safeGit(cmd: string) {
    try {
        const { execSync } = require("child_process");
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

/* ============================================================
   CONTAINER DETECTION
============================================================ */
function getContainerInfo(env: Record<string, string>) {
    return {
        docker: env.CONTAINER || env.DOCKER || null,
        kubernetes: env.KUBERNETES_SERVICE_HOST ? true : false,
        ci: detectCI(env)
    };
}

function detectCI(env: Record<string, string>) {
    const CI_KEYS = [
        "GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI", "TRAVIS",
        "APPVEYOR", "BITBUCKET_PIPELINES", "AZURE_PIPELINES",
        "BUILD_ID", "CI"
    ];

    return CI_KEYS.some(k => env[k]) ? true : false;
}

/* ============================================================
   CLOUD PROVIDER DETECTION
============================================================ */
function getCloudProviderInfo(env: Record<string, string>) {
    return {
        aws: env.AWS_REGION || env.LAMBDA_TASK_ROOT ? true : false,
        gcp: env.GCP_PROJECT || env.FUNCTION_TARGET ? true : false,
        azure: env.WEBSITE_INSTANCE_ID ? true : false,
        cloudflare: env.CF_REGION ? true : false,
        vercel: env.VERCEL ? true : false,
        netlify: env.NETLIFY ? true : false,
        fly: env.FLY_APP_NAME ? true : false,
        render: env.RENDER ? true : false,
        railway: env.RAILWAY_PROJECT_ID ? true : false,
        heroku: env.HEROKU_SLUG_ID ? true : false
    };
}

/* ============================================================
   FRAMEWORK DETECTION
============================================================ */
function getFrameworkInfo() {
    const pkg = safePackageJson();
    if (!pkg) return null;

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    function has(name: string) {
        return deps && !!deps[name];
    }

    return {
        react: has("react"),
        next: has("next"),
        svelte: has("svelte"),
        sveltekit: has("@sveltejs/kit"),
        vue: has("vue"),
        nuxt: has("nuxt"),
        astro: has("astro"),
        solid: has("solid-js"),
        qwik: has("@builder.io/qwik"),
        remix: has("@remix-run/react")
    };
}

/* ============================================================
   CAPABILITY DETECTION
============================================================ */
function getCapabilityInfo() {
    return {
        fetch: typeof fetch !== "undefined",
        crypto: typeof crypto !== "undefined",
        webstreams: typeof ReadableStream !== "undefined",
        workers: typeof Worker !== "undefined",
        wasm: typeof WebAssembly !== "undefined",
        fs: safeFS() !== null
    };
}

function safeFS() {
    try { return require("fs"); } catch { return null; }
}

/* ============================================================
   SUMMARY
============================================================ */
function getSummary() {
    return {
        environment: detectEnvironment(),
        stable: true,
        recommendations: []
    };
}

function detectEnvironment() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (typeof EdgeRuntime !== "undefined") return "edge-runtime";
    if (typeof WebSocketPair !== "undefined") return "cloudflare-worker";
    if (typeof process !== "undefined" && process.env?.CI) return "ci";
    if (typeof process !== "undefined" && process.release?.name === "node") return "node";
    if (typeof window !== "undefined") return "browser";
    return "unknown";
}