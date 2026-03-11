import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

function safeRead(p: string | null): string | null {
    try {
        if (!p) return null;
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    } catch { return null; }
}

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch { return null; }
}

/* ============================================================
   1. Parse .gitattributes content
============================================================ */
function parseGitAttributes(content: string | null) {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const rules: any[] = [];

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;

        const parts = line.split(/\s+/);
        const pattern = parts.shift();
        const attrs: Record<string, any> = {};

        for (const attr of parts) {
            if (attr.includes("=")) {
                const [key, val] = attr.split("=", 2);
                attrs[key] = val;
            } else if (attr.startsWith("-")) {
                attrs[attr.slice(1)] = false;
            } else {
                attrs[attr] = true;
            }
        }

        rules.push({ pattern, attrs });
    }

    return rules;
}

/* ============================================================
   2. Walk up directory tree to find all .gitattributes
============================================================ */
function findGitAttributesUpwards(startDir: string) {
    const results: string[] = [];
    let dir = startDir;

    while (true) {
        const p = path.join(dir, ".gitattributes");
        if (fs.existsSync(p)) results.push(p);

        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return results;
}

/* ============================================================
   3. Global Git attributes locations
============================================================ */
function getGlobalGitAttributesPath() {
    const explicit = safe("git config --global core.attributesfile");
    if (explicit && fs.existsSync(explicit)) return explicit;

    const xdg = process.env.XDG_CONFIG_HOME
        ? path.join(process.env.XDG_CONFIG_HOME, "git", "attributes")
        : null;
    if (xdg && fs.existsSync(xdg)) return xdg;

    const home = path.join(os.homedir(), ".gitattributes");
    if (fs.existsSync(home)) return home;

    return null;
}

/* ============================================================
   4. Merge attribute rules
============================================================ */
function mergeAttributesList(listOfLists: any[][]) {
    const merged: Record<string, any> = {};

    for (const list of listOfLists) {
        if (!list) continue;
        for (const rule of list) {
            merged[rule.pattern] = {
                ...(merged[rule.pattern] || {}),
                ...rule.attrs
            };
        }
    }

    return merged;
}

/* ============================================================
   5. Determine git repo root (if any)
============================================================ */
function findGitRoot(startDir: string) {
    let dir = startDir;

    while (true) {
        if (fs.existsSync(path.join(dir, ".git"))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return null; // not in git repo
}

/* ============================================================
   6. Main: getGitAttributesInfo()
============================================================ */
export function getGitAttributesInfo() {
    const cwd = process.cwd();

    const gitRoot = findGitRoot(cwd);
    const localAttrs = findGitAttributesUpwards(cwd);

    const workspaceRoot = gitRoot;
    const globalAttrs = getGlobalGitAttributesPath();

    const parsedLocal = localAttrs.map(p => ({
        path: p,
        rules: parseGitAttributes(safeRead(p))
    }));

    const parsedGlobal = globalAttrs
        ? { path: globalAttrs, rules: parseGitAttributes(safeRead(globalAttrs)) }
        : null;

    const merged = mergeAttributesList([
        parsedGlobal?.rules ?? [],
        ...parsedLocal.map(x => x.rules)
    ]);

    return {
        paths: {
            local: localAttrs,
            global: globalAttrs,
            gitRoot
        },
        localRules: parsedLocal,
        globalRules: parsedGlobal,
        mergedRules: merged
    };
}