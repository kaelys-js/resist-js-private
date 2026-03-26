/**
 * Rule: package/names-valid
 *
 * Validates package.json names across the workspace.
 *
 * Converted from: check.package-json.sh
 *   - check::package_json_name_presence
 *   - check::duplicate_package_names
 *   - check::workspace_package_names_valid
 *
 * Why it matters:
 *   Invalid or missing package names break workspace linking and publishing,
 *   and can silently fail in CI/CD or local tooling.
 */

import type { Rule, LintResult, RuleContext } from '../../types.js';
import { findLineNumber } from '../../utils.js';

// npm package name pattern: optional @scope/ followed by lowercase name
const VALID_NAME_PATTERN = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

const rule: Rule = {
	id: 'package/names-valid',
	description: 'Validate package.json names across workspace',
	categories: ['package', 'pnpm', 'ci', 'naming'],
	stages: ['lint', 'check', 'build'],
	scope: { type: 'package' },

	async check(context: RuleContext): Promise<LintResult[]> {
		const results: LintResult[] = [];
		const packages = await context.getWorkspacePackages();
		const seenNames = new Map<string, string>(); // name -> path

		for (const pkg of packages) {
			const pkgJson = pkg.packageJson;
			const name = pkgJson.name as string | undefined;
			let content: string;

			try {
				content = await context.readFile(pkg.path);
			} catch {
				content = '';
			}

			// Check: name field exists
			if (!name) {
				results.push({
					file: pkg.path,
					line: 1,
					column: 1,
					severity: 'error',
					message: 'Missing "name" field in package.json',
					ruleId: rule.id,
					tip: 'Each workspace package.json must define a valid "name"',
					example: '{ "name": "@your-org/pkg" }',
				});
				continue;
			}

			// Check: name is a string
			if (typeof name !== 'string') {
				const lineNum = findLineNumber(content, '"name"');
				results.push({
					file: pkg.path,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: `"name" must be a string, got ${typeof name}`,
					ruleId: rule.id,
				});
				continue;
			}

			// Check: name is not empty
			if (name.trim() === '') {
				const lineNum = findLineNumber(content, '"name"');
				results.push({
					file: pkg.path,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: '"name" cannot be empty',
					ruleId: rule.id,
				});
				continue;
			}

			// Check: name follows npm naming convention
			if (!VALID_NAME_PATTERN.test(name)) {
				const lineNum = findLineNumber(content, '"name"');
				const issues: string[] = [];

				if (name !== name.toLowerCase()) {
					issues.push('must be lowercase');
				}
				if (name.startsWith('.') || name.startsWith('_')) {
					issues.push('cannot start with . or _');
				}
				if (/\s/.test(name)) {
					issues.push('cannot contain spaces');
				}
				if (/[~)('!*]/.test(name.replace(/^@[^/]+\//, ''))) {
					issues.push('contains invalid characters');
				}

				results.push({
					file: pkg.path,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: `Invalid package name: "${name}"${issues.length ? ` (${issues.join(', ')})` : ''}`,
					ruleId: rule.id,
					tip: 'Package names must be lowercase, may include @scope/, and use valid npm characters',
					example: '"name": "@resist/my-package"',
				});
				continue;
			}

			// Check: no duplicate names
			const existingPath = seenNames.get(name);
			if (existingPath) {
				const lineNum = findLineNumber(content, '"name"');
				results.push({
					file: pkg.path,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: `Duplicate package name: "${name}"`,
					ruleId: rule.id,
					tip: 'Package names must be unique across the workspace',
					example: `"${name}" also appears in:\n  ↳ ${existingPath}`,
				});
			} else {
				seenNames.set(name, pkg.path);
			}
		}

		return results;
	},
};

export default rule;
