import fs from "fs";
import path from "path";

function readJson(file: string) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { return null; }
}

function exists(p: string) {
    return fs.existsSync(p);
}

/* ============================================================
   FRAMEWORK INSPECTOR V3 — FULL WORKSPACE SCAN
============================================================ */
export function getFrameworkInfo(root: string) {
    const pkg = readJson(path.join(root, "package.json")) ?? {};

    const scan = scanWorkspace(root);

    return {
        frameworksDetected: Object.keys(scan.frameworkFiles).filter(k => scan.frameworkFiles[k] > 0),

        counts: scan.frameworkFiles,
        configFiles: scan.configFiles,
        componentFiles: scan.componentFiles,

        svelte: detectSvelte(pkg, scan),
        sveltekit: detectSvelteKit(pkg, scan),
        react: detectReact(pkg, scan),
        vue: detectVue(pkg, scan),
        astro: detectAstro(pkg, scan),
        qwik: detectQwik(pkg, scan),
        solid: detectSolid(pkg, scan),
        preact: detectPreact(pkg, scan),
        lit: detectLit(pkg, scan),
        angular: detectAngular(pkg, scan),
        ember: detectEmber(pkg, scan),
        stencil: detectStencil(pkg, scan),
        marko: detectMarko(pkg, scan),
        next: detectNext(pkg, scan),
        nuxt: detectNuxt(pkg, scan),
        remix: detectRemix(pkg, scan),

        meta: calculateMetaFrameworks(pkg, scan)
    };
}

/* ============================================================
   WALK FULL WORKSPACE (FAST)
============================================================ */
function scanWorkspace(root: string) {
    const frameworkFiles = {
        svelte: 0,
        react: 0,
        vue: 0,
        astro: 0,
        qwik: 0,
        solid: 0,
        preact: 0,
        lit: 0,
        angular: 0,
        ember: 0,
        marko: 0,
        stencil: 0
    };

    const configFiles = {
        svelte: [],
        next: [],
        nuxt: [],
        astro: [],
        angular: [],
        solid: [],
        qwik: [],
        reactVite: [],
        vueVite: [],
        vite: []
    };

    const componentFiles: string[] = [];

    function walk(dir: string) {
        let entries;
        try { entries = fs.readdirSync(dir); }
        catch { return; }

        for (const file of entries) {
            const full = path.join(dir, file);
            let stat;
            try { stat = fs.statSync(full); }
            catch { continue; }

            if (stat.isDirectory()) {
                if (
                    file === "node_modules" ||
                    file === ".git" ||
                    file === "dist" ||
                    file === "build" ||
                    file === ".turbo" ||
                    file === ".svelte-kit"
                ) continue;

                walk(full);
                continue;
            }

            // --- Identify components
            if (file.endsWith(".svelte")) { frameworkFiles.svelte++; componentFiles.push(full); }
            if (file.endsWith(".vue")) { frameworkFiles.vue++; componentFiles.push(full); }
            if (file.endsWith(".astro")) { frameworkFiles.astro++; componentFiles.push(full); }
            if (file.endsWith(".marko")) { frameworkFiles.marko++; componentFiles.push(full); }

            // React / Solid / Qwik detection
            if (file.endsWith(".jsx") || file.endsWith(".tsx")) {
                frameworkFiles.react++;
                componentFiles.push(full);

                const text = fs.readFileSync(full, "utf8");
                if (text.includes("qwik")) frameworkFiles.qwik++;
                if (text.toLowerCase().includes("solid")) frameworkFiles.solid++;
                if (text.toLowerCase().includes("preact")) frameworkFiles.preact++;
            }

            // Lit
            if (file.endsWith(".ts") || file.endsWith(".js")) {
                const text = fs.readFileSync(full, "utf8");
                if (text.includes("lit-element") || text.includes("lit-html") || text.includes("from 'lit'"))
                    frameworkFiles.lit++;
            }

            // Angular markers
            if (file === "angular.json" || file.endsWith(".component.ts")) frameworkFiles.angular++;

            // Ember markers
            if (file === "ember-cli-build.js") frameworkFiles.ember++;

            // Stencil markers
            if (file.includes("stencil.config")) frameworkFiles.stencil++;

            // Collect config files
            if (file === "svelte.config.js" || file === "svelte.config.ts") configFiles.svelte.push(full);
            if (file === "next.config.js" || file === "next.config.mjs") configFiles.next.push(full);
            if (file === "nuxt.config.js" || file === "nuxt.config.ts") configFiles.nuxt.push(full);
            if (file === "astro.config.mjs" || file === "astro.config.ts") configFiles.astro.push(full);
            if (file === "angular.json") configFiles.angular.push(full);
            if (file === "vite.config.js" || file === "vite.config.ts") configFiles.vite.push(full);
        }
    }

    walk(root);

    return { frameworkFiles, componentFiles, configFiles };
}

/* ============================================================
   FRAMEWORK DETECTORS (based on pkg + scan)
============================================================ */
function detectSvelte(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.svelte > 0 ||
                  pkg.dependencies?.svelte ||
                  pkg.devDependencies?.svelte,
        count: scan.frameworkFiles.svelte,
        version: pkg.dependencies?.svelte ?? pkg.devDependencies?.svelte ?? null,
        config: scan.configFiles.svelte
    };
}

function detectSvelteKit(pkg: any, scan: any) {
    return {
        detected: pkg.dependencies?.["@sveltejs/kit"] ||
                  pkg.devDependencies?.["@sveltejs/kit"] ||
                  scan.configFiles.svelte.some(f => f.includes("kit")),
        version: pkg.dependencies?.["@sveltejs/kit"] ?? pkg.devDependencies?.["@sveltejs/kit"] ?? null
    };
}

function detectReact(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.react > 0 ||
                  pkg.dependencies?.react ||
                  pkg.devDependencies?.react,
        count: scan.frameworkFiles.react,
        version: pkg.dependencies?.react ?? null
    };
}

function detectVue(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.vue > 0 ||
                  pkg.dependencies?.vue ||
                  pkg.devDependencies?.vue,
        count: scan.frameworkFiles.vue,
        version: pkg.dependencies?.vue ?? null
    };
}

function detectAstro(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.astro > 0 ||
                  pkg.dependencies?.astro ||
                  pkg.devDependencies?.astro,
        count: scan.frameworkFiles.astro,
        integrations: Object.keys(pkg.dependencies ?? {}).filter(d => d.startsWith("@astrojs/"))
    };
}

function detectSolid(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.solid > 0 || pkg.dependencies?.solidjs,
        count: scan.frameworkFiles.solid,
        version: pkg.dependencies?.solidjs ?? null
    };
}

function detectQwik(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.qwik > 0 || pkg.dependencies?.["@builder.io/qwik"],
        count: scan.frameworkFiles.qwik,
        version: pkg.dependencies?.["@builder.io/qwik"] ?? null
    };
}

function detectPreact(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.preact > 0 || pkg.dependencies?.preact,
        count: scan.frameworkFiles.preact,
        version: pkg.dependencies?.preact ?? null
    };
}

function detectLit(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.lit > 0 || pkg.dependencies?.lit,
        count: scan.frameworkFiles.lit,
        version: pkg.dependencies?.lit ?? null
    };
}

function detectAngular(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.angular > 0 ||
                  pkg.dependencies?.["@angular/core"],
        count: scan.frameworkFiles.angular,
        version: pkg.dependencies?.["@angular/core"] ?? null
    };
}

function detectEmber(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.ember > 0 || pkg.dependencies?.ember,
        count: scan.frameworkFiles.ember
    };
}

function detectStencil(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.stencil > 0 ||
                  pkg.dependencies?.["@stencil/core"],
        count: scan.frameworkFiles.stencil,
        version: pkg.dependencies?.["@stencil/core"] ?? null
    };
}

function detectMarko(pkg: any, scan: any) {
    return {
        detected: scan.frameworkFiles.marko > 0 || pkg.dependencies?.marko,
        count: scan.frameworkFiles.marko,
        version: pkg.dependencies?.marko ?? null
    };
}

function detectNext(pkg: any, scan: any) {
    return {
        detected: pkg.dependencies?.next ||
                  pkg.devDependencies?.next ||
                  scan.configFiles.next.length > 0,
        version: pkg.dependencies?.next ?? null
    };
}

function detectNuxt(pkg: any, scan: any) {
    return {
        detected: pkg.dependencies?.nuxt ||
                  pkg.devDependencies?.nuxt ||
                  scan.configFiles.nuxt.length > 0,
        version: pkg.dependencies?.nuxt ?? null
    };
}

function detectRemix(pkg: any, scan: any) {
    return {
        detected: pkg.dependencies?.["@remix-run/react"] ||
                  scan.configFiles.remix?.length > 0,
        version: pkg.dependencies?.["@remix-run/react"] ?? null
    };
}

/* ============================================================
   META FRAMEWORK AUTODETECT (SSR / SPA / MPA / Islands)
============================================================ */
function calculateMetaFrameworks(pkg: any, scan: any) {
    return {
        isSSR:
            pkg.dependencies?.next ||
            pkg.dependencies?.nuxt ||
            pkg.dependencies?.["@sveltejs/kit"] ||
            pkg.dependencies?.["@remix-run/react"],

        isSPA:
            pkg.dependencies?.react && !pkg.dependencies?.next &&
            pkg.dependencies?.vue && !pkg.dependencies?.nuxt,

        isMPA: scan.frameworkFiles.astro > 0,

        isIslandArchitecture:
            scan.frameworkFiles.astro > 0 ||
            scan.frameworkFiles.qwik > 0
    };
}