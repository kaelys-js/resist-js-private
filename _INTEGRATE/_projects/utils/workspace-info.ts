import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

function exists(p: string) { return fs.existsSync(p); }

/* ============================================================
   MAIN ENTRY
============================================================ */
export function getMonorepoInfo(cwd = process.cwd()) {
    return {
        root: detectRepoRoot(cwd),
        workspaceType: detectWorkspaceType(cwd),
        packageManagerWorkspaces: detectPackageManagerWorkspaces(cwd),
        monorepoTools: {
            lerna: detectLerna(cwd),
            nx: detectNx(cwd),
            turborepo: detectTurborepo(cwd),
            rush: detectRush(cwd),
            bolt: detectBolt(cwd),
            lage: detectLage(cwd),
            rome: detectRome(cwd),
            husky: detectHusky(cwd),
            commitlint: detectCommitlint(cwd),
        },
        buildSystems: {
            bazel: detectBazel(cwd),
            buck: detectBuck(cwd),
            pants: detectPants(cwd),
            gradle: detectGradle(cwd),
        },
        workspaceGraph: detectWorkspaceGraph(cwd),
    };
}

/* ============================================================
   REPO ROOT DETECTION
============================================================ */
function detectRepoRoot(cwd: string) {
    let dir = cwd;
    while (dir !== "/") {
        if (exists(path.join(dir, ".git"))) return dir;
        dir = path.dirname(dir);
    }
    return cwd;
}

/* ============================================================
   WORKSPACE TYPE
============================================================ */
function detectWorkspaceType(cwd: string) {
    if (exists(path.join(cwd, "pnpm-workspace.yaml"))) return "pnpm";
    const pkgPath = path.join(cwd, "package.json");
    if (exists(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return "npm/yarn";
        if (pkg.packageManager?.startsWith("npm")) return "npm";
        if (pkg.packageManager?.startsWith("yarn")) return "yarn";
    }
    if (exists("bunfig.toml")) return "bun-workspaces";

    return "single-package";
}

/* ============================================================
   PACKAGE MANAGER WORKSPACES
============================================================ */
function detectPackageManagerWorkspaces(cwd: string) {
    const pkgPath = path.join(cwd, "package.json");
    let pkg = exists(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : null;

    return {
        npm: pkg?.workspaces ?? null,
        yarn: pkg?.workspaces ?? null,
        pnpm: exists("pnpm-workspace.yaml")
            ? fs.readFileSync("pnpm-workspace.yaml", "utf8")
            : null,
        bun: exists("bunfig.toml")
            ? fs.readFileSync("bunfig.toml", "utf8")
            : null,
    };
}

/* ============================================================
   LERNA
============================================================ */
function detectLerna(cwd: string) {
    const configPaths = [
        "lerna.json",
        "lerna.jsonc",
        "lerna.yaml",
        "lerna.yml",
    ];

    const config = configPaths.find(p => exists(path.join(cwd, p)));

    return {
        exists: !!config || !!safe("which lerna"),
        configFile: config || null,
        version: safe("lerna --version"),
        packages: config ? safe("lerna ls --json") : null,
    };
}

/* ============================================================
   NX
============================================================ */
function detectNx(cwd: string) {
    const configs = [
        "nx.json",
        "workspace.json",
        "project.json",
        "angular.json", // Angular CLI uses Nx under the hood
    ];

    const found = configs.find(f => exists(path.join(cwd, f)));

    return {
        exists: !!found || !!safe("which nx"),
        configFile: found ?? null,
        version: safe("nx --version"),
        projects: safe("nx show projects --json"),
        graph: safe("nx graph --help") ? "available" : null,
    };
}

/* ============================================================
   TURBOREPO
============================================================ */
function detectTurborepo(cwd: string) {
    const turboFiles = ["turbo.json", "turbo.yaml", "turbo.yml"];

    const found = turboFiles.find(f => exists(path.join(cwd, f)));

    return {
        exists: !!found || !!safe("which turbo"),
        configFile: found ?? null,
        version: safe("turbo --version"),
        remoteCacheConfigured:
            process.env.TURBO_TOKEN ||
            process.env.TURBO_REMOTE_CACHE_SIGNATURE_KEY ||
            null,
        pipeline: found ? JSON.parse(fs.readFileSync(found, "utf8")) : null,
    };
}

/* ============================================================
   RUSH
============================================================ */
function detectRush(cwd: string) {
    const config =
        exists("rush.json") ||
        exists("rush.jsonc") ||
        exists("common/config/rush/version-policies.json");

    return {
        exists: !!config || !!safe("which rush"),
        version: safe("rush -v"),
        commonConfig: exists("common/config/rush") ? "present" : "missing",
        shrinkwrap: exists("common/config/rush/pnpm-lock.yaml"),
    };
}

/* ============================================================
   BOLT
============================================================ */
function detectBolt(cwd: string) {
    return {
        exists: exists("bolt.config.js") || !!safe("which bolt"),
        version: safe("bolt --version"),
    };
}

/* ============================================================
   LAGE
============================================================ */
function detectLage(cwd: string) {
    return {
        exists: exists("lage.config.js") || !!safe("which lage"),
        version: safe("lage --version"),
    };
}

/* ============================================================
   ROME WORKSPACE
============================================================ */
function detectRome(cwd: string) {
    return {
        exists: exists("rome.json") || exists("rome.json5"),
        version: safe("rome --version"),
    };
}

/* ============================================================
   WORKSPACE GRAPH (UNIFIER)
============================================================ */
function detectWorkspaceGraph(cwd: string) {
    const dirs = fs.readdirSync(cwd);

    const packages: string[] = [];

    for (const dir of dirs) {
        const full = path.join(cwd, dir);
        if (fs.statSync(full).isDirectory()) {
            const pkgJson = path.join(full, "package.json");
            if (exists(pkgJson)) packages.push(dir);
        }
    }

    return {
        packageCount: packages.length,
        packages,
    };
}

/* ============================================================
   HUSKY
============================================================ */
function detectHusky(cwd: string) {
    return {
        exists: exists(".husky"),
        hooks: exists(".husky")
            ? fs.readdirSync(".husky").filter(x => !x.startsWith("."))
            : null,
    };
}

/* ============================================================
   COMMITLINT
============================================================ */
function detectCommitlint(cwd: string) {
    const files = [
        ".commitlintrc",
        ".commitlintrc.json",
        ".commitlintrc.js",
        ".commitlintrc.cjs",
        "commitlint.config.js",
    ];

    const config = files.find(f => exists(path.join(cwd, f)));

    return {
        exists: !!config,
        configFile: config ?? null,
    };
}

/* ============================================================
   BAZEL
============================================================ */
function detectBazel(cwd: string) {
    return {
        exists:
            exists("BUILD") ||
            exists("WORKSPACE") ||
            !!safe("which bazel"),
        version: safe("bazel --version"),
        workspaceFile: exists("WORKSPACE") ? "WORKSPACE" : null,
    };
}

/* ============================================================
   BUCK
============================================================ */
function detectBuck(cwd: string) {
    return {
        exists: exists("BUCK") || !!safe("which buck"),
        version: safe("buck --version"),
    };
}

/* ============================================================
   PANTS
============================================================ */
function detectPants(cwd: string) {
    return {
        exists: exists("pants.toml") || !!safe("which pants"),
        version: safe("pants --version"),
    };
}

/* ============================================================
   GRADLE (polyrepo + monorepo hybrid)
============================================================ */
function detectGradle(cwd: string) {
    return {
        exists: exists("settings.gradle") ||
            exists("settings.gradle.kts") ||
            !!safe("which gradle"),
        version: safe("gradle -v"),
    };
}