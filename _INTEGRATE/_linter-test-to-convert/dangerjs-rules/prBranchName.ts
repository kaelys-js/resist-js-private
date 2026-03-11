import type { Rules } from '../interfaces/rulesInterface';

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

/**
 * Returns the name of the checked out git branch.
 *
 * @param {!string} path Working path.
 * @returns {!string} Branch name.
 */
function getCurrentBranchName(path = cwd()): string {
	const gitHeadPath = `${path}/.git/HEAD`;

	if (existsSync(path)) {
		if (existsSync(gitHeadPath)) {
			const idx = 2;

			return readFileSync(gitHeadPath, 'utf-8').trim().split('/').at(idx) ?? '';
		}
		return getCurrentBranchName(resolve(path, '..'));
	}
	return '';
}

export default {
	description: '[Task]: [PR] Is Branch Name Appropriate? (prBranchName)',
	run: ({ danger, fail }): boolean => {
		let hasErrors = false;

		const realBranchName = getCurrentBranchName();
		const branchName = realBranchName.split('-').at(0);

		if (realBranchName !== 'master' && realBranchName !== 'main') {
			for (const { message } of danger.git.commits) {
				if (!message.includes(`${branchName ?? ''}: `)) {
					fail(
						'The name of this branch does not match guidelines. Please follow the guidelines in CONTRIBUTING.md.',
					);
					hasErrors = true;
					break;
				}
			}
		}

		if (hasErrors) {
			throw new Error(
				'PR branch name is incorrect, refer to the report at the end.',
			);
		}
		return hasErrors;
	},
} satisfies Rules;
