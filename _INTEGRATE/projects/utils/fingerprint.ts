import crypto from "crypto";
import fs from "fs";
import os from "os";
import child_process from "child_process";

export function getUniversalFingerprint() {
    const parts: any = {};

    /* ============================================================
       LAYER 1 — HARDWARE & VM IDENTIFIERS
    ============================================================ */

    // Linux machine-id
    const machineIdPaths = [
        "/etc/machine-id",
        "/var/lib/dbus/machine-id"
    ];
    for (const p of machineIdPaths) {
        if (fs.existsSync(p)) {
            parts.machineId = fs.readFileSync(p, "utf8").trim();
            break;
        }
    }

    // macOS hardware UUID
    if (process.platform === "darwin") {
        try {
            const out = child_process
                .execSync("ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID")
                .toString();
            const match = out.match(/"IOPlatformUUID" = "([^"]+)"/);
            if (match) parts.hardwareUUID = match[1];
        } catch { }
    }

    // Windows MachineGuid
    if (process.platform === "win32") {
        try {
            const out = child_process.execSync(
                'reg query HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid',
                { encoding: "utf8" }
            );
            const match = out.match(/MachineGuid\s+REG_SZ\s+([^\s]+)/);
            if (match) parts.windowsMachineGuid = match[1];
        } catch { }
    }

    /* ============================================================
       LAYER 2 — CONTAINER / DOCKER / K8s FINGERPRINTING
    ============================================================ */

    // cgroup data (Docker, K8s, ECS, Fargate)
    try {
        if (fs.existsSync("/proc/self/cgroup")) {
            parts.cgroup = fs.readFileSync("/proc/self/cgroup", "utf8");
        }
    } catch { }

    // Container hostname (Docker gives unique container name)
    parts.containerHostname = os.hostname();

    // Docker container ID (first 12 hex chars)
    try {
        const cid = child_process.execSync("cat /proc/self/cgroup | grep docker | sed 's/.*\\///'", { encoding: "utf8" });
        if (cid) parts.dockerId = cid.trim();
    } catch { }

    // Root FS digest / overlayfs identity
    try {
        if (fs.existsSync("/proc/self/mountinfo")) {
            parts.mountInfoHash = hash(fs.readFileSync("/proc/self/mountinfo", "utf8"));
        }
    } catch { }

    /* ============================================================
       LAYER 3 — SERVERLESS FINGERPRINTING
    ============================================================ */

    // AWS Lambda
    if (process.env.AWS_LAMBDA_LOG_STREAM_NAME) {
        parts.lambda = {
            function: process.env.AWS_LAMBDA_FUNCTION_NAME,
            version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
            logStream: process.env.AWS_LAMBDA_LOG_STREAM_NAME
        };
    }

    // GCP Cloud Functions
    if (process.env.FUNCTION_TARGET) {
        parts.gcpFunction = {
            target: process.env.FUNCTION_TARGET,
            region: process.env.GCP_REGION ?? null
        };
    }

    // Cloudflare Workers
    if (process.env.CF_PAGES) {
        parts.cloudflare = {
            id: process.env.CF_PAGES,
            account: process.env.CF_ACCOUNT_ID
        };
    }

    // Vercel / Netlify / Cloud Run
    if (process.env.VERCEL_REGION) {
        parts.vercel = {
            region: process.env.VERCEL_REGION,
            env: process.env.VERCEL_ENV
        };
    }

    /* ============================================================
       LAYER 4 — RUNTIME + KERNEL FINGERPRINT FILLERS
    ============================================================ */

    // CPU features (works even in serverless)
    parts.cpu = {
        model: os.cpus()?.[0]?.model ?? "unknown",
        cores: os.cpus()?.length ?? 0,
        arch: os.arch(),
        kernel: os.release()
    };

    // Hash of /proc/cpuinfo (container-different)
    try {
        if (fs.existsSync("/proc/cpuinfo")) {
            parts.cpuInfoHash = hash(fs.readFileSync("/proc/cpuinfo", "utf8"));
        }
    } catch { }

    // Hash root directory listing (extremely stable in containers)
    try {
        const rootFiles = fs.readdirSync("/");
        parts.rootFsHash = hash(JSON.stringify(rootFiles));
    } catch { }

    /* ============================================================
       FINAL FINGERPRINT
    ============================================================ */

    const canonical = canonicalize(parts);
    const fingerprint = hash(JSON.stringify(canonical));

    return {
        fingerprint,
        details: canonical
    };
}

/* ------------------------------------------------------------ */
function hash(str: string) {
    return crypto.createHash("sha256").update(str).digest("hex");
}

function canonicalize(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;
    const out: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
        const val = obj[key];
        out[key] = typeof val === "object" ? canonicalize(val) : val;
    }
    return out;
}

console.log(getUniversalFingerprint())