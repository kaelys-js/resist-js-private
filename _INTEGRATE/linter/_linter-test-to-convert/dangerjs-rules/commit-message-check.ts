import type { DangerRule } from '@/quality/lint/danger/src/schemas';

import type { LintOutcome } from '@/quality/lint/commit/src';

import JSON5 from 'json5'; // TODO(gaia): Use from utility package instead

const rule: DangerRule = {
	description:
		'Does commit message meet criteria from @commitlint/config-conventional?.',
	name: 'none',
	run: async (): Promise<void> => {
		// [Note]: Problem Explanation Below
		// 1. pnpm --filter= to run a package command doesn't hide pnpms output of what command is running.
		// 2. This specific case of commit has to be called through a sub-process as bundling @commitlint into the rule is insane.
		// 3. Since the command output is indeterminable, we must attempt to parse it from a JSON string
		// 4. This is largely okay as even if the rule fails it'll just bubble up and Danger will catch and report the error stack.
		const results: LintOutcome = JSON5.parse(
			(
				await globalThis.pnpmWorkspaceScript({
					script: 'check',
					packageName: '@enzuzo/lint-commit',
				})
			).result
				.split('\n')
				.map((line) => (!line.startsWith('> ') ? line : null))
				.filter((line) => line && line.length > 0)
				.join('\n'),
		);
		// [End Note]

		if (results.valid === false) {
			for (const error of results.errors) {
				globalThis.fail(
					`The commit message below doesn't meet criteria:\n\n\x1b[1m\x1b[4m${results.input}\x1b[0m\n\nWhy? ${error.message}\nHow To Fix? https://www.npmjs.com/package/@commitlint/config-conventional`,
				); // TODO(gaia): Cleanup message
			}

			for (const warning of results.warnings) {
				globalThis.warn(
					`The commit message below has a warning:\n\x1b[1m\x1b[4m${results.input}\x1b[0m\n\nWhy? ${warning.message}\nHow To Fix? https://www.npmjs.com/package/@commitlint/config-conventional`,
				); // TODO(gaia): Cleanup message
			}
		}
	},
};

export default rule;
