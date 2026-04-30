/**
 * External Tool: license-checker
 *
 * Checks dependency licenses for problematic or incompatible licenses
 * using license-checker. Outputs JSON format, which is transformed into LintResult[].
 * This is a workspace-level tool (not per-file).
 *
 * @module
 */

import { type ExternalTool, isCommandAvailable } from '@/lint/framework/tool-orchestrator.ts';
import { createResult, type LintResult } from '@/lint/framework/types.ts';
import { format, type LintStrings } from '@/lint/locale/schema.ts';

/**
 * License information for a single package from license-checker JSON output.
 *
 * @example
 * ```typescript
 * const info: LicenseInfo = {
 *   licenses: 'MIT',
 *   repository: 'https://github.com/example/pkg',
 * };
 * ```
 */
type LicenseInfo = {
  /** License identifier or SPDX expression. */
  licenses: string;
  /** Repository URL for the package. */
  repository?: string;
};

/**
 * Problematic license identifiers that may cause legal issues.
 *
 * Includes copyleft and restrictive licenses that are generally
 * incompatible with proprietary or permissively-licensed projects.
 */
const PROBLEMATIC_LICENSES: readonly string[] = [
  'GPL',
  'AGPL',
  'LGPL',
  'SSPL',
  'BSL',
  'BUSL',
  'UNKNOWN',
];

/**
 * Check if a license string contains a problematic license.
 *
 * @param {string} license - License string to check
 * @returns {boolean} Whether the license is problematic
 */
function isProblematicLicense(license: string): boolean {
  const upper: string = license.toUpperCase();

  return PROBLEMATIC_LICENSES.some((prob: string): boolean => upper.includes(prob));
}

/**
 * Transform license-checker JSON output into LintResult[].
 *
 * license-checker JSON output is an object keyed by `package@version`,
 * where each value has `{ licenses, repository, ... }`.
 *
 * Only packages with problematic licenses are reported.
 *
 * @param {string} output - Raw JSON output from license-checker
 * @param {LintStrings} strings - Locale strings
 * @returns {LintResult[]} Transformed lint results
 *
 * @example
 * ```typescript
 * const json = '{"some-pkg@1.0.0":{"licenses":"GPL-3.0","repository":"https://github.com/example/pkg"}}';
 * const results = transformLicenseCheckerOutput(json);
 * // results[0].ruleId === 'license-checker/problematic-license'
 * ```
 */
export function transformLicenseCheckerOutput(output: string, strings: LintStrings): LintResult[] {
  const trimmed: string = output.trim();

  if (trimmed.length === 0) {
    return [];
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return [];
  }

  const results: LintResult[] = [];

  for (const [pkgName, pkgData] of Object.entries(parsed)) {
    const info: LicenseInfo = pkgData as LicenseInfo;
    const license: string = info.licenses ?? 'UNKNOWN';

    if (!isProblematicLicense(license)) {
      continue;
    }

    results.push(
      createResult(
        'license-checker/problematic-license',
        'package.json',
        1,
        1,
        'warning',
        format(strings.tools.licenseCheckerMessage, { license, package: pkgName }),
        {
          tip: format(strings.tools.licenseCheckerTip, { package: pkgName }),
        },
      ),
    );
  }

  return results;
}

/** license-checker external tool definition. */
export const licenseCheckerTool: ExternalTool = {
  args: ['--json'],
  command: 'license-checker',
  filePatterns: [],
  isAvailable(): boolean {
    return isCommandAvailable('license-checker');
  },
  name: 'license-checker',
  outputFormat: 'json',
  transform: transformLicenseCheckerOutput,
};
