/**
 * Manifest Generation & Validation Script
 *
 * Pre-build step that validates package.json `contributes` stays in sync
 * with brand.ts constants. When run with `--fix`, regenerates the
 * `contributes.commands` array from brand.ts COMMANDS + existing titles.
 *
 * Integrated into the `build` script so out-of-sync manifests are caught
 * before compilation.
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-64.md TASK 3-4
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Write to stdout.
 *
 * @param msg - Message to write
 */
function log(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

/**
 * Write to stderr.
 *
 * @param msg - Message to write
 */
function logError(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

/**
 * Safely extract a regex capture group, throwing if undefined.
 *
 * @param match - The regex match array
 * @param index - The capture group index
 * @param label - Human-readable label for error messages
 * @returns The captured string
 */
function capture(match: RegExpMatchArray | RegExpExecArray, index: number, label: string): string {
  const value: string | undefined = match[index];

  if (value === undefined) {
    throw new Error(`Missing capture group ${index} in ${label}`);
  }
  return value;
}

const FIX_MODE: boolean = process.argv.includes('--fix');

// =============================================================================
// 1. Parse brand.ts
// =============================================================================

/**
 * Parse COMMANDS from brand.ts source code.
 *
 * Supports both single-quoted string values and template literals using
 * `${COMMAND_PREFIX}`. Returns a Map of command key to resolved command ID.
 *
 * @param source - The brand.ts source code
 * @returns Map of command key to command ID string
 */
export function parseBrandCommands(source: string): Map<string, string> {
  const commandsBlock: RegExpMatchArray | null = source.match(
    /export\s+const\s+COMMANDS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/,
  );

  if (!commandsBlock) {
    throw new Error('FAIL: Could not parse COMMANDS from brand.ts');
  }

  const commandPrefixMatch: RegExpMatchArray | null = source.match(
    /export\s+const\s+COMMAND_PREFIX\s*=\s*'([^']+)'/,
  );

  if (!commandPrefixMatch) {
    throw new Error('FAIL: Could not parse COMMAND_PREFIX from brand.ts');
  }

  const prefix: string = capture(commandPrefixMatch, 1, 'COMMAND_PREFIX');
  const block: string = capture(commandsBlock, 1, 'COMMANDS block');
  const result = new Map<string, string>();

  // Match: key: 'value' (single-quoted)
  const singleQuoteRegex: RegExp = /(\w+):\s*'([^']+)'/g;
  let m: RegExpExecArray | null;

  while ((m = singleQuoteRegex.exec(block)) !== null) {
    result.set(capture(m, 1, 'command key'), capture(m, 2, 'command id'));
  }

  // Match: key: `${COMMAND_PREFIX}.rest.of.id` (template literal)
  const templateLiteralRegex: RegExp = /(\w+):\s*`\$\{COMMAND_PREFIX\}\.([^`]+)`/g;

  while ((m = templateLiteralRegex.exec(block)) !== null) {
    result.set(
      capture(m, 1, 'command key'),
      `${prefix}.${capture(m, 2, 'template suffix')}`,
    );
  }

  return result;
}

const brandPath: string = resolve(__dirname, '../src/shared/brand.ts');
const brandSource: string = readFileSync(brandPath, 'utf8');
const brandCommands: Map<string, string> = parseBrandCommands(brandSource);

// Extract CONFIG_SECTION
const configMatch: RegExpMatchArray | null = brandSource.match(
  /export\s+const\s+CONFIG_SECTION\s*=\s*'([^']+)'/,
);

if (!configMatch) {
  throw new Error('FAIL: Could not parse CONFIG_SECTION from brand.ts');
}

const configSection: string = capture(configMatch, 1, 'CONFIG_SECTION');

// Extract BRAND_NAME
const brandNameMatch: RegExpMatchArray | null = brandSource.match(
  /export\s+const\s+BRAND_NAME\s*=\s*'([^']+)'/,
);

if (!brandNameMatch) {
  throw new Error('FAIL: Could not parse BRAND_NAME from brand.ts');
}

const brandName: string = capture(brandNameMatch, 1, 'BRAND_NAME');

// Extract BINARY_NAME
const binaryNameMatch: RegExpMatchArray | null = brandSource.match(
  /export\s+const\s+BINARY_NAME\s*=\s*'([^']+)'/,
);

if (!binaryNameMatch) {
  throw new Error('FAIL: Could not parse BINARY_NAME from brand.ts');
}

const binaryName: string = capture(binaryNameMatch, 1, 'BINARY_NAME');

// =============================================================================
// 2. Read package.json
// =============================================================================

const pkgPath: string = resolve(__dirname, '../package.json');
const pkgRaw: string = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw) as {
  displayName: string;
  description: string;
  contributes: {
    commands: Array<{ command: string; title: string; category?: string }>;
    configuration: { title: string; properties: Record<string, { description?: string }> };
  };
};

// =============================================================================
// 3. Build existing title map from package.json
// =============================================================================

const existingTitles = new Map<string, { title: string; category?: string }>();

for (const cmd of pkg.contributes.commands) {
  existingTitles.set(cmd.command, { title: cmd.title, category: cmd.category });
}

// =============================================================================
// 4. Validate or fix
// =============================================================================

let errors = 0;

// Check every brand.ts command exists in package.json
for (const [key, cmdId] of brandCommands) {
  if (!existingTitles.has(cmdId)) {
    logError(`FAIL: brand.ts COMMANDS.${key} = "${cmdId}" missing from package.json`);
    errors++;
  }
}

// Check every package.json command exists in brand.ts
const brandCommandIds = new Set(brandCommands.values());

for (const cmd of pkg.contributes.commands) {
  if (!brandCommandIds.has(cmd.command)) {
    logError(`FAIL: package.json command "${cmd.command}" not in brand.ts COMMANDS`);
    errors++;
  }
}

// Check setting prefixes
for (const key of Object.keys(pkg.contributes.configuration.properties)) {
  if (!key.startsWith(`${configSection}.`)) {
    logError(`FAIL: setting "${key}" doesn't start with "${configSection}."`);
    errors++;
  }
}

// Check displayName contains brand name
if (!pkg.displayName.includes(brandName)) {
  logError(`FAIL: displayName "${pkg.displayName}" doesn't contain brand name "${brandName}"`);
  errors++;
}

// Check configuration title contains brand name
if (!pkg.contributes.configuration.title.includes(brandName)) {
  logError(
    `FAIL: configuration.title "${pkg.contributes.configuration.title}" doesn't contain "${brandName}"`,
  );
  errors++;
}

// Check all command categories match brand name
for (const cmd of pkg.contributes.commands) {
  if (cmd.category && cmd.category !== brandName) {
    logError(`FAIL: command "${cmd.command}" category "${cmd.category}" != "${brandName}"`);
    errors++;
  }
}

// Check command order matches brand.ts order
const brandOrder: string[] = [...brandCommands.values()];
const pkgOrder: string[] = pkg.contributes.commands.map((c) => c.command);

for (let i = 0; i < brandOrder.length; i++) {
  const currentCmd: string | undefined = brandOrder[i];

  if (currentCmd === undefined) {
    continue;
  }

  const pkgIdx: number = pkgOrder.indexOf(currentCmd);

  if (pkgIdx !== -1 && i > 0) {
    const prevCmd: string | undefined = brandOrder[i - 1];

    if (prevCmd === undefined) {
      continue;
    }

    const prevIdx: number = pkgOrder.indexOf(prevCmd);

    if (prevIdx !== -1 && pkgIdx < prevIdx) {
      logError(
        `WARN: package.json command order doesn't match brand.ts order ("${currentCmd}" before "${prevCmd}")`,
      );
    }
  }
}

// Check setting descriptions don't hardcode the binary name as a plain string
// (command IDs like "resist.lint.enable" are fine — they come from brand.ts)
for (const [key, prop] of Object.entries(pkg.contributes.configuration.properties)) {
  if (prop.description && prop.description.includes(binaryName)) {
    logError(`WARN: setting "${key}" description hardcodes "${binaryName}"`);
  }
}

// =============================================================================
// 4b. Validate README.md and CHANGELOG.md brand references
// =============================================================================

const readmePath: string = resolve(__dirname, '../README.md');
const changelogPath: string = resolve(__dirname, '../CHANGELOG.md');

function validateMarkdown(filePath: string, label: string): void {
  let content: string;

  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    logError(`WARN: ${label} not found at ${filePath}`);
    return;
  }

  if (!content.includes(brandName)) {
    logError(`FAIL: ${label} doesn't contain brand name "${brandName}"`);
    errors++;
  }

  // Check binary name appears where expected (e.g. "The `resist-lint` CLI")
  if (label === 'README.md' && !content.includes(binaryName)) {
    logError(`FAIL: ${label} doesn't contain binary name "${binaryName}"`);
    errors++;
  }

  // Validate README command table row count matches brand.ts
  if (label === 'README.md') {
    const cmdSection = content.match(/## Commands[\s\S]*?(?=\n## |$)/);

    if (cmdSection) {
      const tableRows = cmdSection[0].match(/^\| .+\| .+\|$/gm);
      // Subtract 1 for header row (separator row uses dashes, won't match .+)
      const cmdRows: number = tableRows ? tableRows.length - 1 : 0;

      if (cmdRows > 0 && cmdRows !== brandCommands.size) {
        logError(
          `WARN: ${label} command table has ${cmdRows} rows, brand.ts has ${brandCommands.size}`,
        );
      }
    }
  }
}

validateMarkdown(readmePath, 'README.md');
validateMarkdown(changelogPath, 'CHANGELOG.md');

// =============================================================================
// 5. Fix mode: rewrite commands array from brand.ts order
// =============================================================================

if (FIX_MODE && errors > 0) {
  const newCommands: Array<{ command: string; title: string; category?: string }> = [];

  for (const [_key, cmdId] of brandCommands) {
    const existing = existingTitles.get(cmdId);

    if (existing) {
      newCommands.push({ command: cmdId, title: existing.title, category: existing.category });
    } else {
      // New command: generate placeholder title
      const parts: string[] = cmdId.split('.');

      const lastPart: string | undefined = parts.at(-1);

      if (lastPart === undefined) {
        continue;
      }

      const titleFromId: string = lastPart.replaceAll(/([A-Z])/g, ' $1').trim();

      newCommands.push({
        command: cmdId,
        title: `Lint: ${titleFromId.charAt(0).toUpperCase()}${titleFromId.slice(1)}`,
        category: brandName,
      });
      log(`ADDED: "${cmdId}" with placeholder title`);
    }
  }

  pkg.contributes.commands = newCommands;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  log(`Fixed: regenerated ${newCommands.length} commands in package.json`);
}

// =============================================================================
// 6. Report
// =============================================================================

if (errors > 0 && !FIX_MODE) {
  throw new Error(`Manifest validation FAILED: ${errors} error(s). Run with --fix to auto-repair.`);
} else {
  log(
    `Manifest validated: ${brandCommands.size} commands, ${Object.keys(pkg.contributes.configuration.properties).length} settings`,
  );
}
