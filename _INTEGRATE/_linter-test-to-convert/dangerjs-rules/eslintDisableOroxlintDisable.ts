import type { Rules } from '../interfaces/rulesInterface';

import { readFileSync } from 'node:fs';

export default {
	description: '[Task] Are Any Rules Disabled? (eslintDisable)',
	run: ({ danger, warn }): boolean => {
		let hasWarnings = false;

		const modifiedFiles = danger.git.modified_files;

		for (const file of modifiedFiles) {
			try {
				const contents = readFileSync(file, 'utf-8').toString();

				if (contents.includes('eslint-disable')) {
					warn(
						`The file "${file}" disables one or more eslint rules. Please review this carefully.`,
					);

					hasWarnings = true;
				}
			} catch {
				// [Note]: Nothing to handle here
			}
		}

		const createdFiles = danger.git.created_files;

		for (const file of createdFiles) {
			try {
				const contents = readFileSync(file, 'utf-8').toString();

				if (contents.includes('eslint-disable')) {
					warn(
						`The file "${file}" disables one or more eslint rules. Please review this carefully.`,
					);

					hasWarnings = true;
				}
			} catch {
				// [Note]: Nothing to handle here
			}
		}

		if (hasWarnings) {
			throw new Error(
				'One or more files disables linting rules, refer to the report at the end.',
			);
		}

		return hasWarnings;
	},
} satisfies Rules;
