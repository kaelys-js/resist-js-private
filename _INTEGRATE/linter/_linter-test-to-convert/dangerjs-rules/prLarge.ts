import type { Rules } from '../interfaces/rulesInterface';

const MAX_ADDITION_DELETION = 500;

export default {
	description: '[Task]: [PR] Too Large? (prLarge)',
	run: ({ danger, fail, isCi }): boolean => {
		if (
			isCi &&
			(danger.github.pr.additions > MAX_ADDITION_DELETION ||
				danger.github.pr.deletions > MAX_ADDITION_DELETION)
		) {
			const message =
				'This PR is too large. Please follow the guidelines in CONTRIBUTING.md.';
			fail(message);

			throw new Error('message');
		}

		return true;
	},
} satisfies Rules;
