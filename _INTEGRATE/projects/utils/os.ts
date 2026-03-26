import os from "os";
import fs from "fs";
import path from "path";
import child_process from "child_process";

/* ============================================================
   MASTER WRAPPER
============================================================ */
export function getOSInfo() {
    return {
        platform: detectPlatform(),
        distro: detectDistro(),
        kernel: detectKernel(),
        arch: os.arch(),
        cpu: extractCPUInfo(),
        memory: extractMemoryInfo(),
        uptime: extractUptimeInfo(),
        users: extractUserInfo(),
        shell: extractShellInfo(),
        env: extractOSEnv(process.env),
        paths: extractPaths(),
        filesystem: extractFilesystemInfo(),
        battery: extractBatteryInfo(),
        network: extractNetworkInfo(),
        virtualization: detectVirtualization(),
        container: detectContainer(),
        packageManagers: detectPackageManagers(),
        gpu: detectGPUInfo(),
        time: extractTimeInfo(),
    };
}

/* ============================================================
   PLATFORM / DISTRO / KERNEL
============================================================ */
function detectPlatform() {
    return {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        hostname: os.hostname(),
        tmpdir: os.tmpdir(),
        home: os.homedir(),
    };
}

function detectDistro() {
    const p = "/etc/os-release";
    if (fs.existsSync(p)) {
        const contents = fs.readFileSync(p, "utf8");
        const out: Record<string, string> = {};
        for (const line of contents.split("\n")) {
            const [k, v] = line.split("=");
            if (k && v) out[k] = v.replace(/"/g, "");
        }
        return out;
    }

    // macOS system_profiler
    if (os.platform() === "darwin") {
        try {
            const v = child_process.execSync("sw_vers", { encoding: "utf8" });
            const info: any = {};
            for (const line of v.split("\n")) {
                const [key, val] = line.split(":\t");
                if (key && val) info[key.trim()] = val.trim();
            }
            return info;
        } catch {}
    }

    return { name: os.platform() };
}

function detectKernel() {
    return {
        kernelVersion: os.version?.() || os.release(),
        machine: os.machine?.() || null,
    };
}

/* ============================================================
   CPU INFO
============================================================ */
function extractCPUInfo() {
    const cpus = os.cpus() || [];
    return {
        count: cpus.length,
        model: cpus[0]?.model ?? null,
        speedMHz: cpus[0]?.speed ?? null,
        details: cpus.map(c => ({
            model: c.model,
            speed: c.speed,
            times: c.times
        }))
    };
}

/* ============================================================
   MEMORY INFO
============================================================ */
function extractMemoryInfo() {
    return {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        loadAvg: os.loadavg?.() ?? null,
    };
}

/* ============================================================
   UPTIME / BOOT TIME
============================================================ */
function extractUptimeInfo() {
    const uptime = os.uptime();
    const boot = Date.now() - uptime * 1000;
    return {
        uptimeSeconds: uptime,
        bootTime: new Date(boot).toISOString()
    };
}

/* ============================================================
   USER INFO
============================================================ */
function extractUserInfo() {
    try {
        const u = os.userInfo();
        return {
            username: u.username,
            uid: u.uid,
            gid: u.gid,
            homedir: u.homedir,
            shell: u.shell
        };
    } catch {
        return null;
    }
}

/* ============================================================
   SHELL
============================================================ */
function extractShellInfo() {
    const env = process.env;
    return {
        shell: env.SHELL ?? null,
        terminal: env.TERM ?? null,
        termProgram: env.TERM_PROGRAM ?? null,
        termProgramVersion: env.TERM_PROGRAM_VERSION ?? null,
        shlvl: env.SHLVL ?? null,
    };
}

/* ============================================================
   OS-RELATED ENV VARS
============================================================ */
function extractOSEnv(env: NodeJS.ProcessEnv) {
    const patterns = [
        "LANG", "LC_", "PATH", "HOME", "SHELL", "TERM", "TMPDIR",
        "USER", "LOGNAME", "HOSTNAME", "PWD",
        "DISPLAY", "WAYLAND", "XDG_", "WINDOWID",
        "SSH_", "WSL", "COLORTERM"
    ];

    const out: Record<string, string> = {};
    for (const key in env) {
        if (patterns.some(p => key.startsWith(p))) {
            out[key] = env[key]!;
        }
    }
    return out;
}

/* ============================================================
   PATH directories
============================================================ */
function extractPaths() {
    const paths = (process.env.PATH || "").split(path.delimiter);
    return {
        count: paths.length,
        paths
    };
}

/* ============================================================
   FILESYSTEM INFO
============================================================ */
function extractFilesystemInfo() {
    const roots = ["/", os.homedir(), os.tmpdir()];
    const info: any[] = [];

    for (const p of roots) {
        try {
            const stat = fs.statSync(p);
            info.push({
                path: p,
                isDirectory: stat.isDirectory(),
                size: stat.size
            });
        } catch {
            info.push({
                path: p,
                error: true
            });
        }
    }

    return info;
}

/* ============================================================
   BATTERY / POWER INFO (macOS + Linux)
============================================================ */
function extractBatteryInfo() {
    try {
        // macOS IOKit
        if (os.platform() === "darwin") {
            const output = child_process.execSync("pmset -g batt", { encoding: "utf8" });
            return { raw: output.trim() };
        }

        // Linux upower
        if (fs.existsSync("/usr/bin/upower")) {
            const devices = child_process.execSync("upower -e", { encoding: "utf8" })
                .split("\n")
                .filter(x => x.includes("battery"));

            const data: any[] = [];
            for (const d of devices) {
                const out = child_process.execSync(`upower -i ${d}`, { encoding: "utf8" });
                data.push({ battery: d, details: out });
            }
            return data;
        }

        return null;
    } catch {
        return null;
    }
}

/* ============================================================
   NETWORK INFO
============================================================ */
function extractNetworkInfo() {
    return os.networkInterfaces();
}

/* ============================================================
   VIRTUALIZATION DETECTION
============================================================ */
function detectVirtualization() {
    try {
        const cpu = child_process.execSync("systemd-detect-virt", { encoding: "utf8" }).trim();
        return cpu || null;
    } catch {
        // macOS / Windows detection
        const env = process.env;
        if (env.CONTAINER || env.DOCKER) return "docker";
        if (env.VAGRANT) return "vagrant";
    }

    return null;
}

/* ============================================================
   CONTAINER DETECTION
============================================================ */
function detectContainer() {
    if (fs.existsSync("/.dockerenv")) return "docker";
    if (process.env.CONTAINER) return process.env.CONTAINER;
    if (process.env.DOCKER) return "docker";
    if (process.env.KUBERNETES_SERVICE_HOST) return "kubernetes";

    return null;
}

/* ============================================================
   PACKAGE MANAGER DETECTION
============================================================ */
function exists(cmd: string) {
    try {
        child_process.execSync(`command -v ${cmd}`, { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function detectPackageManagers() {
    const managers = ["brew", "apt", "dnf", "yum", "pacman", "zypp", "port", "nix", "flatpak", "snap"];
    const detected = managers.filter(exists);
    return detected;
}

/* ============================================================
   GPU INFO (macOS + Linux only)
============================================================ */
function detectGPUInfo() {
    try {
        if (os.platform() === "darwin") {
            const out = child_process.execSync("system_profiler SPDisplaysDataType", { encoding: "utf8" });
            return { raw: out };
        }
        if (exists("lspci")) {
            const out = child_process.execSync("lspci | grep -i vga", { encoding: "utf8" });
            return { raw: out };
        }
    } catch {}

    return null;
}

/* ============================================================
   TIME INFORMATION
============================================================ */
function extractTimeInfo() {
    return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        nowISO: new Date().toISOString(),
    };
}

console.log(getOSInfo())