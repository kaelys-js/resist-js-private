import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

export function getTypeScriptInfo(cwd = process.cwd()) {
    const tsconfig = loadNearestTSConfig(cwd);
    const compiler = detectTSCompiler();
    const tsx = detectTsx();
    const tsnode = detectTsNode();
    const deno = detectDenoTS();
    const bun = detectBunTS();
    const buildTools = detectTSBundlers();
    const languageService = detectTSLanguageService();
    const projectRefs = detectTSProjectReferences(tsconfig);
    const effective = computeEffectiveTSOptions(tsconfig);

    return {
        runtime: detectTSRuntime(compiler, tsx, tsnode, deno, bun),
        version: compiler.version,
        compiler,
        tsconfig,
        effectiveTSOptions: effective,
        projectReferences: projectRefs,
        bundlers: buildTools,
        languageService,
        decorators: detectDecoratorSupport(effective),
        sourceMaps: detectSourceMapSupport(effective),
        moduleSystem: detectTSModuleSystem(effective),
        types: detectTypesPackageInfo(),
        strictness: detectStrictness(effective),
        resolution: detectModuleResolution(effective),
        diagnostics: detectDiagnosticsOptions(effective),
        jsx: detectJSXOptions(effective),
        imports: detectImportSettings(effective),
        esm: detectESMSupport(effective),
        compilerHostEnv: detectCompilerHostEnv(),
        fileExtensions: detectTSFileExtensions(),
        experimental: detectExperimentalTSFeatures(effective),
    };
}

/* ============================================================
   tsconfig.json loading (with cascading extends)
============================================================ */
function loadNearestTSConfig(start: string) {
    let dir = start;
    while (dir !== "/") {
        const file = path.join(dir, "tsconfig.json");
        if (fs.existsSync(file)) {
            return loadTSConfigRecursive(file);
        }
        dir = path.dirname(dir);
    }
    return null;
}

function loadTSConfigRecursive(file: string) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const base = raw.extends
        ? loadTSConfigRecursive(require.resolve(raw.extends, { paths: [path.dirname(file)] }))
        : {};

    return {
        file,
        ...mergeTSConfigs(base, raw),
    };
}

function mergeTSConfigs(base: any, ext: any) {
    const merged = { ...base, ...ext };
    merged.compilerOptions = { ...(base.compilerOptions || {}), ...(ext.compilerOptions || {}) };
    return merged;
}

/* ============================================================
   Effective tsconfig (what TS actually sees)
============================================================ */
function computeEffectiveTSOptions(cfg: any) {
    if (!cfg) return null;
    return cfg.compilerOptions ?? {};
}

/* ============================================================
   Detect TypeScript compiler & version
============================================================ */
function detectTSCompiler() {
    return {
        installed: !!safe("which tsc"),
        version: safe("tsc --version"),
        path: safe("which tsc"),
        usesLocalTSC: fs.existsSync("node_modules/.bin/tsc"),
        localVersion: safe("./node_modules/.bin/tsc --version"),
        swcInstalled: !!safe("which swc"),
        esbuildInstalled: !!safe("which esbuild"),
    };
}

/* ============================================================
   Detect tsx (esbuild TS runner)
============================================================ */
function detectTsx() {
    return {
        installed: !!safe("which tsx"),
        version: safe("tsx --version"),
    };
}

/* ============================================================
   Detect ts-node (Node TS executor)
============================================================ */
function detectTsNode() {
    return {
        installed: !!safe("which ts-node"),
        version: safe("ts-node --version"),
        dev: !!safe("which ts-node-dev"),
        mocha: !!safe("which ts-mocha"),
        jest: !!safe("which ts-jest"),
    };
}

/* ============================================================
   Detect Bun TS support
============================================================ */
function detectBunTS() {
    return {
        isBun: typeof Bun !== "undefined",
        bunTsRuntime: typeof Bun?.transpile === "function",
        bunVersion: typeof Bun !== "undefined" ? Bun.version : null,
        jsxSupport: typeof Bun?.jsx !== "undefined",
    };
}

/* ============================================================
   Detect Deno TS support
============================================================ */
function detectDenoTS() {
    return {
        isDeno: typeof Deno !== "undefined",
        version: typeof Deno !== "undefined" ? Deno.version : null,
        supportsTypeChecking: typeof Deno?.check === "function",
        supportsEmit: typeof Deno?.emit === "function",
    };
}

/* ============================================================
   Detect building tools using TS
============================================================ */
function detectTSBundlers() {
    return {
        vite: fs.existsSync("vite.config.ts") || !!safe("which vite"),
        webpack: fs.existsSync("webpack.config.ts") || !!safe("which webpack"),
        parcel: fs.existsSync(".parcelrc") || !!safe("which parcel"),
        rollup: fs.existsSync("rollup.config.ts") || !!safe("which rollup"),
        esbuild: !!safe("which esbuild"),
        swc: !!safe("which swc"),
        tsup: !!safe("which tsup"),
        turbopack: !!safe("which next") && fs.existsSync("next.config.ts"),
    };
}

/* ============================================================
   Detect tsserver / language service presence
============================================================ */
function detectTSLanguageService() {
    return {
        tsserverInstalled: !!safe("which tsserver"),
        tsserverVersion: safe("tsserver --version"),
        runningInsideEditor: !!process.env.VSCODE_PID || !!process.env.CURSOR,
        incremental: process.env.TS_INCREMENTAL ?? null,
    };
}

/* ============================================================
   TS Project References
============================================================ */
function detectTSProjectReferences(cfg: any) {
    if (!cfg) return null;
    return cfg.references ?? null;
}

/* ============================================================
   Decorator support (old + new TS 5.0 style)
============================================================ */
function detectDecoratorSupport(opts: any) {
    return {
        experimentalDecorators: !!opts.experimentalDecorators,
        emitDecoratorMetadata: !!opts.emitDecoratorMetadata,
        newDecoratorTS5: opts.emitDecoratorMetadata === false && opts.experimentalDecorators === false
            ? "likely using new TC39 decorators"
            : false
    };
}

/* ============================================================
   Source Map settings
============================================================ */
function detectSourceMapSupport(opts: any) {
    return {
        sourceMap: !!opts.sourceMap,
        inlineSources: !!opts.inlineSources,
        inlineSourceMap: !!opts.inlineSourceMap,
        declarationMap: !!opts.declarationMap,
    };
}

/* ============================================================
   Module system in TS
============================================================ */
function detectTSModuleSystem(opts: any) {
    return {
        module: opts.module ?? null,
        target: opts.target ?? null,
        moduleResolution: opts.moduleResolution ?? null,
        allowSyntheticDefaultImports: !!opts.allowSyntheticDefaultImports,
        esModuleInterop: !!opts.esModuleInterop,
        verbatimModuleSyntax: !!opts.verbatimModuleSyntax,
    };
}

/* ============================================================
   @types detection, type acquisition
============================================================ */
function detectTypesPackageInfo() {
    const nodeTypes = fs.existsSync("node_modules/@types/node");
    const jestTypes = fs.existsSync("node_modules/@types/jest");
    const viteTypes = fs.existsSync("node_modules/@types/vite");

    return {
        node: nodeTypes,
        jest: jestTypes,
        vite: viteTypes,
        allTypes: listTypes(),
    };
}

function listTypes() {
    const dir = "node_modules/@types";
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
}

/* ============================================================
   Strictness
============================================================ */
function detectStrictness(opts: any) {
    return {
        strict: !!opts.strict,
        noImplicitAny: !!opts.noImplicitAny,
        strictNullChecks: !!opts.strictNullChecks,
        strictBindCallApply: !!opts.strictBindCallApply,
        strictPropertyInitialization: !!opts.strictPropertyInitialization,
        noUncheckedIndexedAccess: !!opts.noUncheckedIndexedAccess,
    };
}

/* ============================================================
   Module resolution details
============================================================ */
function detectModuleResolution(opts: any) {
    return {
        mode: opts.moduleResolution ?? "classic",
        baseUrl: opts.baseUrl ?? null,
        paths: opts.paths ?? null,
        rootDirs: opts.rootDirs ?? null,
        typeRoots: opts.typeRoots ?? null,
    };
}

/* ============================================================
   Diagnostics options
============================================================ */
function detectDiagnosticsOptions(opts: any) {
    return {
        pretty: opts.pretty ?? null,
        skipLibCheck: !!opts.skipLibCheck,
        skipDefaultLibCheck: !!opts.skipDefaultLibCheck,
        incremental: !!opts.incremental,
        tsBuildInfoFile: opts.tsBuildInfoFile ?? null,
    };
}

/* ============================================================
   JSX settings
============================================================ */
function detectJSXOptions(opts: any) {
    return {
        jsx: opts.jsx ?? null,
        jsxFactory: opts.jsxFactory ?? null,
        jsxFragmentFactory: opts.jsxFragmentFactory ?? null,
        jsxImportSource: opts.jsxImportSource ?? null,
    };
}

/* ============================================================
   Import settings
============================================================ */
function detectImportSettings(opts: any) {
    return {
        allowJs: !!opts.allowJs,
        checkJs: !!opts.checkJs,
        resolveJsonModule: !!opts.resolveJsonModule,
        isolatedModules: !!opts.isolatedModules,
        preserveValueImports: !!opts.preserveValueImports,
    };
}

/* ============================================================
   ESM support from TS perspective
============================================================ */
function detectESMSupport(opts: any) {
    return {
        module: opts.module,
        target: opts.target,
        usesESM:
            opts.module === "ESNext" ||
            opts.module === "ES2020" ||
            opts.module === "ES2015",
        preservesModules: !!opts.preserveConstEnums === false,
    };
}

/* ============================================================
   Compiler Host Environment
============================================================ */
function detectCompilerHostEnv() {
    return {
        cwd: process.cwd(),
        env: {
            NODE_ENV: process.env.NODE_ENV ?? null,
            TS_NODE_PROJECT: process.env.TS_NODE_PROJECT ?? null,
            TS_NODE_TRANSPILE_ONLY: process.env.TS_NODE_TRANSPILE_ONLY ?? null,
        },
        CI: !!process.env.CI,
    };
}

/* ============================================================
   File extensions (ts/tsx/js/jsx/d.ts)
============================================================ */
function detectTSFileExtensions() {
    return {
        ts: countExt(".ts"),
        tsx: countExt(".tsx"),
        dts: countExt(".d.ts"),
        js: countExt(".js"),
        jsx: countExt(".jsx"),
    };
}

function countExt(ext: string) {
    let count = 0;
    walk(process.cwd());
    return count;

    function walk(dir: string) {
        for (const file of fs.readdirSync(dir)) {
            const full = path.join(dir, file);
            if (fs.statSync(full).isDirectory()) walk(full);
            else if (full.endsWith(ext)) count++;
        }
    }
}

/* ============================================================
   Experimental TS features
============================================================ */
function detectExperimentalTSFeatures(opts: any) {
    return {
        noPropertyAccessFromIndexSignature: !!opts.noPropertyAccessFromIndexSignature,
        useDefineForClassFields: !!opts.useDefineForClassFields,
        exactOptionalPropertyTypes: !!opts.exactOptionalPropertyTypes,
        preserveConstEnums: !!opts.preserveConstEnums,
        moduleDetection: opts.moduleDetection ?? null,
        skipDefaultLibCheck: !!opts.skipDefaultLibCheck,
    };
}

/* ============================================================
   Which runner is actually being used?
============================================================ */
function detectTSRuntime(compiler: any, tsx: any, tsnode: any, deno: any, bun: any) {
    return {
        tsc: compiler.installed,
        tsx: tsx.installed,
        tsnode: tsnode.installed,
        tsnodedev: tsnode.dev,
        bun: bun.isBun,
        deno: deno.isDeno,
        esmLoader: process.env.NODE_OPTIONS?.includes("--loader") ?? false,
    };
}