import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task] Is Documentation Updated? (areDocsUpdated)',
	run: ({ danger, fail }): boolean => {
		const changedFiles = [
			...danger.git.modified_files,
			...danger.git.created_files,
			...danger.git.deleted_files,
		];

		for (const file of changedFiles) {
			const splitFilePath = file.split('/');
			if (
				file.includes('packages/') &&
				['README.md'].includes(splitFilePath.at(-1) ?? '')
			) {
				// TODO(gaia): Find nearest package.json -> Check if README.md updated
			}
		}
	},
} satisfies Rules;
