import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

function safeRead(p: string) {
    try {
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    } catch { return null; }
}

function safeJSON(cmd: string) {
    try {
        return JSON.parse(execSync(cmd, { encoding: "utf8" }).trim());
    } catch {
        return null;
    }
}

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

/* ============================================================
   NPMRC DETECTION
============================================================ */

export function getNpmrcInfo() {
    const cwd = process.cwd();
    const projectNpmrc = path.join(cwd, ".npmrc");
    const userNpmrc = path.join(os.homedir(), ".npmrc");

    const globalPrefix = safe("npm config get prefix");
    const globalNpmrc =
        globalPrefix ? path.join(globalPrefix, "etc", "npmrc") : null;

    const project = safeRead(projectNpmrc);
    const user = safeRead(userNpmrc);
    const global = globalNpmrc ? safeRead(globalNpmrc) : null;

    // Effective npm config as JSON
    const effectiveConfig = safeJSON("npm config ls -l --json") ?? null;

    // Extract top keys if available
    const registry =
        effectiveConfig?.registry ??
        process.env.npm_config_registry ??
        null;

    return {
        projectNpmrcPath: fs.existsSync(projectNpmrc) ? projectNpmrc : null,
        userNpmrcPath: fs.existsSync(userNpmrc) ? userNpmrc : null,
        globalNpmrcPath: global && fs.existsSync(global) ? global : null,

        projectNpmrc: project,
        userNpmrc: user,
        globalNpmrc: global,

        registry,
        authToken: extractNpmToken(project, user, global),
        scopes: extractNpmScopes(project, user, global),

        proxy: effectiveConfig?.proxy ?? null,
        httpsProxy: effectiveConfig?.https_proxy ?? null,

        saveExact: effectiveConfig?.save_exact ?? null,
        savePrefix: effectiveConfig?.save_prefix ?? null,
        lockfileVersion: effectiveConfig?.lockfile_version ?? null,
        engineStrict: effectiveConfig?.engine_strict ?? null,

        // All settings
        effectiveConfig
    };
}

/* Extract npm token from .npmrc bodies */
function extractNpmToken(...bodies: (string | null)[]) {
    for (const body of bodies) {
        if (!body) continue;
        const match = body.match(/_authToken\s*=\s*(.+)/);
        if (match) return match[1].trim();
    }
    return null;
}

/* Extract all scopes from bodies */
function extractNpmScopes(...bodies: (string | null)[]) {
    const scopes: Record<string, string> = {};
    for (const body of bodies) {
        if (!body) continue;
        const lines = body.split("\n");
        for (const line of lines) {
            const m = line.match(/^@(.*?)\:registry\s*=\s*(.*)$/);
            if (m) scopes[`@${m[1]}`] = m[2].trim();
        }
    }
    return scopes;
}

/* ============================================================
   NVMRC DETECTION
============================================================ */

export function getNvmrcInfo() {
    const nvmrcPath = path.join(process.cwd(), ".nvmrc");
    const nvmrc = safeRead(nvmrcPath);
    const nvmVersion = nvmrc ? nvmrc.trim() : null;

    const usingNvm = !!process.env.NVM_DIR;

    const resolvedVersion = nvmVersion ? resolveNodeVersion(nvmVersion) : null;

    const currentNode = process.version.replace("v", "");

    return {
        nvmrcPath: fs.existsSync(nvmrcPath) ? nvmrcPath : null,
        nvmrcVersion: nvmVersion,
        resolvedActualVersion: resolvedVersion,
        usingNvm,
        nvmInstalledVersion:
            usingNvm ? safe(`nvm version ${nvmVersion}`)?.trim() : null,

        currentNodeVersion: currentNode,
        matches: resolvedVersion === currentNode
    };
}

/* Resolve aliases like “lts/*”, “node”, “stable” */
function resolveNodeVersion(input: string) {
    // If exact semver, return directly
    if (/^\d+\.\d+\.\d+$/.test(input)) return input;

    // If nvm available, ask it
    if (process.env.NVM_DIR) {
        const v = safe(`nvm version ${input}`);
        if (v && v.startsWith("v")) return v.replace("v", "");
    }

    // Fallback — cannot resolve
    return input;
}

/* ============================================================
   AGGREGATED API
============================================================ */

export function getNpmNvmInfo() {
    return {
        npmrc: getNpmrcInfo(),
        nvmrc: getNvmrcInfo()
    };
}