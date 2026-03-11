import type { DangerRule } from '@/quality/lint/danger/src/schemas';

const rule: DangerRule = {
	description: 'A description of your rule, shown in the CLI and reports.',
	name: 'none',
	run: async (): Promise<void> => {
		// TODO(gaia): github/gitlab support, base of quality.gitProvider

		globalThis.danger.gitlab.mr;

		if (globalThis.danger.github.pr.assignees.length === 0) {
			globalThis.fail(
				'This PR does not have any assignees yet. Please follow the guidelines in CONTRIBUTING.md.',
			);
		}

		if (
			globalThis.danger.github.requested_reviewers.users.length +
				globalThis.danger.github.reviews.length <
			MIN_REVIEWERS
		) {
			globalThis.warn(
				'This PR must have at least 2 reviewers. Please follow the guidelines in CONTRIBUTING.md.',
			);
		}
	},
};

export default rule;
