import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task] Does PR Have JIRA Ticket? (hasJiraIssue)',
	run: ({ danger, fail, isCi }): boolean => {
		if (isCi && !danger.github.pr.body.includes('atlassian.net')) {
			const message =
				'There must be a reference to a JIRA issue. Please follow the guidelines in CONTRIBUTING.md.';

			fail(message);

			throw new Error(message);
		}

		return true;
	},
} satisfies Rules;
