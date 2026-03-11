import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task]: [PR] Has At Least One Label? (prLabel)',
	run: ({ danger, fail, isCi }): boolean => {
		if (isCi && danger.github.issue.labels.length === 0) {
			const message =
				'Please add at least one label to this PR. Please follow the guidelines in CONTRIBUTING.md.';

			fail(message);

			throw new Error(message);
		}

		return true;
	},
} satisfies Rules;
