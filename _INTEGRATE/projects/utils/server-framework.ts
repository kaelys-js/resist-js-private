import fs from "fs";
import path from "path";

function exists(p: string) {
    try { return fs.existsSync(p); } catch { return false; }
}

function safeJson(p: string) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); }
    catch { return null; }
}

function hasDep(pkg: any, name: string): boolean {
    return Boolean(
        pkg?.dependencies?.[name] ||
        pkg?.devDependencies?.[name] ||
        pkg?.peerDependencies?.[name]
    );
}

// Runtime heuristics (non-fatal)
function detectRuntimeFlags() {
    const g = globalThis as any;

    return {
        honoGlobal: !!g?.Hono,
        expressGlobal: !!g?.express,
        fastifyGlobal: !!g?.fastify,
        koaGlobal: !!g?.koa,
        nestGlobal: !!g?.NestFactory,
        nextGlobal: !!g?.__NEXT_DEV_MIDDLEWARE__,
        svelteKitGlobal: !!g?.__SVELTEKIT_APP__,
        remixGlobal: !!g?.__remixContext,
    };
}

export async function getServerFrameworkInfo() {
    const cwd = process.cwd();
    const pkgPath = path.join(cwd, "package.json");
    const pkg = exists(pkgPath) ? safeJson(pkgPath) : null;

    // --------------------------------------------------------------------
    // 1. PACKAGE.JSON DEPENDENCY DETECTION (Primary)
    // --------------------------------------------------------------------
    const using = {
        hono: hasDep(pkg, "hono"),
        express: hasDep(pkg, "express"),
        fastify: hasDep(pkg, "fastify"),
        koa: hasDep(pkg, "koa"),
        nest: hasDep(pkg, "@nestjs/core") || hasDep(pkg, "@nestjs/common"),
        adonis: hasDep(pkg, "@adonisjs/core"),
        nuxt: hasDep(pkg, "nuxt") || exists("nuxt.config.ts"),
        nextServer: hasDep(pkg, "next") && exists("server.js"),
        svelteKit: hasDep(pkg, "@sveltejs/kit") || exists("svelte.config.js"),
        remix: hasDep(pkg, "@remix-run/node"),
        cloudflareHono: hasDep(pkg, "hono") && exists("wrangler.toml"),
    };

    // --------------------------------------------------------------------
    // 2. CONFIG FILE DETECTION (Secondary)
    // --------------------------------------------------------------------
    const configFiles = {
        express: exists("express.js") || exists("server.js"),
        fastify: exists("fastify.js") || exists("app.js"),
        koa: exists("koa.js"),
        nest: exists("nest-cli.json") || exists("nestjs.json"),
        adonis: exists("adonisrc.json") || exists("ace"),
        nuxt: exists("nuxt.config.ts") || exists("nuxt.config.js"),
        svelteKit: exists("svelte.config.js") || exists("svelte.config.ts"),
        remix: exists("remix.config.js"),
    };

    // --------------------------------------------------------------------
    // 3. RUNTIME HEURISTICS
    // --------------------------------------------------------------------
    const runtime = detectRuntimeFlags();

    // --------------------------------------------------------------------
    // 4. FRAMEWORK VERSION RESOLUTION
    // --------------------------------------------------------------------
    function version(name: string) {
        try {
            const pkgPath = require.resolve(`${name}/package.json`, { paths: [cwd] });
            return safeJson(pkgPath)?.version ?? null;
        } catch {
            return null;
        }
    }

    const versions = {
        hono: using.hono ? version("hono") : null,
        express: using.express ? version("express") : null,
        fastify: using.fastify ? version("fastify") : null,
        koa: using.koa ? version("koa") : null,
        nest: using.nest ? version("@nestjs/core") : null,
        adonis: using.adonis ? version("@adonisjs/core") : null,
        nuxt: using.nuxt ? version("nuxt") : null,
        next: hasDep(pkg, "next") ? version("next") : null,
        svelteKit: hasDep(pkg, "@sveltejs/kit") ? version("@sveltejs/kit") : null,
        remix: using.remix ? version("@remix-run/node") : null,
    };

    // --------------------------------------------------------------------
    // 5. FINAL OUTPUT
    // --------------------------------------------------------------------
    return {
        installedFrameworks: Object.fromEntries(
            Object.entries(using).filter(([, v]) => v)
        ),
        configFiles,
        runtimeFlags: runtime,
        versions,
        isServerEnvironment: typeof window === "undefined",
        isBrowserEnvironment: typeof window !== "undefined",
    };
}