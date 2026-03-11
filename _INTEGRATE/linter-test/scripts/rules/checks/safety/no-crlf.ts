/**
 * Rule: safety/no-crlf
 *
 * Blocks Windows-style (CRLF) line endings in source files.
 *
 * Converted from: check.safety.sh → check::no_crlf_line_endings
 *
 * Why it matters:
 *   CRLF line endings break Unix tooling, cause shell scripts to fail,
 *   and pollute diffs in cross-platform teams. All files must use LF.
 */

import type { Rule, LintResult, RuleContext } from '../../types.js';
import { isBinaryFile } from '../../utils.js';

const rule: Rule = {
	id: 'safety/no-crlf',
	description: 'Block Windows-style CRLF line endings',
	categories: ['encoding', 'lint', 'safety'],
	stages: ['lint', 'check', 'pre-commit'],
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

			// Check for CRLF
			if (content.includes('\r\n')) {
				// Find first occurrence for line number
				const lines = content.split('\n');
				let lineNum = 1;

				for (let i = 0; i < lines.length; i++) {
					if (lines[i].endsWith('\r')) {
						lineNum = i + 1;
						break;
					}
				}

				results.push({
					file,
					line: lineNum,
					column: 1,
					severity: 'error',
					message: 'File contains CRLF line endings',
					ruleId: rule.id,
					tip: 'Convert to LF using dos2unix or configure your editor for Unix-style endings',
					example: `dos2unix "${file}"`,
				});
			}
		}

		return results;
	},

	// Auto-fix: Convert CRLF to LF
	async fix(context: RuleContext, result: LintResult): Promise<string | null> {
		try {
			const content = await context.readFile(result.file);
			return content.replace(/\r\n/g, '\n');
		} catch {
			return null;
		}
	},
};

export default rule;
