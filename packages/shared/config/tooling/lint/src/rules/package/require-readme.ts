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
import type {
  PackageJsonRule,
  PackageJsonContext,
  LintResult,
  LintFix,
} from '@/lint/framework/types.ts';
import { NO_FIX } from '@/lint/rules/package/_json-fix-helpers.ts';

/** Required README sections (heading text patterns). */
const REQUIRED_SECTIONS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /^#{2,3}\s+(source files|files)\s*$/im, label: 'Source Files / Files' },
  { pattern: /^#{2,3}\s+(api|api reference)\s*$/im, label: 'API / API Reference' },
  { pattern: /^#{2,3}\s+(usage|quick start)\s*$/im, label: 'Usage / Quick Start' },
];

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
    names.push(match[1] ?? '');
    match = regex.exec(content);
  }
  // Also catch exported const arrow functions

  const arrowRegex: RegExp = /export\s+const\s+(\w+)\s*[=:]/g;
  let arrowMatch: RegExpExecArray | null = arrowRegex.exec(content);

  while (arrowMatch) {
    names.push(arrowMatch[1] ?? '');
    arrowMatch = arrowRegex.exec(content);
  }
  // Also catch exported type aliases

  const typeRegex: RegExp = /export\s+type\s+(\w+)\s*[=<]/g;
  let typeMatch: RegExpExecArray | null = typeRegex.exec(content);

  while (typeMatch) {
    names.push(typeMatch[1] ?? '');
    typeMatch = typeRegex.exec(content);
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

  // Only scan the API Reference section — not the entire README
  const apiMatch: RegExpMatchArray | null = readme.match(/^#{2,3}\s+(?:API|API Reference)\s*$/im);

  if (!apiMatch || apiMatch.index === undefined) {
    return names;
  }

  const apiStart: number = apiMatch.index;
  // Find the next top-level ## heading after the API section (or end of file)
  const afterApi: string = readme.slice(apiStart + apiMatch[0].length);
  const nextSectionMatch: RegExpMatchArray | null = afterApi.match(/^## [^#]/m);
  const apiEnd: number =
    nextSectionMatch?.index === undefined
      ? readme.length
      : apiStart + apiMatch[0].length + nextSectionMatch.index;
  const apiSection: string = readme.slice(apiStart, apiEnd);

  // Match FIRST column of table rows: | `functionName` | or | functionName |
  // Only match the first cell (export name), not description cells
  const regex: RegExp = /^\|[ \t]*`?(\w+)`?[ \t]*\|/gm;
  let match: RegExpExecArray | null = regex.exec(apiSection);

  while (match) {
    const name: string = match[1] ?? '';
    // Skip table headers and common non-function words

    if (
      !/^(Export|Function|Kind|Description|Type|Signature|File|Import|Method|Member|Field|Level|Phase|Runtime|Code|When|Source)$/i.test(
        name,
      )
    ) {
      names.push(name);
    }
    match = regex.exec(apiSection);
  }
  return [...new Set(names)];
}

/**
 * Build a fix that deletes a stale API table row from README content.
 *
 * Finds `| <name> |` or `| \`<name>\` |` and removes the entire line.
 *
 * @param {string} readme - README content
 * @param {string} name - Function name to remove
 * @returns {LintFix} Fix that deletes the row or NO_FIX
 */
function buildDeleteApiRowFix(readme: string, name: string): LintFix {
  /* Try both backtick-wrapped and plain formats */
  const patterns: string[] = [`| \`${name}\` |`, `| ${name} |`];

  for (const pattern of patterns) {
    const idx: number = readme.indexOf(pattern);

    if (idx === -1) {
      continue;
    }

    /* Find line boundaries */
    let lineStart: number = idx;

    while (lineStart > 0 && readme[lineStart - 1] !== '\n') {
      lineStart--;
    }

    let lineEnd: number = idx + pattern.length;

    while (lineEnd < readme.length && readme[lineEnd] !== '\n') {
      lineEnd++;
    }

    /* Include the newline */
    if (lineEnd < readme.length) {
      lineEnd++;
    }

    return { range: { start: lineStart, end: lineEnd }, text: '' };
  }

  return NO_FIX;
}

/** The require-readme lint rule. */
const rule: PackageJsonRule = {
  id: 'package/require-readme',
  description: 'Every sub-package must have a validated README.md',
  categories: ['package', 'jsdoc'],
  stages: ['lint'],
  fixable: true,
  check(context: PackageJsonContext): LintResult[] {
    const results: LintResult[] = [];

    if (context.isRoot) {
      return results;
    }

    const pkgDir: string = dirname(context.file);
    const readmePath: string = join(pkgDir, 'README.md');

    // Check 1: README exists — NO_FIX (file creation outside LintFix model)
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

    // Check 2: Title matches package name — REAL FIX
    const titleMatch: RegExpMatchArray | null = readme.match(/^#\s+(.+)$/m);

    if (!titleMatch) {
      /* Missing title: prepend at start of file */
      const titleText: string = `# ${pkgName}\n\n`;
      results.push({
        file: readmePath,
        line: 1,
        column: 1,
        severity: 'error',
        message: 'README.md is missing a title heading',
        ruleId: 'package/require-readme',
        tip: `Add '# ${pkgName}' as the first line`,
        fix: { range: { start: 0, end: 0 }, text: titleText },
      });
    } else if ((titleMatch[1] ?? '').trim() !== pkgName) {
      /* Wrong title: replace the title line */
      const titleStart: number = titleMatch.index ?? 0;
      const titleEnd: number = titleStart + titleMatch[0].length;
      results.push({
        file: readmePath,
        line: 1,
        column: 1,
        severity: 'error',
        message: `README title '${(titleMatch[1] ?? '').trim()}' does not match package name '${pkgName}'`,
        ruleId: 'package/require-readme',
        tip: `Change title to '# ${pkgName}'`,
        fix: { range: { start: titleStart, end: titleEnd }, text: `# ${pkgName}` },
      });
    }

    // Check 3: Required sections exist — REAL FIX (append stub)
    for (const section of REQUIRED_SECTIONS) {
      if (!section.pattern.test(readme)) {
        const stub: string = `\n\n## ${section.label}\n\n<!-- TODO: document -->\n`;
        results.push({
          file: readmePath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `README.md is missing required section: ${section.label}`,
          ruleId: 'package/require-readme',
          tip: `Add a '## ${section.label}' section`,
          fix: { range: { start: readme.length, end: readme.length }, text: stub },
        });
      }
    }

    // Check 4: Cross-validate API table against source exports
    const sourceExports: string[] = getAllExports(pkgDir);
    const readmeFunctions: string[] = extractReadmeApiFunctions(readme);

    // Functions in source but not documented — NO_FIX (table format unknown)
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

    // Functions documented but not in source (stale) — REAL FIX (delete row)
    for (const name of readmeFunctions) {
      if (sourceExports.length > 0 && !sourceExports.includes(name) && !name.endsWith('Schema')) {
        const fix: LintFix = buildDeleteApiRowFix(readme, name);
        results.push({
          file: readmePath,
          line: 1,
          column: 1,
          severity: 'error',
          message: `README documents '${name}' but it no longer exists in source`,
          ruleId: 'package/require-readme',
          tip: `Remove '${name}' from the API reference — it was deleted from source`,
          fix,
        });
      }
    }

    return results;
  },
};

export default rule;
