import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task] Has The Structure Been Changed? (structure)',
	run: ({ danger, fail }): boolean => {
		if (
			danger.git.deleted_files.includes('.structure.json') ||
			danger.git.modified_files.includes('.structure.json')
		) {
			fail(
				'Do not modify or delete the ".structure.json" file in the workspace root. Please follow the guidelines in CONTRIBUTING.md.',
				'.structure.json',
			);
		} else {
			// TODO(gaia): Watch all root workspace files (check ~/.structure.json)
		}

		return true;
	},
} satisfies Rules;
