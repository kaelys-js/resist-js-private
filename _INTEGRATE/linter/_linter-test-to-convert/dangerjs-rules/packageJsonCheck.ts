import type { Rules } from '../interfaces/rulesInterface';

import { readFileSync } from 'node:fs';

export default {
	description:
		'[Task] package.json Name/Scope Matches Standards? (packageJsonCheck)',
	run: ({ danger, fail }): boolean => {
		let hasError = false;

		const changedFiles = [
			...danger.git.modified_files,
			...danger.git.created_files,
		].filter((name) => {
			return name.includes('/package.json');
		});

		// eslint-disable-next-line try-catch-failsafe/json-parse
		const workspacePackage = <{ name: string }>(
			JSON.parse(readFileSync('package.json', 'utf-8').toString())
		);
		const workspacePackageScopeName = `${workspacePackage.name}/`;

		for (const file of changedFiles) {
			// eslint-disable-next-line try-catch-failsafe/json-parse
			const { name } = <{ name: string }>(
				JSON.parse(readFileSync(file, 'utf-8').toString())
			);

			// TODO
			if (!name.startsWith('@enzuzo')) {
				fail(
					`The name property in "${file}" should start with "${workspacePackageScopeName}".`,
				);

				hasError = true;
			}
			if (
				name.replace(workspacePackageScopeName, '').includes('/') ||
				name.toLowerCase() !== name
			) {
				fail(
					`The name property in "${file}" should only contain lowercase a-z and "-" dash characters.`,
				);

				hasError = true;
			}
		}

		if (hasError) {
			throw new Error(
				'Checks failed for packageJsonCheck, refer to the report at the end.',
			);
		}
		return hasError;
	},
} satisfies Rules;
