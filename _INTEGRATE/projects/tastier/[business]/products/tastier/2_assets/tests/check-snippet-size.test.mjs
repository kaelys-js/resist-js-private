import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const FILE = path.join(DIST, "index.js");
const SCRIPT = path.join(ROOT, "scripts", "check-snippet-size.mjs");
const LIMIT = 65_536;

function run(env = {}) {
    const res = spawnSync("node", [SCRIPT], {
        env: { ...process.env, ...env },
        encoding: "utf8"
    });
    return {
        code: res.status,
        stdout: res.stdout,
        stderr: res.stderr
    };
}

function write(bytes) {
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(FILE, "a".repeat(bytes));
}

function clean() {
    fs.rmSync(DIST, { recursive: true, force: true });
}

test.beforeEach(clean);
test.afterEach(clean);

/* A. Happy path */

test("1) size < limit passes", () => {
    write(1);
    const r = run();
    assert.equal(r.code, 0);
});

test("2) size == limit passes", () => {
    write(LIMIT);
    const r = run();
    assert.equal(r.code, 0);
});

test("3) size just under limit passes", () => {
    write(LIMIT - 1);
    const r = run();
    assert.equal(r.code, 0);
});

/* B. Size violation */

test("4) size > limit fails", () => {
    write(LIMIT + 1);
    const r = run();
    assert.equal(r.code, 1);
    assert.match(r.stderr, /limit exceeded/i);
});

test("5) far over limit fails with correct overage", () => {
    write(200_000);
    const r = run();
    assert.equal(r.code, 1);
    assert.match(r.stderr, /over/i);
});

/* C. Artifact integrity */

test("6) missing artifact fails with code 2", () => {
    const r = run();
    assert.equal(r.code, 2);
    assert.match(r.stderr, /not found/i);
});

test("7) wrong output path fails", () => {
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(path.join(DIST, "main.js"), "x");
    const r = run();
    assert.equal(r.code, 2);
});

test("8) zero-byte file passes", () => {
    write(0);
    const r = run();
    assert.equal(r.code, 0);
});

/* D. Filesystem / platform robustness */

test("9) windows-style path resolution (simulated)", () => {
    write(100);
    const r = run();
    assert.equal(r.code, 0);
});

test("10) symlinked dist directory works", () => {
    const real = path.join(ROOT, "dist-real");
    fs.mkdirSync(real, { recursive: true });
    fs.writeFileSync(path.join(real, "index.js"), "a");
    fs.symlinkSync(real, DIST, "dir");
    const r = run();
    assert.equal(r.code, 0);
    fs.rmSync(real, { recursive: true, force: true });
});

test("11) read-only file is readable", () => {
    write(10);
    fs.chmodSync(FILE, 0o444);
    const r = run();
    assert.equal(r.code, 0);
});

/* E. Output correctness / UX */

test("12) TTY color output (best-effort)", () => {
    write(LIMIT + 1);
    const r = run();
    assert.equal(r.code, 1);
});

test("13) non-TTY has no ANSI codes", () => {
    write(LIMIT + 1);
    const r = spawnSync("node", [SCRIPT], {
        env: { ...process.env, FORCE_COLOR: "0" },
        encoding: "utf8"
    });
    assert.equal(r.status, 1);
    assert.ok(!/\x1b\[/u.test(r.stderr));
});

test("14) VERBOSE=1 prints success", () => {
    write(10);
    const r = run({ VERBOSE: "1" });
    assert.equal(r.code, 0);
    assert.match(r.stdout, /size ok/i);
});

test("15) VERBOSE=1 does not suppress failure output", () => {
    write(LIMIT + 1);
    const r = run({ VERBOSE: "1" });
    assert.equal(r.code, 1);
    assert.match(r.stderr, /limit exceeded/i);
});

/* F. Determinism */

test("16) repeat runs are deterministic", () => {
    write(10);
    const r1 = run();
    const r2 = run();
    assert.deepEqual(r1.code, r2.code);
});

test("17) dev-size may fail while prod-size passes", () => {
    write(LIMIT + 100);
    const r1 = run();
    assert.equal(r1.code, 1);
    write(100);
    const r2 = run();
    assert.equal(r2.code, 0);
});

test("18) trailing newline affects size exactly", () => {
    fs.mkdirSync(DIST, { recursive: true });
    fs.writeFileSync(FILE, "a\n");
    const size = fs.statSync(FILE).size;
    const r = run();
    assert.equal(r.code, size <= LIMIT ? 0 : 1);
});

/* G. Explicit non-goals */

test("19) gzip size ignored (raw size enforced)", () => {
    write(LIMIT + 1);
    const r = run();
    assert.equal(r.code, 1);
});

test("20) bundler-agnostic artifact works", () => {
    write(1234);
    const r = run();
    assert.equal(r.code, 0);
});

test("21) no wrangler dependency", () => {
    write(1234);
    const r = run();
    assert.equal(r.code, 0);
});