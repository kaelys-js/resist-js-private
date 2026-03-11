import os from "os";
import process from "process";
import { execSync } from "child_process";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

/* ============================================================
   FULL PROCESS INSPECTOR
============================================================ */
export function getProcessInfo() {
    return {
        identity: getProcessIdentity(),
        runtime: getRuntimeInfo(),
        usage: getProcessUsage(),
        memory: getMemoryInfo(),
        eventLoop: getEventLoopInfo(),
        timers: getTimeInfo(),
        executable: getExecutableInfo(),
        platform: getPlatformInfo(),
        environment: getEnvInfo(),
        limits: getResourceLimits(),
        signals: getSignalInfo(),
        threads: getThreadInfo(),
        handles: getHandleInfo(),
        cwd: process.cwd(),
        argv: process.argv,
        execArgv: process.execArgv
    };
}

/* ============================================================
   1. IDENTITY
============================================================ */
function getProcessIdentity() {
    return {
        pid: process.pid,
        ppid: process.ppid,
        uid: process.getuid?.() ?? null,
        gid: process.getgid?.() ?? null,
        user: os.userInfo()?.username ?? null
    };
}

/* ============================================================
   2. RUNTIME INFO (Node / Bun / Deno / Cloudflare etc)
============================================================ */
function getRuntimeInfo() {
    const env = process.env;

    return {
        isNode: typeof process.versions?.node === "string",
        isBun: typeof process.versions?.bun === "string",
        isDeno: !!env.DENO,
        isCloudflareWorker:
            typeof globalThis?.caches !== "undefined" &&
            typeof globalThis?.WebSocketPair !== "undefined",

        versions: {
            node: process.versions?.node ?? null,
            bun: process.versions?.bun ?? null,
            deno: env.DENO_VERSION ?? null,
            v8: process.versions?.v8 ?? null,
            uv: process.versions?.uv ?? null,
            openssl: process.versions?.openssl ?? null,
            zlib: process.versions?.zlib ?? null,
            brotli: process.versions?.brotli ?? null
        }
    };
}

/* ============================================================
   3. CPU + MEMORY USAGE
============================================================ */
function getProcessUsage() {
    const usage = process.cpuUsage?.() ?? null;

    return {
        cpuUserMicros: usage?.user ?? null,
        cpuSystemMicros: usage?.system ?? null,
        uptimeSeconds: process.uptime(),
        loadAvg: os.loadavg()
    };
}

function getMemoryInfo() {
    const mem = process.memoryUsage?.() ?? {};

    return {
        rss: mem.rss ?? null,
        heapTotal: mem.heapTotal ?? null,
        heapUsed: mem.heapUsed ?? null,
        external: mem.external ?? null,
        arrayBuffers: mem.arrayBuffers ?? null,
        systemFree: os.freemem(),
        systemTotal: os.totalmem()
    };
}

/* ============================================================
   4. EVENT LOOP INFO
============================================================ */
function getEventLoopInfo() {
    try {
        const perf = require("perf_hooks");
        const delay = perf.monitorEventLoopDelay?.();

        if (delay) {
            delay.enable();
            return {
                min: delay.min,
                max: delay.max,
                mean: delay.mean,
                stddev: delay.stddev
            };
        }
    } catch {
        return { supported: false };
    }

    return { supported: false };
}

/* ============================================================
   5. TIMERS / CLOCK
============================================================ */
function getTimeInfo() {
    const hr = process.hrtime?.bigint?.() ?? null;

    return {
        hrtime: hr?.toString() ?? null,
        startTime: Date.now() - process.uptime() * 1000,
        uptimeSeconds: process.uptime(),
        now: Date.now()
    };
}

/* ============================================================
   6. EXECUTABLE / PATH
============================================================ */
function getExecutableInfo() {
    return {
        execPath: process.execPath,
        cwd: process.cwd(),
        argv: process.argv,
        execArgv: process.execArgv,
        envPath: process.env.PATH
    };
}

/* ============================================================
   7. PLATFORM
============================================================ */
function getPlatformInfo() {
    return {
        arch: process.arch,
        platform: process.platform,
        release: os.release(),
        hostname: os.hostname(),
        homedir: os.homedir(),
        tmpdir: os.tmpdir(),
        cpus: os.cpus(),
        networkInterfaces: os.networkInterfaces()
    };
}

/* ============================================================
   8. ENVIRONMENT
============================================================ */
function getEnvInfo() {
    return {
        NODE_ENV: process.env.NODE_ENV ?? null,
        TZ: process.env.TZ ?? null,
        LANG: process.env.LANG ?? null,
        LC_ALL: process.env.LC_ALL ?? null,
        PATH: process.env.PATH ?? null,
        HOME: process.env.HOME ?? null,
        PWD: process.env.PWD ?? null,

        // CI hints
        CI: process.env.CI ?? null,
        isCI: !!process.env.CI
    };
}

/* ============================================================
   9. SYSTEM RESOURCE LIMITS (ulimit)
============================================================ */
function getResourceLimits() {
    return {
        maxFileDescriptors: safe("ulimit -n"),
        maxProcesses: safe("ulimit -u"),
        maxStack: safe("ulimit -s"),
        maxMemory: safe("ulimit -m"),
        maxCpuTime: safe("ulimit -t")
    };
}

/* ============================================================
   10. SIGNALS SUPPORTED
============================================================ */
function getSignalInfo() {
    return {
        signals: process.allowedNodeEnvironmentFlags
            ? Object.keys(os.constants.signals ?? {})
            : Object.keys(os.constants.signals ?? {})
    };
}

/* ============================================================
   11. THREADPOOL + WORKERS
============================================================ */
function getThreadInfo() {
    let threadpool;
    try {
        threadpool = {
            size: process.env.UV_THREADPOOL_SIZE ?? null
        };
    } catch {
        threadpool = null;
    }

    return {
        threadpool,
        isMainThread: require("worker_threads")?.isMainThread ?? null,
        workerThreadsAvailable: !!require("worker_threads")
    };
}

/* ============================================================
   12. HANDLES (OPEN FILE DESCRIPTORS)
============================================================ */
function getHandleInfo() {
    try {
        const handles = safe("ls /proc/self/fd");
        return { handles };
    } catch {
        return { handles: null };
    }
}

console.log(getProcessInfo())