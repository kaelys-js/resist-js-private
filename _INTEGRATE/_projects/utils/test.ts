import { execSync } from "child_process";
import fs from "fs";

function safe(cmd: string) {
    try { return execSync(cmd, { encoding: "utf8" }).trim(); }
    catch { return null; }
}

export function getTestEnvironmentInfo() {
    return {
        // -------------------------------------------------------
        // CORE TEST RUNNERS
        // -------------------------------------------------------
        jest: detectJest(),
        vitest: detectVitest(),
        mocha: detectMocha(),
        jasmine: detectJasmine(),
        ava: detectAva(),
        uvu: detectUvu(),
        tap: detectTap(),
        tape: detectTape(),
        qunit: detectQunit(),

        // -------------------------------------------------------
        // JS/TS BUILT-IN TESTERS
        // -------------------------------------------------------
        nodeTestRunner: detectNodeTest(),
        bunTestRunner: detectBunTest(),
        denoTestRunner: detectDenoTest(),

        // -------------------------------------------------------
        // E2E / BROWSER AUTOMATION
        // -------------------------------------------------------
        playwright: detectPlaywright(),
        puppeteer: detectPuppeteer(),
        cypress: detectCypress(),
        webdriverIO: detectWebdriverIO(),
        nightwatch: detectNightwatch(),

        // -------------------------------------------------------
        // BROWSER-LIKE ENVIRONMENTS
        // -------------------------------------------------------
        jsdom: detectJsdom(),
        happyDom: detectHappyDom(),
        browserTesting: detectBrowserTesting(),

        // -------------------------------------------------------
        // COVERAGE SYSTEMS
        // -------------------------------------------------------
        coverage: {
            nyc: !!safe("which nyc"),
            c8: !!safe("which c8"),
            jestCoverage: hasPackage("jest") && exists("coverage"),
            vitestCoverage: hasPackage("vitest") && exists("coverage"),
            v8Native: safe("node -p 'process.env.NODE_V8_COVERAGE || null'"),
        },

        // -------------------------------------------------------
        // PROJECT TEST FILES DETECTION
        // -------------------------------------------------------
        testFiles: detectTestFiles(),
        testDirs: detectTestDirs(),

        // -------------------------------------------------------
        // CI / AUTOMATION SIGNALS
        // -------------------------------------------------------
        ci: detectCI(),

        // -------------------------------------------------------
        // SNAPSHOT SYSTEMS
        // -------------------------------------------------------
        snapshots: {
            jest: exists("__snapshots__"),
            vitest: exists("*.snap"),
        },

        // -------------------------------------------------------
        // GENERAL METADATA
        // -------------------------------------------------------
        hasNodeTestSupport: !!safe("node -e \"require('node:test')\""),
        defaultTimeout: process.env.TEST_TIMEOUT ?? null,
        maxWorkers: process.env.MAX_WORKERS ?? null,
        envVars: extractTestEnv(process.env),
    };
}

/* ============================================================
   BASIC HELPERS
============================================================ */

function hasPackage(name: string) {
    try {
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
        return pkg.dependencies?.[name] || pkg.devDependencies?.[name];
    } catch {
        return false;
    }
}

function exists(path: string) {
    return fs.existsSync(path);
}

function globExists(pattern: string) {
    try {
        const out = safe(`bash -lc "ls ${pattern} 2>/dev/null"`);
        return out && out.length > 0;
    } catch {
        return false;
    }
}

/* ============================================================
   DETECTOR FUNCTIONS
============================================================ */

function detectJest() {
    return {
        installed: hasPackage("jest"),
        version: safe("npx jest --version"),
        config: readConfig("jest.config.js", "jest.config.cjs", "jest.config.ts"),
        hasSnapshots: globExists("**/__snapshots__"),
        hasWatchMode: !!safe("npx jest --help | grep -- --watch"),
    };
}

function detectVitest() {
    return {
        installed: hasPackage("vitest"),
        version: safe("npx vitest --version"),
        config: readConfig("vitest.config.ts", "vitest.config.js"),
        hasCoverage: exists("coverage"),
        ui: safe("npx vitest --help | grep -- --ui") ? true : false,
    };
}

function detectMocha() {
    return {
        installed: hasPackage("mocha"),
        version: safe("npx mocha --version"),
    };
}

function detectJasmine() {
    return {
        installed: hasPackage("jasmine"),
        version: safe("npx jasmine --version"),
        config: readConfig("jasmine.json"),
    };
}

function detectAva() {
    return {
        installed: hasPackage("ava"),
        version: safe("npx ava --version"),
    };
}

function detectUvu() {
    return {
        installed: hasPackage("uvu"),
    };
}

function detectTap() {
    return {
        installed: hasPackage("tap"),
        version: safe("npx tap --version"),
    };
}

function detectTape() {
    return {
        installed: hasPackage("tape"),
    };
}

function detectQunit() {
    return {
        installed: hasPackage("qunit"),
        version: safe("npx qunit --version"),
    };
}

function detectNodeTest() {
    return {
        supported: !!safe("node -e \"require('node:test')\""),
        version: safe("node -p 'process.version'"),
    };
}

function detectBunTest() {
    return {
        installed: !!safe("which bun"),
        version: safe("bun --version"),
        hasTest: safe("bun test --version") ? true : false,
    };
}

function detectDenoTest() {
    return {
        installed: !!safe("which deno"),
        version: safe("deno --version"),
        permissions: safe("deno permissions") ?? null,
    };
}

function detectPlaywright() {
    return {
        installed: hasPackage("@playwright/test") || hasPackage("playwright"),
        version: safe("npx playwright --version"),
        browsersInstalled: safe("npx playwright install --list") ?? null,
    };
}

function detectPuppeteer() {
    return {
        installed: hasPackage("puppeteer"),
        version: safe("node -p \"require('puppeteer/package.json').version\""),
    };
}

function detectCypress() {
    return {
        installed: hasPackage("cypress"),
        version: safe("npx cypress --version"),
    };
}

function detectWebdriverIO() {
    return {
        installed: hasPackage("webdriverio"),
        version: safe("npx wdio --version"),
        config: readConfig("wdio.conf.js", "wdio.conf.ts"),
    };
}

function detectNightwatch() {
    return {
        installed: hasPackage("nightwatch"),
        version: safe("npx nightwatch --version"),
        config: readConfig("nightwatch.conf.js"),
    };
}

function detectJsdom() {
    return {
        installed: hasPackage("jsdom"),
        version: safe("node -p \"require('jsdom/package.json').version\""),
    };
}

function detectHappyDom() {
    return {
        installed: hasPackage("happy-dom"),
        version: safe("node -p \"require('happy-dom/package.json').version\""),
    };
}

function detectBrowserTesting() {
    return {
        chrome: !!safe("which google-chrome") || !!safe("which chrome"),
        firefox: !!safe("which firefox"),
        safari: fs.existsSync("/Applications/Safari.app"),
        edge: !!safe("which microsoft-edge"),
        chromium: !!safe("which chromium"),
        xvfb: !!safe("which Xvfb"),
    };
}

function detectTestFiles() {
    return {
        js: globExists("**/*.test.js") || globExists("**/*.spec.js"),
        ts: globExists("**/*.test.ts") || globExists("**/*.spec.ts"),
        jsx: globExists("**/*.test.jsx"),
        tsx: globExists("**/*.test.tsx"),
        testDir: fs.existsSync("tests") || fs.existsSync("test"),
    };
}

function detectTestDirs() {
    const dirs = [];
    if (fs.existsSync("test")) dirs.push("test");
    if (fs.existsSync("tests")) dirs.push("tests");
    if (fs.existsSync("__tests__")) dirs.push("__tests__");
    return dirs;
}

function detectCI() {
    const env = process.env;
    const known = [
        "GITHUB_ACTIONS",
        "GITLAB_CI",
        "CIRCLECI",
        "TRAVIS",
        "APPVEYOR",
        "BITBUCKET_PIPELINE_UUID",
        "TEAMCITY_VERSION",
        "BUILDKITE",
        "DRONE",
        "SEMAPHORE",
        "JENKINS_HOME",
        "VERCEL",
        "NETLIFY",
        "CLOUDFLARE_PAGES"
    ];
    return known.filter(k => env[k]);
}

function extractTestEnv(env: NodeJS.ProcessEnv) {
    const out: Record<string, string> = {};
    for (const k in env) {
        if (k.includes("TEST") || k.includes("CI") || k.includes("COVERAGE"))
            out[k] = env[k]!;
    }
    return out;
}

function readConfig(...files: string[]) {
    for (const f of files) {
        if (fs.existsSync(f))
            return fs.readFileSync(f, "utf8");
    }
    return null;
}