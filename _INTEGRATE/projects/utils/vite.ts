import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function safe(cmd: string) {
    try {
        return execSync(cmd, { encoding: "utf8" }).trim();
    } catch {
        return null;
    }
}

function safeExists(p: string) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function safeReadJSON(p: string): any {
    try {
        return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
        return null;
    }
}

export async function getViteInfo() {
    const isBrowser = typeof window !== "undefined";
    if (isBrowser) {
        // Minimal Vite client runtime info
        // (Vite exposes __vite__ in dev)
        return {
            environment: "browser",
            viteClientInjected:
                typeof (window as any).__vite__ === "object" ||
                !!document.querySelector("script[type='module'][src*='@vite']"),
            hot: !!(import.meta as any).hot,
            ssr: !!(import.meta as any).env?.SSR,
            mode: (import.meta as any).env?.MODE ?? null,
            baseUrl: (import.meta as any).env?.BASE_URL ?? null,
        };
    }

    // ===== Node/Bun environment =====
    const cwd = process.cwd();

    /* --------------------------------------------------------------------
       1. Resolve Vite version
    -------------------------------------------------------------------- */
    let viteVersion: string | null = null;

    try {
        const vitePkg = require(path.join(cwd, "node_modules/vite/package.json"));
        viteVersion = vitePkg.version;
    } catch {
        viteVersion = safe("vite --version") ?? null;
    }

    /* --------------------------------------------------------------------
       2. Detect Vite config files
    -------------------------------------------------------------------- */
    const configFiles = [
        "vite.config.ts",
        "vite.config.js",
        "vite.config.mjs",
        "vite.config.cjs",
        "vite.config.mts",
        "vite.config.cts",
    ]
        .filter((f) => safeExists(path.join(cwd, f)))
        .map((f) => path.join(cwd, f));

    /* --------------------------------------------------------------------
       3. Attempt to load config (safely)
    -------------------------------------------------------------------- */

    let configLoaded = null;
    async function tryLoadConfig() {
        for (const file of configFiles) {
            try {
                const imported = await import(file).catch(() => null);
                if (imported?.default || imported) {
                    configLoaded = imported.default ?? imported;
                    return;
                }
            } catch {}
        }
    }

    if (configFiles.length > 0) {
        await tryLoadConfig();
    }

    /* --------------------------------------------------------------------
       4. Extract plugin information
       (names, resolve path, version if detectable)
    -------------------------------------------------------------------- */
    let plugins: any[] = [];

    if (configLoaded?.plugins) {
        plugins = configLoaded.plugins.map((p: any) => {
            const plugin = typeof p === "function" ? p() : p;

            // Try to detect plugin version from node_modules
            let version = null;
            if (plugin?.name) {
                try {
                    const pkgPath = require.resolve(
                        plugin.name + "/package.json",
                        { paths: [cwd] }
                    );
                    const pkg = safeReadJSON(pkgPath);
                    version = pkg?.version ?? null;
                } catch {
                    version = null;
                }
            }

            return {
                name: plugin?.name ?? null,
                enforce: plugin?.enforce ?? null,
                apply: plugin?.apply ?? null,
                version,
                hooks: Object.keys(plugin ?? {}).filter((k) =>
                    typeof plugin[k] === "function"
                ),
            };
        });
    }

    /* --------------------------------------------------------------------
       5. Detect Framework Integration
    -------------------------------------------------------------------- */
    const frameworks = {
        svelte: safeExists("svelte.config.js") || safeExists("svelte.config.ts"),
        svelteKit: !!process.env.KIT_APP_DIR,
        react:
            safeExists("vite.config.ts") &&
            JSON.stringify(configLoaded).includes("@vitejs/plugin-react"),
        vue:
            safeExists("vite.config.ts") &&
            JSON.stringify(configLoaded).includes("@vitejs/plugin-vue"),
        astro: safeExists("astro.config.mjs") || safeExists("astro.config.ts"),
        solid:
            configLoaded?.plugins?.some((p: any) => p?.name?.includes("solid")) ??
            false,
        qwik: safeExists("qwik.config.ts"),
        next: safeExists("next.config.js"), // for completeness
    };

    /* --------------------------------------------------------------------
       6. Vite environment variables
    -------------------------------------------------------------------- */
    const viteEnvVars = Object.fromEntries(
        Object.entries(process.env).filter(([key]) =>
            key.startsWith("VITE_")
        )
    );

    /* --------------------------------------------------------------------
       7. Detect Vite command mode (best effort)
    -------------------------------------------------------------------- */
    const runningMode =
        process.argv.includes("dev")
            ? "dev"
            : process.argv.includes("serve")
            ? "serve"
            : process.argv.includes("preview")
            ? "preview"
            : process.argv.includes("build")
            ? "build"
            : null;

    /* --------------------------------------------------------------------
       8. Vite cache directories
    -------------------------------------------------------------------- */
    const cacheDirs = [
        "node_modules/.vite",
        ".vite",
        "dist"
    ].filter((d) => safeExists(path.join(cwd, d)));

    /* --------------------------------------------------------------------
       FINAL OUTPUT
    -------------------------------------------------------------------- */

    return {
        environment: "node",
        viteInstalled: !!viteVersion,
        viteVersion,
        configFiles,
        runningMode,
        config: configLoaded ?? null,
        plugins,
        frameworks,
        viteEnvVars,
        cacheDirs,
        root: configLoaded?.root ?? cwd,
        base: configLoaded?.base ?? null,
        build: {
            outDir: configLoaded?.build?.outDir ?? null,
            minify: configLoaded?.build?.minify ?? null,
            target: configLoaded?.build?.target ?? null,
            sourcemap: configLoaded?.build?.sourcemap ?? null,
        },
        server: configLoaded?.server ?? null,
        preview: configLoaded?.preview ?? null,
    };
}