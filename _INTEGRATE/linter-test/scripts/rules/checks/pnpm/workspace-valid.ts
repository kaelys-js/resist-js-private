/**
 * Rule: pnpm/workspace-valid
 *
 * Validates pnpm-workspace.yaml structure and contents.
 *
 * Converted from: check.pnpm-workspace.sh
 *   - check::pnpm_workspace_file_present
 *   - check::pnpm_workspace_structure
 *   - check::pnpm_workspace_globs_resolve
 *
 * Why it matters:
 *   A missing or malformed pnpm-workspace.yaml disables workspace behavior,
 *   breaks dependency linking, and disables tooling across packages.
 */

import type { Rule, LintResult, RuleContext } from '../../types.js';
import { readYamlFile, expandGlob, findLineNumber } from '../../utils.js';
import { join } from 'path';

interface PnpmWorkspace {
	packages?: string[];
}

const rule: Rule = {
	id: 'pnpm/workspace-valid',
	description: 'Validate pnpm-workspace.yaml structure',
	categories: ['pnpm', 'package', 'ci'],
	stages: ['lint', 'check', 'build'],
	scope: { type: 'workspace' },

	async check(context: RuleContext): Promise<LintResult[]> {
		const results: LintResult[] = [];
		const workspaceFile = join(context.rootDir, 'pnpm-workspace.yaml');

		// Check: File exists
		const exists = await context.fileExists(workspaceFile);
		if (!exists) {
			results.push({
				file: workspaceFile,
				line: 1,
				column: 1,
				severity: 'error',
				message: 'Missing pnpm-workspace.yaml',
				ruleId: rule.id,
				tip: 'Create it using `pnpm init` or add it manually',
				example: 'packages:\n  - "packages/*"\n  - "apps/*"',
			});
			return results;
		}

		// Read and parse
		const content = await context.readFile(workspaceFile);
		const workspace = await readYamlFile<PnpmWorkspace>(workspaceFile);

		if (!workspace) {
			results.push({
				file: workspaceFile,
				line: 1,
				column: 1,
				severity: 'error',
				message: 'Invalid YAML in pnpm-workspace.yaml',
				ruleId: rule.id,
				tip: 'Check for syntax errors in your YAML',
			});
			return results;
		}

		// Check: packages field exists
		if (!workspace.packages) {
			results.push({
				file: workspaceFile,
				line: 1,
				column: 1,
				severity: 'error',
				message: 'Missing "packages" field in pnpm-workspace.yaml',
				ruleId: rule.id,
				tip: 'Add a packages array with workspace globs',
				example: 'packages:\n  - "packages/*"',
			});
			return results;
		}

		// Check: packages is an array
		if (!Array.isArray(workspace.packages)) {
			const lineNum = findLineNumber(content, 'packages');
			results.push({
				file: workspaceFile,
				line: lineNum,
				column: 1,
				severity: 'error',
				message: '"packages" must be an array',
				ruleId: rule.id,
				tip: 'Use YAML list format with dashes',
				example: 'packages:\n  - "packages/*"\n  - "apps/*"',
			});
			return results;
		}

		// Check: packages array is not empty
		if (workspace.packages.length === 0) {
			const lineNum = findLineNumber(content, 'packages');
			results.push({
				file: workspaceFile,
				line: lineNum,
				column: 1,
				severity: 'error',
				message: '"packages" array is empty - no workspace globs defined',
				ruleId: rule.id,
				tip: 'Add at least one valid glob entry',
				example: 'packages:\n  - "packages/*"',
			});
			return results;
		}

		// Check: Each glob resolves to at least one package
		for (const glob of workspace.packages) {
			if (typeof glob !== 'string') {
				results.push({
					file: workspaceFile,
					line: findLineNumber(content, String(glob)),
					column: 1,
					severity: 'error',
					message: `Invalid glob entry: ${JSON.stringify(glob)} - must be a string`,
					ruleId: rule.id,
				});
				continue;
			}

			const matches = await expandGlob(context.rootDir, glob);

			if (matches.length === 0) {
				const lineNum = findLineNumber(content, glob);
				results.push({
					file: workspaceFile,
					line: lineNum,
					column: 1,
					severity: 'warning',
					message: `Glob "${glob}" matches no packages`,
					ruleId: rule.id,
					tip: 'This glob pattern does not match any directories with package.json files',
				});
			}
		}

		return results;
	},
};

export default rule;
