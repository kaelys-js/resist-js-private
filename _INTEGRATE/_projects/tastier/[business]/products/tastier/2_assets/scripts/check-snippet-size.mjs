import fs from "node:fs";
import path from "node:path";

const MAX_BYTES = 65_536;
const FILE = path.resolve("dist/index.js");
const VERBOSE = process.env.VERBOSE === "1";

const supportsColor = process.stdout.isTTY;
const color = {
    red: (s) => supportsColor ? `\x1b[31m${s}\x1b[0m` : s,
    green: (s) => supportsColor ? `\x1b[32m${s}\x1b[0m` : s,
    yellow: (s) => supportsColor ? `\x1b[33m${s}\x1b[0m` : s,
    dim: (s) => supportsColor ? `\x1b[2m${s}\x1b[0m` : s
};

function bytes(n) {
    return `${n.toLocaleString()} bytes`;
}

if (!fs.existsSync(FILE)) {
    console.error(color.red("✖ Snippet build artifact not found"));
    console.error(color.dim(`  Expected: ${FILE}`));
    process.exit(2);
}

const size = fs.statSync(FILE).size;

if (size > MAX_BYTES) {
    const over = size - MAX_BYTES;

    console.error(color.red("✖ Cloudflare Snippet size limit exceeded"));
    console.error("");
    console.error(`  File:   ${FILE}`);
    console.error(`  Size:   ${bytes(size)}`);
    console.error(`  Limit:  ${bytes(MAX_BYTES)}`);
    console.error(`  Over:   ${color.yellow(bytes(over))}`);
    console.error("");
    console.error(color.dim("  Fix: reduce bundle size (remove deps, tighten tree-shaking, refactor)."));
    process.exit(1);
}

if (VERBOSE) {
    console.log(color.green("✔ Snippet size OK"));
    console.log(`  File:  ${FILE}`);
    console.log(`  Size:  ${bytes(size)} / ${bytes(MAX_BYTES)}`);
}