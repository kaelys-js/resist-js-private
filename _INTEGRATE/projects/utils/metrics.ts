//--------------------------------------------------------------
// UNIVERSAL METRICS (CPU, Memory, Event Loop, Network, Runtime)
//--------------------------------------------------------------

export function getMetricsInfo() {
    return {
        timestamp: Date.now(),
        runtime: detectRuntime(),

        memory: {
            usage: safeMemoryUsage(),
            heap: safeHeapStats(),
            heapSpace: safeHeapSpaceStats(),
            bun: safeBunRuntimeInfo(),
            v8: safeV8Stats(),
        },

        cpu: {
            load: safeLoad(),
            cores: safeCpuCount(),
            usagePercent: safeCpuUsagePercent(),
        },

        eventLoop: {
            delay: safeEventLoopDelay(),
            delayHistogram: safeEventLoopHistogram(),
        },

        network: {
            interfaces: safeNetworkInterfaces(),
            dns: safeDNSInfo(),
        },

        io: {
            readSpeed: safeDiskReadSpeed(),
            writeSpeed: safeDiskWriteSpeed(),
        },

        timers: {
            hrtime: safeHRTime(),
            uptime: safeUptime()
        }
    };
}

/* -----------------------------------------------------------
   RUNTIME DETECTION
----------------------------------------------------------- */
function detectRuntime() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (typeof WebSocketPair !== "undefined" && typeof caches !== "undefined") return "cloudflare-worker";
    if (typeof EdgeRuntime !== "undefined") return "edge-runtime";
    if (typeof process !== "undefined" && process.release?.name === "node") return "node";
    if (typeof window !== "undefined") return "browser";
    return "unknown";
}

/* -----------------------------------------------------------
   MEMORY USAGE (UNIVERSAL)
----------------------------------------------------------- */
function safeMemoryUsage() {
    try {
        if (typeof process !== "undefined" && process.memoryUsage) {
            const mu = process.memoryUsage();
            return {
                rss: mu.rss,
                heapTotal: mu.heapTotal,
                heapUsed: mu.heapUsed,
                external: mu.external,
                arrayBuffers: mu.arrayBuffers
            };
        }

        if (typeof performance !== "undefined" && performance.memory) {
            return performance.memory;
        }
    } catch {}
    return null;
}

/* -----------------------------------------------------------
   HEAP / V8 METRICS
----------------------------------------------------------- */
function safeHeapStats() {
    try {
        if (typeof Bun !== "undefined") return Bun.gcStats?.() ?? null;
        const v8 = require("v8");
        return v8.getHeapStatistics();
    } catch { return null; }
}

function safeHeapSpaceStats() {
    try {
        const v8 = require("v8");
        return v8.getHeapSpaceStatistics();
    } catch { return null; }
}

function safeV8Stats() {
    try {
        const v8 = require("v8");
        return {
            heapStats: v8.getHeapStatistics(),
            heapSpaces: v8.getHeapSpaceStatistics()
        };
    } catch { return null; }
}

/* -----------------------------------------------------------
   BUN-SPECIFIC METRICS
----------------------------------------------------------- */
function safeBunRuntimeInfo() {
    try {
        if (typeof Bun !== "undefined") {
            return {
                heap: Bun.heapStats?.() ?? null,
                jit: Bun.jitStats?.() ?? null,
                threads: Bun.threads?.length ?? null,
                fileHandles: Bun.fileHandles?.size ?? null
            };
        }
    } catch {}
    return null;
}

/* -----------------------------------------------------------
   CPU METRICS
----------------------------------------------------------- */
function safeLoad() {
    try { return require("os").loadavg(); }
    catch { return null; }
}

function safeCpuCount() {
    try { return require("os").cpus().length; }
    catch { return null; }
}

function safeCpuUsagePercent() {
    try {
        const start = process.cpuUsage();
        return new Promise(resolve => {
            setTimeout(() => {
                const end = process.cpuUsage(start);
                const total = end.user + end.system;
                resolve(total / 10000); // percentage estimate
            }, 100);
        });
    } catch {
        return null;
    }
}

/* -----------------------------------------------------------
   EVENT LOOP METRICS
----------------------------------------------------------- */
function safeEventLoopDelay() {
    try {
        const now = performance.now();
        let then = now;
        return new Promise(resolve => {
            setImmediate(() => {
                then = performance.now();
                resolve(then - now);
            });
        });
    } catch {
        return null;
    }
}

function safeEventLoopHistogram() {
    try {
        const { monitorEventLoopDelay } = require("perf_hooks");
        const h = monitorEventLoopDelay();
        h.enable();
        setTimeout(() => h.disable(), 100);
        return {
            min: h.min,
            max: h.max,
            mean: h.mean,
            stddev: h.stddev,
            percentiles: {
                p50: h.percentile(50),
                p75: h.percentile(75),
                p90: h.percentile(90),
                p99: h.percentile(99)
            }
        };
    } catch { return null; }
}

/* -----------------------------------------------------------
   NETWORK METRICS
----------------------------------------------------------- */
function safeNetworkInterfaces() {
    try { return require("os").networkInterfaces(); }
    catch { return null; }
}

function safeDNSInfo() {
    try {
        const dns = require("dns");
        return {
            servers: dns.getServers(),
            resolver: dns.Resolver ? "native" : "unknown"
        };
    } catch { return null; }
}

/* -----------------------------------------------------------
   DISK IO METRICS
----------------------------------------------------------- */
function safeDiskReadSpeed() {
    try {
        const fs = require("fs");
        const start = performance.now();
        fs.readFileSync(__filename);
        return performance.now() - start;
    } catch { return null; }
}

function safeDiskWriteSpeed() {
    try {
        const fs = require("fs");
        const tmp = ".tmp_disk_test";
        const start = performance.now();
        fs.writeFileSync(tmp, "x".repeat(1024));
        fs.unlinkSync(tmp);
        return performance.now() - start;
    } catch { return null; }
}

/* -----------------------------------------------------------
   PROCESS TIMERS
----------------------------------------------------------- */
function safeHRTime() {
    try { return process.hrtime.bigint?.().toString(); }
    catch { return null; }
}

function safeUptime() {
    try {
        if (typeof process !== "undefined") return process.uptime();
        if (typeof performance !== "undefined") return performance.now() / 1000;
    } catch {}
    return null;
}

console.log(getMetricsInfo())