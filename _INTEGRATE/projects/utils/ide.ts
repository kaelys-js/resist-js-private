import fs from "fs";
import path from "path";
import os from "os";

/* ============================================================
   UNIVERSAL EXTENSION LOCATIONS FOR ALL IDEs
============================================================ */
const EXTENSION_PATHS = [
    // === Cursor ===
    path.join(os.homedir(), "Library/Application Support/Cursor/User/globalStorage"),
    path.join(os.homedir(), "Library/Application Support/Cursor/extensions"),

    // === VS Code Desktop ===
    path.join(os.homedir(), ".vscode/extensions"),
    path.join(os.homedir(), "Library/Application Support/Code/User/globalStorage"),

    // === VS Code Insiders ===
    path.join(os.homedir(), ".vscode-insiders/extensions"),

    // === VS Code OSS / VSCodium ===
    path.join(os.homedir(), ".vscode-oss/extensions"),
    path.join(os.homedir(), ".vscodium/extensions"),

    // === JetBrains IDEs (WebStorm/IntelliJ/PyCharm/etc.) ===
    path.join(os.homedir(), "Library/Application Support/JetBrains"),
    path.join(os.homedir(), "Library/Application Support/JetBrains/*/plugins"),

    // === Zed ===
    path.join(os.homedir(), ".local/share/zed/extensions"),
    path.join(os.homedir(), "Library/Application Support/Zed/extensions"),

    // === Sublime Text ===
    path.join(os.homedir(), "Library/Application Support/Sublime Text/Installed Packages"),
    path.join(os.homedir(), "Library/Application Support/Sublime Text/Packages"),

    // === Atom (deprecated but still installed sometimes) ===
    path.join(os.homedir(), ".atom/packages"),

    // === Lapce ===
    path.join(os.homedir(), ".local/share/lapce/plugins"),

    // === Helix ===
    path.join(os.homedir(), ".config/helix/runtime"),

    // === Neovim ===
    path.join(os.homedir(), ".local/share/nvim/site/pack"),
    path.join(os.homedir(), ".config/nvim/pack"),

    // === Vim ===
    path.join(os.homedir(), ".vim/pack"),
    path.join(os.homedir(), ".vim/bundle"),

    // === Nova ===
    path.join(os.homedir(), "Library/Application Support/Nova/Extensions"),

    // === Onivim ===
    path.join(os.homedir(), ".config/oni2/extensions"),

    // === Lite XL ===
    path.join(os.homedir(), ".config/lite-xl/plugins"),

    // === Replit (local offline dev) ===
    path.join(os.homedir(), ".replit/extensions"),

    // === Gitpod workspace extensions (local synced) ===
    path.join(os.homedir(), ".gitpod/ide/extensions"),
];

/* =======================================================================
   VERSION RESOLUTION HELPERS
======================================================================= */

// VS Code / Cursor / VSCodium → package.json
function readPackageJSON(extPath: string) {
    const manifest = path.join(extPath, "package.json");
    if (!fs.existsSync(manifest)) return null;
    try {
        const json = JSON.parse(fs.readFileSync(manifest, "utf8"));
        return {
            version: json.version ?? null,
            versionSource: "package.json"
        };
    } catch {
        return null;
    }
}

// Atom → package.json
const readAtomVersion = readPackageJSON;

// JetBrains → plugin.xml
function readJetBrainsPluginXML(extPath: string) {
    const xmlPath = path.join(extPath, "plugin.xml");
    if (!fs.existsSync(xmlPath)) return null;

    try {
        const xml = fs.readFileSync(xmlPath, "utf8");
        const match = xml.match(/<version>(.*?)<\/version>/);
        return {
            version: match ? match[1] : null,
            versionSource: "plugin.xml"
        };
    } catch {
        return null;
    }
}

// Sublime → .sublime-package (zip with metadata)
function readSublimeVersion(pkgPath: string) {
    if (!pkgPath.endsWith(".sublime-package"))
        return null;

    // Without unzip: only possible version detection is via filename
    const match = pkgPath.match(/-(\d+\.\d+\.\d+)\.sublime-package$/);
    return {
        version: match ? match[1] : null,
        versionSource: match ? "filename" : "none"
    };
}

// Lapce → plugin.toml
function readLapceVersion(extPath: string) {
    const tomlPath = path.join(extPath, "plugin.toml");
    if (!fs.existsSync(tomlPath)) return null;

    try {
        const txt = fs.readFileSync(tomlPath, "utf8");
        const match = txt.match(/version\s*=\s*"(.+?)"/);
        return {
            version: match ? match[1] : null,
            versionSource: "plugin.toml"
        };
    } catch {
        return null;
    }
}

// Helix → runtime directory (no manifest)
function readHelixVersion() {
    return {
        version: null,
        versionSource: "none"
    };
}

// Onivim → extension manifest (package.json)
const readOnivimVersion = readPackageJSON;

// Lite XL → plugin.lua (no version standard)
function readLiteXLVersion() {
    return {
        version: null,
        versionSource: "none"
    };
}

// Neovim / Vim → Git repos or directories
function readVimPluginVersion(extPath: string) {
    const gitPath = path.join(extPath, ".git");
    if (fs.existsSync(gitPath)) {
        return {
            version: "git",
            versionSource: "git"
        };
    }
    return {
        version: null,
        versionSource: "none"
    };
}

/* =======================================================================
   MAIN UNIVERSAL EXTENSION COLLECTOR
======================================================================= */
export function listAllExtensionsWithVersions() {
    const results: Array<{
        path: string;
        extension: string;
        resolvedPath: string;
        version: string | null;
        versionSource: string;
    }> = [];

    for (const base of EXTENSION_PATHS) {
        if (!fs.existsSync(base)) continue;

        // JetBrains plugin directory is nested (AppName*/plugins)
        if (base.includes("JetBrains")) {
            const dirs = fs.readdirSync(base);
            for (const jetDir of dirs) {
                const pluginDir = path.join(base, jetDir, "plugins");
                if (!fs.existsSync(pluginDir)) continue;

                const plugins = fs.readdirSync(pluginDir);
                for (const p of plugins) {
                    const full = path.join(pluginDir, p);
                    const versionInfo = readJetBrainsPluginXML(full) || {
                        version: null,
                        versionSource: "none"
                    };

                    results.push({
                        path: pluginDir,
                        extension: p,
                        resolvedPath: full,
                        ...versionInfo
                    });
                }
            }
            continue;
        }

        const entries = fs.readdirSync(base);
        for (const entry of entries) {
            const full = path.join(base, entry);
            let versionData = null;

            if (entry.endsWith(".sublime-package")) {
                versionData = readSublimeVersion(entry);
            } else {
                versionData =
                    readPackageJSON(full) ||
                    readAtomVersion(full) ||
                    readLapceVersion(full) ||
                    readOnivimVersion(full) ||
                    (base.includes("helix") ? readHelixVersion() : null) ||
                    (base.includes("nvim") || base.includes(".vim")
                        ? readVimPluginVersion(full)
                        : null);
            }

            results.push({
                path: base,
                extension: entry,
                resolvedPath: full,
                version: versionData?.version ?? null,
                versionSource: versionData?.versionSource ?? "none"
            });
        }
    }

    return results;
}

/* ============================================================
   IDE SUPER-DETECTION SYSTEM — FINAL COMPLETE VERSION
   Works for Cursor, VS Code, JetBrains, Zed, Gitpod, Codespaces,
   Replit, Cloud9, WebContainer, and every other modern IDE.
============================================================ */

export function getIDEInfo() {
    const env = process.env;

    return {
        detectedIDE: detectIDE(env),
        ideSignals: extractAllIDESignals(env),
        environmentVariables: extractIDEEnv(env),

        terminal: extractTerminalInfo(env),
        terminalHost: extractTerminalHost(env),
        shellIntegration: extractShellIntegration(env),

        remote: extractRemoteSessionInfo(env),
        editorMode: detectEditorMode(env),
        spawn: detectIDESpawn(env),

        workspace: extractWorkspaceInfo(env),
        workspaceSource: detectWorkspaceSource(env),

        editorHints: extractEditorHints(env),
        editorBinary: getEditorBinaryInfo(),
        editorPaths: extractEditorInjectedPaths(env),

        extensions: listAllExtensionsWithVersions()
    };
}

/* ============================================================
   1. MAIN IDE DETECTION ENGINE
============================================================ */
function detectIDE(env: NodeJS.ProcessEnv): string {

    // ======== CURSOR (Your actual environment) ===========
    if (env.CURSOR_TRACE_ID) return "Cursor";
    if (env.VSCODE_GIT_ASKPASS_NODE?.includes("Cursor.app")) return "Cursor";
    if (env.VSCODE_GIT_ASKPASS_MAIN?.includes("Cursor.app")) return "Cursor";
    if (env.VSCODE_GIT_IPC_HANDLE?.includes("vscode-git") &&
        (process.execPath?.includes("Cursor.app") || process.argv[0]?.includes("Cursor.app")))
        return "Cursor";

    // ======== VSCODIUM (VS Code OSS) ============
    if (env.VSCODE_PORTABLE === "codium" || "VSCODIUM" in env) return "VSCodium";

    // ======== CLOUD IDEs ============
    if (env.CODESPACES === "true") return "GitHub Codespaces";
    if (env.GITPOD_WORKSPACE_ID) return "Gitpod";
    if (env.REPL_ID || env.REPLIT_DEV) return "Replit";
    if (env.C9_USER || env.C9_PID) return "AWS Cloud9";
    if (env.STACKBLITZ || env.WEB_CONTAINER_API) return "StackBlitz";
    if (env.TURBO_LABS || env.WEB_CONTAINER) return "WebContainer";

    // ======== JETBRAINS ============
    if (env.JB_RUNNING === "true") return "JetBrains IDE";
    if (env.IDEA_INITIAL_DIRECTORY) return "JetBrains IDE";
    if (env.JETBRAINS_HOSTED) return "JetBrains IDE";

    // ======== OTHER NON-VSCODE EDITORS ============
    if (env.ZED_TERMINAL) return "Zed";
    if (env.NOVA_PID) return "Nova";
    if (env.SUBLIME_SESSION_ID) return "Sublime Text";
    if (env.ATOM_HOME) return "Atom";
    if (env.ONIVIM) return "Onivim";
    if (env.EMACS || env.DOOMDIR) return "Emacs";
    if (env.VIMRUNTIME) return "Vim";
    if (env.NVIM_LISTEN_ADDRESS) return "Neovim";
    if (env.HELIX_RUNTIME) return "Helix";
    if (env.LITEXL_SESSION) return "Lite XL";
    if (env.LAPCE_APP_VERSION) return "Lapce";

    // ======== VS CODE SPECIAL ENVIRONMENTS ============
    if (env.DEVCONTAINER === "true") return "VS Code DevContainer";
    if (env.WSL_DISTRO_NAME && env.TERM_PROGRAM === "vscode") return "VS Code WSL";
    if (env.SSH_CONNECTION && env.TERM_PROGRAM === "vscode") return "VS Code Remote SSH";
    if (env.VSCODE_BROWSER_ENVIRONMENT === "true") return "VS Code Web";
    if (env.VSCODE_BUILD === "insider") return "VS Code Insiders";

    // ======== BASELINE VS CODE ============
    if (env.TERM_PROGRAM === "vscode") return "VS Code";
    if ("VSCODE_PID" in env) return "VS Code";
    if ("VSCODE_CWD" in env) return "VS Code";
    if ("VSCODE_AMD_ENTRYPOINT" in env) return "VS Code";

    return "Unknown";
}

/* ============================================================
   2. IDE-RELATED ENV VARS (Pattern-based extraction)
============================================================ */
function extractIDEEnv(env: NodeJS.ProcessEnv) {
    const patterns = [
        "CURSOR", "VSCODE", "VSCODIUM", "CODE_", "JB_", "JETBRAINS", "IDEA",
        "ZED", "NOVA", "SUBLIME", "ATOM", "ONIVIM", "OVIM",
        "EMACS", "DOOM", "VIM", "NVIM", "HELIX", "LITEXL", "LAPCE",
        "CODESPACES", "GITPOD", "STACKBLITZ", "WEB_CONTAINER",
        "REPL", "REPLIT", "C9_", "DEVCONTAINER", "CONTAINER_WORKSPACE",
        "SSH_CONNECTION", "WSL", "TERM_PROGRAM"
    ];

    const out: Record<string, string> = {};
    for (const key in env) {
        if (patterns.some(p => key.includes(p))) out[key] = env[key]!;
    }
    return out;
}

/* ============================================================
   3. Terminal Info (Basic)
============================================================ */
function extractTerminalInfo(env: NodeJS.ProcessEnv) {
    return {
        program: env.TERM_PROGRAM ?? null,
        programVersion: env.TERM_PROGRAM_VERSION ?? null,
        shell: env.SHELL ?? null,
        term: env.TERM ?? null,
        colorterm: env.COLORTERM ?? null,
    };
}

/* ============================================================
   4. Terminal Host Detection (iTerm, Kitty, Warp, Ghostty, etc.)
============================================================ */
function extractTerminalHost(env: NodeJS.ProcessEnv) {
    return {
        lcTerminal: env.LC_TERMINAL ?? null,
        lcTerminalVersion: env.LC_TERMINAL_VERSION ?? null,
        itermProfile: env.ITERM_PROFILE ?? null,
        kittyWindowId: env.KITTY_WINDOW_ID ?? null,
        warpShell: env.WARP_IS_LOCAL_SHELL ?? null,
        ghostty: env.GHOSTTY_SHELL ?? null
    };
}

/* ============================================================
   5. Shell Integration
============================================================ */
function extractShellIntegration(env: NodeJS.ProcessEnv) {
    return {
        termSessionId: env.TERM_SESSION_ID ?? null,
        shlvl: env.SHLVL ?? null,
        bundleId: env.__CFBundleIdentifier ?? null,
        initCwd: env.INIT_CWD ?? null
    };
}

/* ============================================================
   6. Remote / Container / SSH Identification
============================================================ */
function extractRemoteSessionInfo(env: NodeJS.ProcessEnv) {
    return {
        isRemoteSSH: !!env.SSH_CONNECTION,
        isCodespaces: env.CODESPACES === "true",
        isGitpod: !!env.GITPOD_WORKSPACE_ID,
        isReplit: !!env.REPL_ID,
        isWSL: !!env.WSL_DISTRO_NAME,
        isDevContainer: env.DEVCONTAINER === "true" || !!env.CONTAINER_WORKSPACE_FOLDER,
    };
}

/* ============================================================
   7. Editor Binary & Args
============================================================ */
function getEditorBinaryInfo() {
    return {
        execPath: process.execPath || null,
        argv0: process.argv[0] || null,
        argv: process.argv
    };
}

/* ============================================================
   8. Editor Mode Detection
============================================================ */
function detectEditorMode(env: NodeJS.ProcessEnv) {
    return {
        isCLI: !!env.VSCODE_CLI,
        isExtensionHost: !!env.VSCODE_AMD_ENTRYPOINT,
        hasIPC: !!env.VSCODE_IPC_HOOK || !!env.VSCODE_GIT_IPC_HANDLE,
        isDebugShell: env.PROMPT?.includes("dbg>") || false
    };
}

/* ============================================================
   9. Editor Spawn Identification
============================================================ */
function detectIDESpawn(env: NodeJS.ProcessEnv) {
    return {
        spawnedByIDE:
            !!env.VSCODE_PID ||
            !!env.CURSOR_TRACE_ID ||
            !!env.JB_RUNNING ||
            !!env.ZED_TERMINAL ||
            !!env.NOVA_PID ||
            false
    };
}

/* ============================================================
   10. Workspace Info
============================================================ */
function extractWorkspaceInfo(env: NodeJS.ProcessEnv) {
    return {
        vscodeCwd: env.VSCODE_CWD ?? null,
        vscodeCache: env.VSCODE_CODE_CACHE_PATH ?? null,
        workspaceTrust: env.VSCODE_WORKSPACE_TRUST ?? null,
        jetbrainsInitialDir: env.IDEA_INITIAL_DIRECTORY ?? null,
    };
}

/* ============================================================
   11. Workspace Origin Detection
============================================================ */
import fs from "fs";
import path from "path";

function detectWorkspaceSource(env: NodeJS.ProcessEnv) {
    const cwd = process.cwd();
    return {
        cwd,
        initCwd: env.INIT_CWD || null,
        isGitRepo: fs.existsSync(path.join(cwd, ".git")),
        isCursorWorkspace: cwd.includes("Cursor/Workspace")
    };
}

/* ============================================================
   12. Editor Hints (git, prompt, editor variables)
============================================================ */
function extractEditorHints(env: NodeJS.ProcessEnv) {
    return {
        gitAskpass: env.GIT_ASKPASS ?? null,
        promptCommand: env.PROMPT_COMMAND ?? null,
        prompt: env.PROMPT ?? null,
        editor: env.EDITOR ?? null,
        visual: env.VISUAL ?? null,
    };
}

/* ============================================================
   13. Editor-Injected PATH Elements
============================================================ */
function extractEditorInjectedPaths(env: NodeJS.ProcessEnv) {
    const raw = env.PATH || "";
    return {
        injectedPaths: raw
            .split(":")
            .filter(x =>
                x.includes("Cursor") ||
                x.includes("Code") ||
                x.includes("VSCodium") ||
                x.includes("JetBrains")
            )
    };
}

/* ============================================================
   14. Raw IDE Signals (substring match)
============================================================ */
function extractAllIDESignals(env: NodeJS.ProcessEnv) {
    const out: Record<string, string> = {};
    for (const key in env) {
        const k = key.toLowerCase();
        if (
            k.includes("cursor") ||
            k.includes("vscode") ||
            k.includes("codium") ||
            k.includes("jetbrains") ||
            k.includes("idea") ||
            k.includes("zed") ||
            k.includes("gitpod") ||
            k.includes("codespace")
        ) out[key] = env[key]!;
    }
    return out;
}

console.log(getIDEInfo())