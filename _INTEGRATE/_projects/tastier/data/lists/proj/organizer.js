// process-file.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

async function processFile(inputPath) {
    const resolvedInput = resolve(inputPath);
    const inputDir = dirname(resolvedInput);
    const fileName = basename(resolvedInput);

    const outputDir = join(inputDir, 'final');
    const outputPath = join(outputDir, fileName);

    await mkdir(outputDir, { recursive: true });

    const raw = await readFile(resolvedInput, 'utf8');

    const lines = raw
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);

    const counts = new Map();

    for (const line of lines) {
        counts.set(line, (counts.get(line) ?? 0) + 1);
    }

    const uniqueSorted = [...counts.keys()].sort();

    const duplicateCount = [...counts.values()]
        .reduce((sum, count) => sum + Math.max(0, count - 1), 0);

    await writeFile(outputPath, uniqueSorted.join('\n'), 'utf8');

    console.log(`Saved ${uniqueSorted.length} unique entries to ${outputPath}`);
    console.log(`Removed ${duplicateCount} duplicate entries`);
}

if (process.argv.length !== 3) {
    console.error('Usage: node process-file.mjs <input-file>');
    process.exit(1);
}

processFile(process.argv[2]).catch(err => {
    console.error(err);
    process.exit(1);
});