/**
 * Rule: package/require-readme
 *
 * Every sub-package must have a README.md that:
 * - Has a title matching the package.json name
 * - Has a description paragraph
 * - Lists source files
 * - Documents exported functions in an API table
 * - Includes usage examples
 * - Cross-validates against actual source exports (staleness detection)
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PackageJsonRule, PackageJsonContext, LintResult } from '../../framework/types.ts';

/** Dummy fix for package.json rules (no byte offsets). */
const NO_FIX = { range: { start: 0, end: 0 }, text: '' };

/** Required README sections (heading text patterns). */
const REQUIRED_SECTIONS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /^#{2,3}\s+(source files|files)\s*$/im, label: 'Source Files / Files' },
  { pattern: /^#{2,3}\s+(api|api reference)\s*$/im, label: 'API / API Reference' },
  { pattern: /^#{2,3}\s+(usage|quick start)\s*$/im, label: 'Usage / Quick Start' },
];

/** File path patterns exempt from README validation. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/test\//,
  /config\/tooling\/node\//,
  /products-template\//,
  /extensions\//,
  /secrets\//,
];

/**
 * Check if a package is exempt from README validation.
 *
 * @param {string} filePath - Package.json file path
 * @returns {boolean} Whether exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(filePath));
}

/**
 * Extract exported function names from a TypeScript source file.
 *
 * @param {string} content - File content
 * @returns {string[]} Exported function names
 */
function extractExportedFunctions(content: string): string[] {
  const names: string[] = [];
  const regex: RegExp = /export\s+(?:async\s+)?function\s+(\w+)/g;
  let match: RegExpExecArray | null = regex.exec(content);
  while (match) {
    names.push(match[1]);
    match = regex.exec(content);
  }
  // Also catch exported const arrow functions
  const arrowRegex: RegExp = /export\s+const\s+(\w+)\s*[=:]/g;
  let arrowMatch: RegExpExecArray | null = arrowRegex.exec(content);
  while (arrowMatch) {
    names.push(arrowMatch[1]);
    arrowMatch = arrowRegex.exec(content);
  }
  return names;
}

/**
 * Get all exported function/const names from a package's src directory.
 *
 * @param {string} pkgDir - Package root directory
 * @returns {string[]} All exported names
 */
function getAllExports(pkgDir: string): string[] {
  const srcDir: string = join(pkgDir, 'src');
  if (!existsSync(srcDir)) {
    return [];
  }

  const names: string[] = [];
  const files: string[] = readdirSync(srcDir).filter(
    (f: string): boolean => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'),
  );

  for (const file of files) {
    const content: string = readFileSync(join(srcDir, file), 'utf8');
    names.push(...extractExportedFunctions(content));
  }

  return names;
}

/**
 * Extract function names mentioned in README API tables.
 *
 * @param {string} readme - README content
 * @returns {string[]} Function names found in API tables
 */
function extractReadmeApiFunctions(readme: string): string[] {
  const names: string[] = [];
  // Match table rows: | `functionName` | or | functionName |
  const regex: RegExp = /\|\s*`?(\w+)`?\s*\|/g;
  let match: RegExpExecArray | null = regex.exec(readme);
  while (match) {
    const name: string = match[1];
    // Skip table headers and common non-function words
    if (
      !/^(Export|Function|Kind|Description|Type|Signature|File|Import|Method|Member|Field|Level|Phase|Runtime|Code|When|Source)$/i.test(
        name,
      )
    ) {
      names.push(name);
    }
    match = regex.exec(readme);
  }
  return [...new Set(names)];
}

const rule: PackageJsonRule = {
  id: 'package/require-readme',
  description: 'Every sub-package must have a validated README.md',
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];
    if (context.isRoot) {
      return results;
    }
    if (isExempt(context.file)) {
      return results;
    }

    const pkgDir: string = dirname(context.file);
    const readmePath: string = join(pkgDir, 'README.md');

    // Check 1: README exists
    if (!existsSync(readmePath)) {
      results.push({
        file: context.file,
        line: 1,
        column: 1,
        severity: 'error',
        message: `Package is missing README.md`,
        ruleId: 'package/require-readme',
        tip: 'Create a README.md with title, description, source files, API reference, and usage',
        fix: NO_FIX,
      });
      return results;
    }

    const readme: string = readFileSync(readmePath, 'utf8');
    const pkgName: string = context.pkg.name ?? '';

    // Check 2: Title matches package name
    const titleMatch: RegExpMatchArray | null = readme.match(/^#\s+(.+)$/m);
    if (!titleMatch) {
      results.push({
        file: readmePath,
        line: 1,
        column: 1,
        severity: 'error',
        message: 'README.md is missing a title heading',
        ruleId: 'package/require-readme',
        tip: `Add '# ${pkgName}' as the first line`,
        fix: NO_FIX,
      });
    } else if (titleMatch[1].trim() !== pkgName) {
      results.push({
        file: readmePath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `README title '${titleMatch[1].trim()}' does not match package name '${pkgName}'`,
        ruleId: 'package/require-readme',
        tip: `Change title to '# ${pkgName}'`,
        fix: NO_FIX,
      });
    }

    // Check 3: Required sections exist
    for (const section of REQUIRED_SECTIONS) {
      if (!section.pattern.test(readme)) {
        results.push({
          file: readmePath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `README.md is missing required section: ${section.label}`,
          ruleId: 'package/require-readme',
          tip: `Add a '## ${section.label}' section`,
          fix: NO_FIX,
        });
      }
    }

    // Check 4: Cross-validate API table against source exports
    const sourceExports: string[] = getAllExports(pkgDir);
    const readmeFunctions: string[] = extractReadmeApiFunctions(readme);

    // Functions in source but not documented
    for (const name of sourceExports) {
      if (!readmeFunctions.includes(name) && !readme.includes(name)) {
        results.push({
          file: readmePath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `Exported function '${name}' is not documented in README`,
          ruleId: 'package/require-readme',
          tip: `Add '${name}' to the API reference table`,
          fix: NO_FIX,
        });
      }
    }

    // Functions documented but not in source (stale)
    for (const name of readmeFunctions) {
      if (sourceExports.length > 0 && !sourceExports.includes(name) && !name.endsWith('Schema')) {
        results.push({
          file: readmePath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `README documents '${name}' but it no longer exists in source`,
          ruleId: 'package/require-readme',
          tip: `Remove '${name}' from the API reference — it was deleted from source`,
          fix: NO_FIX,
        });
      }
    }

    return results;
  },
};

export default rule;
