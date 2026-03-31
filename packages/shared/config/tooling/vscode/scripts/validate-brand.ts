/**
 * Brand Validation Script
 *
 * Validates that package.json `contributes.commands` and
 * `contributes.configuration.properties` stay in sync with brand.ts constants.
 *
 * Exits non-zero on any mismatch — integrated into `qa:lint`.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-63.md TASK 3
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Read brand.ts COMMANDS and CONFIG_SECTION via regex (no TypeScript import)
// ---------------------------------------------------------------------------

const brandPath: string = resolve(__dirname, '../src/shared/brand.ts');
const brandSource: string = readFileSync(brandPath, 'utf-8');

// Extract COMMANDS values
const commandsBlock: RegExpMatchArray | null = brandSource.match(
  /export\s+const\s+COMMANDS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/,
);
if (!commandsBlock) {
  console.error('FAIL: Could not parse COMMANDS from brand.ts');
  process.exit(1);
}

const brandCommands: string[] = [];
const commandLineRegex: RegExp = /:\s*'([^']+)'/g;
let match: RegExpExecArray | null;
while ((match = commandLineRegex.exec(commandsBlock[1])) !== null) {
  brandCommands.push(match[1]);
}

// Extract CONFIG_SECTION
const configMatch: RegExpMatchArray | null = brandSource.match(
  /export\s+const\s+CONFIG_SECTION\s*=\s*'([^']+)'/,
);
if (!configMatch) {
  console.error('FAIL: Could not parse CONFIG_SECTION from brand.ts');
  process.exit(1);
}
const configSection: string = configMatch[1];

// ---------------------------------------------------------------------------
// 2. Read package.json
// ---------------------------------------------------------------------------

const pkgPath: string = resolve(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
  contributes: {
    commands: Array<{ command: string }>;
    configuration: { properties: Record<string, unknown> };
  };
};

const pkgCommands: string[] = pkg.contributes.commands.map((c: { command: string }) => c.command);
const pkgSettings: string[] = Object.keys(pkg.contributes.configuration.properties);

// ---------------------------------------------------------------------------
// 3. Validate commands
// ---------------------------------------------------------------------------

let errors = 0;

// Every brand.ts command must exist in package.json
for (const cmd of brandCommands) {
  if (!pkgCommands.includes(cmd)) {
    console.error(`FAIL: brand.ts command "${cmd}" missing from package.json contributes.commands`);
    errors++;
  }
}

// Every package.json command must exist in brand.ts
for (const cmd of pkgCommands) {
  if (!brandCommands.includes(cmd)) {
    console.error(`FAIL: package.json command "${cmd}" not found in brand.ts COMMANDS`);
    errors++;
  }
}

// ---------------------------------------------------------------------------
// 4. Validate setting prefixes
// ---------------------------------------------------------------------------

for (const key of pkgSettings) {
  if (!key.startsWith(`${configSection}.`)) {
    console.error(
      `FAIL: package.json setting "${key}" does not start with CONFIG_SECTION "${configSection}."`,
    );
    errors++;
  }
}

// ---------------------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------------------

if (errors > 0) {
  console.error(`\nBrand validation FAILED: ${errors} error(s)`);
  process.exit(1);
} else {
  console.log(
    `Brand validation passed: ${brandCommands.length} commands, ${pkgSettings.length} settings`,
  );
}
