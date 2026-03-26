import fs from "fs";
import path from "path";
import os from "os";

/* ============================================================
   Safe read helper
============================================================ */
function safeRead(p: string | null) {
    try {
        if (!p) return null;
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
    } catch {
        return null;
    }
}

/* ============================================================
   Parse .editorconfig (pure JS)
============================================================ */
function parseEditorConfig(content: string | null) {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const sections: Record<string, any> = {};
    let current: string | null = null;

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";"))
            continue;

        // Section header: [*.ts], [*], [src/**]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            current = trimmed.slice(1, -1).trim();
            sections[current] = {};
            continue;
        }

        // Key/value pair
        if (current && trimmed.includes("=")) {
            const [k, v] = trimmed.split("=").map(s => s.trim());
            sections[current][k] = v;
        }
    }

    return sections;
}

/* ============================================================
   Walk filesystem upward to find nearest .editorconfig
============================================================ */
function findEditorConfigUpwards(startDir: string) {
    let dir = startDir;

    while (true) {
        const candidate = path.join(dir, ".editorconfig");
        if (fs.existsSync(candidate)) return candidate;

        const parent = path.dirname(dir);
        if (parent === dir) break; // reached root FS
        dir = parent;
    }

    return null;
}

/* ============================================================
   MAIN: getEditorConfigInfo()
============================================================ */
export function getEditorConfigInfo() {
    const cwd = process.cwd();

    const projectPath = findEditorConfigUpwards(cwd);
    const workspaceRoot = findWorkspaceRoot(cwd);
    const workspacePath = workspaceRoot
        ? findEditorConfigUpwards(workspaceRoot)
        : null;

    const homePath = path.join(os.homedir(), ".editorconfig");
    const globalPath = fs.existsSync(homePath) ? homePath : null;

    const projectContent = safeRead(projectPath);
    const workspaceContent = safeRead(workspacePath);
    const globalContent = safeRead(globalPath);

    return {
        paths: {
            project: projectPath,
            workspace: workspacePath,
            global: globalPath
        },
        projectConfig: parseEditorConfig(projectContent),
        workspaceConfig: parseEditorConfig(workspaceContent),
        globalConfig: parseEditorConfig(globalContent),

        mergedConfig: mergeEditorConfigs([
            parseEditorConfig(globalContent),
            parseEditorConfig(workspaceContent),
            parseEditorConfig(projectContent)
        ])
    };
}

/* ============================================================
   Utility: detect monorepo root (pnpm/yarn/npm/lerna)
============================================================ */
function findWorkspaceRoot(cwd: string) {
    const markers = [
        "pnpm-workspace.yaml",
        "package.json",
        "lerna.json",
        "turbo.json",
        "nx.json"
    ];

    let dir = cwd;
    while (true) {
        if (markers.some(m => fs.existsSync(path.join(dir, m)))) {
            return dir;
        }

        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    return null;
}

/* ============================================================
   Merge multiple parsed .editorconfig files
============================================================ */
function mergeEditorConfigs(cfgs: (Record<string, any> | null)[]) {
    const out: Record<string, any> = {};

    for (const cfg of cfgs) {
        if (!cfg) continue;
        for (const section of Object.keys(cfg)) {
            out[section] = {
                ...(out[section] || {}),
                ...cfg[section]
            };
        }
    }

    return out;
}