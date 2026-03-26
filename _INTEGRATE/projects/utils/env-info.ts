import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

function exists(p: string) {
    return fs.existsSync(p);
}

function readJSON(p: string) {
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
        return null;
    }
}

export function getNodeEnvironmentInfo() {
    const cwd = process.cwd();
    const pkgPath = path.join(cwd, "package.json");
    const packageJson = exists(pkgPath) ? readJSON(pkgPath) : null;

    return {
        // ============================================================
        // CORE NODE DETAILS
        // ============================================================
        node: {
            exists: !!safe("which node"),
            version: safe("node -v"),
            execPath: safe("which node"),
            home: process.env.NODE_HOME ?? null,
            nodePath: process.env.NODE_PATH ?? null,
            globalModules: safe("npm root -g"),
            startupFlags: process.execArgv,
            arch: process.arch,
            platform: process.platform,
            memory: {
                maxOldSpace: detectFlagValue("--max-old-space-size"),
                heapSnapshotLimit: detectFlagValue("--heapsnapshot-near-heap-limit"),
            },
            engine: {
                v8: safe("node -p 'process.versions.v8'"),
                uv: safe("node -p 'process.versions.uv'"),
                openssl: safe("node -p 'process.versions.openssl'"),
                brotli: safe("node -p 'process.versions.brotli'"),
                npm: safe("node -p 'process.versions.npm'"),
                llhttp: safe("node -p 'process.versions.llhttp'"),
            },
            configVariables: safe("node -p 'JSON.stringify(process.config.variables)'"),
        },

        // ============================================================
        // PACKAGE MANAGERS
        // ============================================================
        packageManagers: {
            npm: detectNPM(),
            pnpm: detectPNPM(),
            yarn: detectYarn(),
            bun: detectBun(),
            corepack: detectCorepack(),
        },

        activePackageManager: detectActivePM(),

        // ============================================================
        // TOOLCHAIN MANAGERS
        // ============================================================
        toolchains: {
            nvm: detectNVM(),
            fnm: detectFNM(),
            volta: detectVolta(),
            asdf: detectASDF(),
        },

        // ============================================================
        // NODE-GYP / BUILD TOOLS
        // ============================================================
        buildTools: {
            nodeGyp: safe("node-gyp --version"),
            nodePreGyp: safe("node-pre-gyp --version"),
            python: safe("python3 --version") ?? safe("python --version"),
            make: safe("make --version"),
            gcc: safe("gcc --version"),
            clang: safe("clang --version"),
        },

        // ============================================================
        // PACKAGE.JSON INFO
        // ============================================================
        project: {
            packageJson,
            type: packageJson?.type ?? "commonjs",
            isESM: packageJson?.type === "module",
            deps: packageJson?.dependencies ?? null,
            devDeps: packageJson?.devDependencies ?? null,
            scripts: packageJson?.scripts ?? null,
            workspace: detectWorkspace(packageJson),
            lockfiles: detectLockfiles(),
            hasTSConfig: exists("tsconfig.json"),
        },

        // ============================================================
        // NPM/PACKAGE REGISTRY CONFIG
        // ============================================================
        registry: {
            npm: safe("npm config get registry"),
            pnpm: safe("pnpm config get registry"),
            yarn: safe("yarn config get npmRegistryServer"),
            globalNpmConfig: safe("npm config ls"),
        },

        // ============================================================
        // CACHES
        // ============================================================
        caches: {
            npm: safe("npm config get cache"),
            pnpm: safe("pnpm store path"),
            yarn: safe("yarn cache dir"),
            bun: path.join(process.env.HOME ?? "", "Library/Caches/bun"),
        },

        // ============================================================
        // SYSTEM NODE MODULES
        // ============================================================
        nodeModules: {
            exists: exists("node_modules"),
            count: safe("find node_modules -maxdepth 1 | wc -l"),
        }
    };
}

/* ============================================================
   HELPERS
============================================================ */

function detectFlagValue(flag: string) {
    const arg = process.execArgv.find(a => a.startsWith(flag));
    return arg ? arg.split("=")[1] : null;
}

/* PACKAGE MANAGER DETECTION */

function detectNPM() {
    return {
        exists: !!safe("which npm"),
        version: safe("npm -v"),
        prefix: safe("npm prefix -g"),
        root: safe("npm root -g"),
        config: safe("npm config ls"),
    };
}

function detectPNPM() {
    return {
        exists: !!safe("which pnpm"),
        version: safe("pnpm -v"),
        store: safe("pnpm store path"),
        globalRoot: safe("pnpm root -g"),
    };
}

function detectYarn() {
    return {
        exists: !!safe("which yarn"),
        version: safe("yarn -v"),
        globalDir: safe("yarn global dir"),
    };
}

function detectBun() {
    return {
        exists: !!safe("which bun"),
        version: safe("bun -v"),
        bunPM: safe("bun pm"),
    };
}

function detectCorepack() {
    return {
        exists: !!safe("which corepack"),
        enabled: safe("corepack -v") ? true : false,
        versions: safe("corepack prepare --help"),
    };
}

/* ACTIVE PACKAGE MANAGER */

function detectActivePM() {
    if (exists("pnpm-lock.yaml")) return "pnpm";
    if (exists("yarn.lock")) return "yarn";
    if (exists("bun.lockb")) return "bun";
    if (exists("package-lock.json")) return "npm";
    return "unknown";
}

/* TOOLCHAIN MANAGERS */

function detectNVM() {
    return {
        exists: !!process.env.NVM_DIR,
        nvmDir: process.env.NVM_DIR ?? null,
        versions: process.env.NVM_DIR ? safe("ls $NVM_DIR/versions/node") : null,
    };
}

function detectFNM() {
    return {
        exists: !!safe("which fnm"),
        version: safe("fnm --version"),
    };
}

function detectVolta() {
    return {
        exists: !!safe("which volta"),
        toolchain: safe("volta list"),
    };
}

function detectASDF() {
    return {
        exists: !!safe("which asdf"),
        version: safe("asdf --version"),
        nodePlugin: safe("asdf plugin-list | grep nodejs") ? true : false
    };
}

function detectWorkspace(pkg: any) {
    if (!pkg) return null;
    return pkg.workspaces ?? pkg.workspace ?? null;
}

/* LOCKFILES */

function detectLockfiles() {
    return {
        npm: exists("package-lock.json"),
        pnpm: exists("pnpm-lock.yaml"),
        yarn: exists("yarn.lock"),
        bun: exists("bun.lockb"),
        shrinkwrap: exists("npm-shrinkwrap.json"),
    };
}