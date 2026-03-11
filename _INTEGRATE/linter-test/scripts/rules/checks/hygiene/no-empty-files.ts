/**
 * Rule: hygiene/no-empty-files
 *
 * Detects empty files that should not exist in the repository.
 *
 * Why it matters:
 *   Empty files are often leftovers from refactoring or accidental creations.
 *   They clutter the codebase and can confuse developers.
 *
 * Exceptions:
 *   - .gitkeep files (intentional placeholders)
 *   - .keep files (intentional placeholders)
 *   - __init__.py files (Python package markers)
 *   - .npmignore (can be empty to override .gitignore)
 */

import type { Rule, LintResult, RuleContext } from '../../types.js';
import { isBinaryFile } from '../../utils.js';
import { basename } from 'node:path';

// Files that are allowed to be empty
const ALLOWED_EMPTY_FILES = new Set([
	'.gitkeep',
	'.keep',
	'__init__.py',
	'.npmignore',
	'.hushlogin',
	'.nojekyll',
	'.placeholder',
]);

// Extensions that are allowed to be empty
const ALLOWED_EMPTY_EXTENSIONS = new Set([
	'.gitkeep',
	'.keep',
]);

const rule: Rule = {
	id: 'hygiene/no-empty-files',
	description: 'Detect empty files that should not exist',
	categories: ['hygiene', 'cleanup', 'lint'],
	stages: ['lint', 'check', 'pre-commit'],
	scope: { type: 'workspace' },

	async check(context: RuleContext): Promise<LintResult[]> {
		const results: LintResult[] = [];

		for await (const file of context.allFiles()) {
			// Skip binary files
			if (isBinaryFile(file)) continue;

			const filename = basename(file).toLowerCase();

			// Check if this file is allowed to be empty
			if (ALLOWED_EMPTY_FILES.has(filename)) continue;

			// Check for allowed extensions
			const hasAllowedExt = Array.from(ALLOWED_EMPTY_EXTENSIONS).some((ext) =>
				filename.endsWith(ext)
			);
			if (hasAllowedExt) continue;

			let content: string;
			try {
				content = await context.readFile(file);
			} catch {
				continue;
			}

			// Check if file is empty or contains only whitespace
			const trimmed = content.trim();

			if (trimmed === '') {
				results.push({
					file,
					line: 1,
					column: 1,
					severity: 'warning',
					message: 'Empty file detected',
					ruleId: rule.id,
					tip: 'Delete this file if it\'s no longer needed, or add content if it should exist',
					example: 'git rm path/to/empty-file.ts',
				});
			}
		}

		return results;
	},
};

export default rule;
