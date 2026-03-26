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

export function getLinterAndFormatterInfo() {
    return {
        eslint: detectESLint(),
        biome: detectBiome(),
        oxlint: detectOXLint(),
        rome: detectRomeLinter(),
        prettier: detectPrettier(),
        dprint: detectDprint(),
        standard: detectStandardJS(),
        stylelint: detectStylelint(),
        markdownlint: detectMarkdownlint(),
        yamllint: detectYamllint(),
        tomllint: detectTomlLint(),
        svelteCheck: detectSvelteCheck(),
        commitlint: detectCommitlint(),
        husky: detectHusky(),
        lintStaged: detectLintStaged(),
        editorConfig: detectEditorConfig(),

        specialFormatters: detectSpecialFormatters(),
        formatCapabilities: detectFormatterCapabilities(),
    };
}

/* ============================================================
   ESLINT
============================================================ */
function detectESLint() {
    const configFiles = [
        ".eslintrc",
        ".eslintrc.json",
        ".eslintrc.cjs",
        ".eslintrc.js",
        ".eslintrc.yaml",
        ".eslintrc.yml",
        "eslint.config.js",
        "eslint.config.cjs",
    ];

    return {
        installed: !!safe("which eslint"),
        version: safe("eslint --version"),
        config: configFiles.find(exists) || null,
        plugins: detectNpmDeps(d => d.startsWith("eslint-plugin-")),
        configs: detectNpmDeps(d => d.startsWith("eslint-config-")),
        parsers: detectNpmDeps(d => d.includes("parser") || d.includes("eslint-parser")),
        rules: detectNpmDeps(d => d.includes("rule")),
    };
}

/* ============================================================
   BIOME (Lint + Format)
============================================================ */
function detectBiome() {
    return {
        installed: !!safe("which biome"),
        version: safe("biome --version"),
        config: exists("biome.json") || exists("biome.jsonc") ? "biome.json" : null,
    };
}

/* ============================================================
   OXLINT (Rust-based ESLint alternative)
============================================================ */
function detectOXLint() {
    return {
        installed: !!safe("which oxlint"),
        version: safe("oxlint --version"),
    };
}

/* ============================================================
   ROME LINTER + FORMATTER
============================================================ */
function detectRomeLinter() {
    const config = exists("rome.json") || exists("rome.json5");
    return {
        installed: !!safe("which rome"),
        version: safe("rome --version"),
        config,
    };
}

/* ============================================================
   PRETTIER
============================================================ */
function detectPrettier() {
    const configs = [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.cjs",
        "prettier.config.js",
        "prettier.config.cjs",
        ".prettierrc.yaml",
        ".prettierrc.yml",
    ];

    return {
        installed: !!safe("which prettier"),
        version: safe("prettier --version"),
        config: configs.find(exists) || null,
        plugins: detectNpmDeps(d => d.startsWith("prettier-plugin-")),
    };
}

/* ============================================================
   DPRINT (Rust-based multiformatter)
============================================================ */
function detectDprint() {
    return {
        installed: !!safe("which dprint"),
        version: safe("dprint --version"),
        config: exists("dprint.json") ? "dprint.json" : null,
    };
}

/* ============================================================
   STANDARDJS
============================================================ */
function detectStandardJS() {
    return {
        installed: !!safe("which standard"),
        version: safe("standard --version"),
    };
}

/* ============================================================
   STYLELINT
============================================================ */
function detectStylelint() {
    return {
        installed: !!safe("which stylelint"),
        version: safe("stylelint --version"),
        config:
            ["stylelint.config.js", ".stylelintrc", ".stylelintrc.json", ".stylelintrc.yml"]
                .find(exists) || null,
    };
}

/* ============================================================
   MARKDOWNLINT
============================================================ */
function detectMarkdownlint() {
    return {
        installed: !!safe("which markdownlint"),
        version: safe("markdownlint --version"),
    };
}

/* ============================================================
   YAMLLINT
============================================================ */
function detectYamllint() {
    return {
        installed: !!safe("which yamllint"),
        version: safe("yamllint --version"),
    };
}

/* ============================================================
   TOML LINT / CHECK
============================================================ */
function detectTomlLint() {
    return {
        taplo: !!safe("which taplo") ? safe("taplo --version") : null,
        tomlSort: !!safe("which toml-sort") ? safe("toml-sort --version") : null,
    };
}

/* ============================================================
   SVELTE CHECK
============================================================ */
function detectSvelteCheck() {
    return {
        installed: !!safe("which svelte-check"),
        version: safe("svelte-check --version"),
    };
}

/* ============================================================
   COMMITLINT
============================================================ */
function detectCommitlint() {
    const cfg = [
        "commitlint.config.js",
        ".commitlintrc.js",
        ".commitlintrc.cjs",
        ".commitlintrc.json",
    ].find(exists);

    return {
        installed: !!safe("which commitlint"),
        version: safe("commitlint --version"),
        config: cfg || null,
    };
}

/* ============================================================
   HUSKY
============================================================ */
function detectHusky() {
    return {
        installed: exists(".husky"),
        hooks: exists(".husky") ? fs.readdirSync(".husky").filter(f => !f.startsWith(".")) : [],
    };
}

/* ============================================================
   LINT-STAGED
============================================================ */
function detectLintStaged() {
    const pkg = loadPackageJSON();
    return {
        installed: !!safe("which lint-staged") || !!pkg?.["lint-staged"],
        version: safe("lint-staged --version"),
        config: pkg?.["lint-staged"] ?? null,
    };
}

/* ============================================================
   EDITORCONFIG
============================================================ */
function detectEditorConfig() {
    return {
        exists: exists(".editorconfig"),
        path: exists(".editorconfig") ? ".editorconfig" : null,
    };
}

/* ============================================================
   SPECIAL FORMATTERS (JSON/YAML/TOML/etc)
============================================================ */
function detectSpecialFormatters() {
    return {
        jsonFormat: !!safe("which jq"),
        yamlFormat: !!safe("which yq"),
        tomlFormat: !!safe("which taplo"),
    };
}

/* ============================================================
   CAPABILITIES SUMMARY
============================================================ */
function detectFormatterCapabilities() {
    return {
        canFormatJS:
            !!safe("which prettier") ||
            !!safe("which biome") ||
            !!safe("which rome") ||
            !!safe("which dprint"),

        canFormatCSS:
            !!safe("which stylelint") ||
            !!safe("which prettier"),

        canFormatHTML:
            !!safe("which prettier") ||
            !!safe("which dprint"),

        canFormatSvelte:
            exists("svelte.config.js") ||
            !!safe("which svelte-check") ||
            !!safe("which prettier"),

        canLintJS:
            !!safe("which eslint") ||
            !!safe("which biome") ||
            !!safe("which oxlint") ||
            !!safe("which rome"),

        canLintStyles: !!safe("which stylelint"),
    };
}

/* ============================================================
   HELPERS
============================================================ */
function detectNpmDeps(filterFn: (d: string) => boolean) {
    const pkg = loadPackageJSON();
    if (!pkg) return [];

    const deps = Object.keys({
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
    });

    return deps.filter(filterFn);
}

function loadPackageJSON() {
    const file = path.resolve("package.json");
    if (!exists("package.json")) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
}