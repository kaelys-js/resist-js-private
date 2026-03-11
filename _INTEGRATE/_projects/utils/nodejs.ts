import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

export function getNodeJSInfo() {
    const cwd = process.cwd();

    const pkgPath = path.join(cwd, "package.json");
    const packageJson = fs.existsSync(pkgPath)
        ? JSON.parse(fs.readFileSync(pkgPath, "utf8"))
        : null;

    const tsconfigPath = path.join(cwd, "tsconfig.json");
    const tsconfig = fs.existsSync(tsconfigPath)
        ? JSON.parse(fs.readFileSync(tsconfigPath, "utf8"))
        : null;

    return {
        // -------------------------------------------------------
        // NODE CORE INFO
        // -------------------------------------------------------
        hasNode: !!safe("which node"),
        executable: safe("which node"),
        version: safe("node --version"),
        npmVersion: safe("npm --version"),
        yarnVersion: safe("yarn --version"),
        pnpmVersion: safe("pnpm --version"),
        bunVersion: safe("bun --version"),
        denoVersion: safe("deno --version"),

        // -------------------------------------------------------
        // PACKAGE MANAGER DETECTION
        // -------------------------------------------------------
        packageManager: detectPackageManager(),
        packageManagerVersion: detectPackageManagerVersion(),

        // -------------------------------------------------------
        // NODE ENVIRONMENT DETAILS
        // -------------------------------------------------------
        nodeEnv: process.env.NODE_ENV ?? null,
        nodeOptions: process.env.NODE_OPTIONS ?? null,
        uvThreadpoolSize: process.env.UV_THREADPOOL_SIZE ?? null,
        noDeprecation: process.env.NODE_NO_WARNINGS ?? null,

        // -------------------------------------------------------
        // RUNTIME / ENGINE INFO
        // -------------------------------------------------------
        v8Version: safe("node -p 'process.versions.v8'"),
        uvVersion: safe("node -p 'process.versions.uv'"),
        opensslVersion: safe("node -p 'process.versions.openssl'"),
        zlibVersion: safe("node -p 'process.versions.zlib'"),
        brotli: safe("node -p 'process.versions.brotli'"),
        modulesVersion: safe("node -p 'process.versions.modules'"),
        napiVersion: safe("node -p 'process.versions.napi'"),
        llhttpVersion: safe("node -p 'process.versions.llhttp'"),

        // -------------------------------------------------------
        // NODE RUNTIME LIMITS
        // -------------------------------------------------------
        maxOldSpaceSize: detectNodeFlag("--max-old-space-size"),
        heapprof: detectNodeFlag("--heapsnapshot-near-heap-limit"),
        experimentalModules: detectNodeFlag("--experimental-modules"),
        esmLoader: detectNodeFlag("--loader"),
        enableSourceMaps: detectNodeFlag("--enable-source-maps"),

        // -------------------------------------------------------
        // PROJECT ROOT INFO
        // -------------------------------------------------------
        rootPackageJson: packageJson,
        tsconfig: tsconfig,
        packageJsonTypes: packageJson?.type ?? null,
        moduleType: getModuleType(packageJson),
        isUsingTypeScript: fs.existsSync("tsconfig.json"),

        // -------------------------------------------------------
        // MODULE RESOLUTION
        // -------------------------------------------------------
        nodePath: process.env.NODE_PATH ?? null,
        localNodeModules: fs.existsSync("node_modules"),
        localDeps: packageJson?.dependencies ?? null,
        localDevDeps: packageJson?.devDependencies ?? null,
        globalPackages: safe("npm -g ls --depth=0") ?? null,

        // -------------------------------------------------------
        // NODE BUILD TOOLS
        // -------------------------------------------------------
        nodeGyp: safe("node-gyp --version"),
        nodePreGyp: safe("node-pre-gyp --version"),
        npx: safe("npx --version"),
        typescript: safe("npx tsc --version"),

        // -------------------------------------------------------
        // NODE PATH & INSTALL ROOTS
        // -------------------------------------------------------
        npmPrefix: safe("npm prefix -g"),
        npmRoot: safe("npm root -g"),
        yarnGlobalDir: safe("yarn global dir"),
        pnpmStore: safe("pnpm store path"),

        // -------------------------------------------------------
        // MONOREPO / WORKSPACE DETECTION
        // -------------------------------------------------------
        workspace: detectWorkspace(packageJson),

        // -------------------------------------------------------
        // NATIVE ADDONS SUPPORT
        // -------------------------------------------------------
        supportsNativeAddons: !!safe("node -p 'process.config.variables'"),

        // -------------------------------------------------------
        // RUNTIME PLATFORM
        // -------------------------------------------------------
        platform: process.platform,
        arch: process.arch,
    };
}

/* -----------------------------------------------------------
   HELPERS
------------------------------------------------------------ */

function detectPackageManager() {
    if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
    if (fs.existsSync("yarn.lock")) return "yarn";
    if (fs.existsSync("bun.lockb")) return "bun";
    if (fs.existsSync("package-lock.json")) return "npm";
    return "unknown";
}

function detectPackageManagerVersion() {
    const pm = detectPackageManager();
    if (pm === "pnpm") return safe("pnpm --version");
    if (pm === "yarn") return safe("yarn --version");
    if (pm === "bun") return safe("bun --version");
    if (pm === "npm") return safe("npm --version");
    return null;
}

function detectNodeFlag(flag: string) {
    const opts = process.execArgv.join(" ");
    return opts.includes(flag);
}

function detectWorkspace(pkg: any) {
    if (!pkg) return null;
    return pkg.workspaces ?? pkg.workspace ?? null;
}

function getModuleType(pkg: any) {
    if (pkg?.type === "module") return "ESM";
    if (pkg?.type === "commonjs") return "CJS";
    return "unknown";
}