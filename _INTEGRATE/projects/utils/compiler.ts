import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

function exists(p: string) {
    return fs.existsSync(path.resolve(process.cwd(), p));
}

export function getCompilerInfo() {
    return {
        runtime: detectRuntime(),

        vite: detectVite(),
        webpack: detectWebpack(),
        rollup: detectRollup(),
        esbuild: detectEsbuild(),
        swc: detectSwc(),
        parcel: detectParcel(),
        turbopack: detectTurbopack(),
        rspack: detectRspack(),
        rsbuild: detectRsbuild(),
        rome: detectRome(),

        bun: detectBunCompiler(),
        deno: detectDenoBundler(),

        babel: detectBabel(),
        tscTranspile: detectTSCompilerBehavior(),

        frameworkPipelines: detectFrameworkBuildTools(),
    };
}

/* ============================================================
   RUNTIME
============================================================ */
function detectRuntime() {
    if (typeof Bun !== "undefined") return "bun";
    if (typeof Deno !== "undefined") return "deno";
    if (process?.versions?.node) return "node";
    if (typeof WebSocketPair !== "undefined") return "cloudflare-worker";
    return "unknown";
}

/* ============================================================
   VITE
============================================================ */
function detectVite() {
    return {
        installed: !!safe("which vite"),
        version: safe("vite --version"),
        config:
            ["vite.config.ts", "vite.config.js", "vite.config.mjs"]
                .find(f => exists(f)) || null,
        plugins: detectVitePlugins(),
    };
}

function detectVitePlugins() {
    const pkgFile = path.resolve("package.json");
    if (!exists(pkgFile)) return [];

    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));

    return Object.keys(pkg.devDependencies || {})
        .filter(d => d.startsWith("vite-plugin-") || d.includes("vite"));
}

/* ============================================================
   WEBPACK
============================================================ */
function detectWebpack() {
    return {
        installed: !!safe("which webpack"),
        version: safe("webpack --version"),
        config:
            [
                "webpack.config.js",
                "webpack.config.ts",
                "webpack.config.cjs",
                "webpack.config.mjs",
                "webpack.config.babel.js"
            ].find(f => exists(f)) || null,
        loaders: detectWebpackLoaders(),
        plugins: detectWebpackPlugins(),
    };
}

function detectWebpackLoaders() {
    if (!exists("node_modules")) return [];
    const loaders = [
        "babel-loader", "ts-loader", "swc-loader", "esbuild-loader",
        "sass-loader", "style-loader", "css-loader", "svelte-loader",
        "vue-loader"
    ];
    return loaders.filter(l => exists(`node_modules/${l}`));
}

function detectWebpackPlugins() {
    if (!exists("node_modules")) return [];
    const plugins = ["terser-webpack-plugin", "html-webpack-plugin"];
    return plugins.filter(p => exists(`node_modules/${p}`));
}

/* ============================================================
   ROLLUP
============================================================ */
function detectRollup() {
    return {
        installed: !!safe("which rollup"),
        version: safe("rollup --version"),
        config:
            ["rollup.config.js", "rollup.config.ts", "rollup.config.mjs"]
                .find(f => exists(f)) || null,
    };
}

/* ============================================================
   ESBUILD
============================================================ */
function detectEsbuild() {
    return {
        installed: !!safe("which esbuild"),
        version: safe("esbuild --version"),
        nativeAPI: typeof (globalThis as any).Bun?.transpile === "function",
        config:
            ["esbuild.config.js", "esbuild.config.ts"].find(f => exists(f)) ||
            null,
    };
}

/* ============================================================
   SWC
============================================================ */
function detectSwc() {
    return {
        installed: !!safe("which swc"),
        version: safe("swc --version"),
        config:
            [
                ".swcrc",
                ".swcrc.json",
                "swc.config.js",
                "swc.config.ts"
            ].find(f => exists(f)) || null,
    };
}

/* ============================================================
   PARCEL
============================================================ */
function detectParcel() {
    return {
        installed: !!safe("which parcel"),
        version: safe("parcel --version"),
        config: exists(".parcelrc") ? ".parcelrc" : null,
    };
}

/* ============================================================
   TURBOPACK (Next.js / Webpack replacement)
============================================================ */
function detectTurbopack() {
    return {
        detected:
            exists(".next") ||
            exists("next.config.js") && safe("next --help")?.includes("turbopack"),
        version: safe("next --version"),
    };
}

/* ============================================================
   RSPACK (Rust-based webpack alternative)
============================================================ */
function detectRspack() {
    return {
        installed: !!safe("which rspack"),
        version: safe("rspack --version"),
        config:
            ["rspack.config.js", "rspack.config.ts"].find(f => exists(f)) ||
            null,
    };
}

/* ============================================================
   RSB UILD (Rust-powered Vite alternative)
============================================================ */
function detectRsbuild() {
    return {
        installed: !!safe("which rsbuild"),
        version: safe("rsbuild --version"),
        config:
            ["rsbuild.config.js", "rsbuild.config.ts"].find(f => exists(f)) ||
            null,
    };
}

/* ============================================================
   ROME
============================================================ */
function detectRome() {
    return {
        installed: !!safe("which rome"),
        version: safe("rome --version"),
        config: exists("rome.json") || exists("rome.json5"),
    };
}

/* ============================================================
   BUN COMPILER (Bun.transpile)
============================================================ */
function detectBunCompiler() {
    return {
        bunRuntime: typeof Bun !== "undefined",
        transpileAPI: typeof Bun?.transpile === "function",
        bunVersion: typeof Bun !== "undefined" ? Bun.version : null,
        supportsJSX: typeof Bun?.jsx !== "undefined",
        supportsTS: true, // Bun always supports TS
        supportsSWC: true, // Bun uses SWC pipeline internally
    };
}

/* ============================================================
   DENO BUNDLER / TRANSFORMER
============================================================ */
function detectDenoBundler() {
    return {
        isDeno: typeof Deno !== "undefined",
        version: typeof Deno !== "undefined" ? Deno.version : null,
        supportsBundle: !!(Deno as any)?.emit,
        supportsCheck: !!Deno?.check,
        supportsTranspile: !!(Deno as any)?.transpileOnly,
    };
}

/* ============================================================
   BABEL
============================================================ */
function detectBabel() {
    const configFiles = [
        ".babelrc",
        ".babelrc.json",
        "babel.config.json",
        "babel.config.js",
        ".babelrc.js"
    ];

    return {
        installed: !!safe("which babel"),
        version: safe("babel --version"),
        config: configFiles.find(f => exists(f)) || null,
        presets: detectBabelPresets(),
        plugins: detectBabelPlugins(),
    };
}

function detectBabelPresets() {
    if (!exists("node_modules")) return [];
    return Object.keys(require("./package.json").dependencies || {})
        .filter(d => d.startsWith("@babel/preset"));
}

function detectBabelPlugins() {
    if (!exists("node_modules")) return [];
    return Object.keys(require("./package.json").dependencies || {})
        .filter(d => d.startsWith("@babel/plugin"));
}

/* ============================================================
   TSC (TypeScript) TRANSPILE BEHAVIOR
============================================================ */
function detectTSCompilerBehavior() {
    const cfgPath = findTSConfig();
    let opts = {};

    if (cfgPath) {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
        opts = cfg.compilerOptions || {};
    }

    return {
        project: cfgPath,
        noEmit: opts["noEmit"] ?? false,
        isolatedModules: opts["isolatedModules"] ?? false,
        outDir: opts["outDir"] ?? null,
        declaration: opts["declaration"] ?? false,
        jsx: opts["jsx"] ?? null,
        module: opts["module"] ?? null,
        target: opts["target"] ?? null,
        esModuleInterop: opts["esModuleInterop"] ?? false,
        moduleResolution: opts["moduleResolution"] ?? null,
    };
}

function findTSConfig() {
    let dir = process.cwd();
    while (dir !== "/") {
        const file = path.join(dir, "tsconfig.json");
        if (exists(file)) return file;
        dir = path.dirname(dir);
    }
    return null;
}

/* ============================================================
   Detect build tools inside frameworks
============================================================ */
function detectFrameworkBuildTools() {
    return {
        next: exists("next.config.js") || exists("next.config.ts"),
        sveltekit: exists("svelte.config.js") || exists("svelte.config.ts"),
        astro: exists("astro.config.mjs") || exists("astro.config.ts"),
        nuxt: exists("nuxt.config.ts") || exists("nuxt.config.js"),
        remix: exists("remix.config.js") || exists("remix.config.ts"),
    };
}

console.log(getCompilerInfo())