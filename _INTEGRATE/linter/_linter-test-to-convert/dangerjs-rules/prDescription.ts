import type { Rules } from '../interfaces/rulesInterface';

const MIN_PR_BODY = 10;

export default {
	description: '[Task]: [PR] Has Appropriate Description? (prDescription)',
	run: ({ danger, fail, isCi }): boolean => {
		if (isCi && danger.github.pr.body.length < MIN_PR_BODY) {
			const message =
				'Please provide a summary in the PR description that matches the guidelines in CONTRIBUTING.md.';

			fail(message);

			throw new Error(message);
		}

		return true;
	},
} satisfies Rules;
