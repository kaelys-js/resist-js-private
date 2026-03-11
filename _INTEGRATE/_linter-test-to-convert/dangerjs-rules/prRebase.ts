import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task]: [PR] Should Rebase? (prRebase)',
	run: ({ danger, fail }): boolean => {
		if (
			danger.git.commits.some((commitMessage) => {
				return (
					commitMessage.message.includes('Merge branch ') ||
					(commitMessage.parents?.length ?? 0) > 1
				);
			})
		) {
			const message =
				'Please rebase to get rid of the merge commits in this PR. Please follow the guidelines in CONTRIBUTING.md.';

			fail(message);

			throw new Error(message);
		}

		return true;
	},
} satisfies Rules;
