/**
 * Rule: safety/no-merge-conflicts
 *
 * Detects unresolved Git merge conflict markers in source files.
 *
 * Converted from: check.safety.sh → check::no_merge_conflict_markers
 *
 * Why it matters:
 *   Accidental commits containing conflict markers break builds, cause merge loss,
 *   and confuse teammates. This check ensures the working tree is clean.
 */

import type { Rule, LintResult, RuleContext } from '../../types.js';
import { isBinaryFile } from '../../utils.js';

const CONFLICT_PATTERNS = [
	/^<{7}\s/,   // <<<<<<< HEAD
	/^={7}$/,    // =======
	/^>{7}\s/,   // >>>>>>> branch
];

const rule: Rule = {
	id: 'safety/no-merge-conflicts',
	description: 'Detect unresolved Git merge conflict markers',
	categories: ['safety', 'ci', 'lint'],
	stages: ['check', 'pre-commit', 'ci'],
	scope: { type: 'workspace' },

	async check(context: RuleContext): Promise<LintResult[]> {
		const results: LintResult[] = [];

		for await (const file of context.allFiles()) {
			// Skip binary files
			if (isBinaryFile(file)) continue;

			let content: string;
			try {
				content = await context.readFile(file);
			} catch {
				continue;
			}

			const lines = content.split('\n');

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				for (const pattern of CONFLICT_PATTERNS) {
					if (pattern.test(line)) {
						results.push({
							file,
							line: i + 1,
							column: 1,
							severity: 'error',
							message: 'Unresolved Git merge conflict marker',
							ruleId: rule.id,
							tip: 'Search and resolve all Git conflict markers before committing',
							example: 'Remove `<<<<<<< HEAD` and manually resolve the merge',
						});
						break;
					}
				}
			}
		}

		return results;
	},
};

export default rule;
