import type { Rules } from '../interfaces/rulesInterface';

import { readFileSync } from 'node:fs';

/** Package.json Interface Shim */
interface IPackageJson {
	dependencies: string[];
	devDependencies: string[];
}

export default {
	description: '[Task] Are There New Dependencies? (newDependency)',
	run: async ({ danger, warn }): Promise<void> => {
		const modifiedFiles = danger.git.modified_files;

		for (const file of modifiedFiles) {
			try {
				if (file.includes('package.json')) {
					const diff = await danger.git.diffForFile(file);
					const diffLines =
						diff?.diff.split('\n').filter((line) => {
							return (
								line.startsWith('+') &&
								line.includes(': ') &&
								!line.includes('dependencies": ')
							);
						}) ?? [];

					for (const line of diffLines) {
						warn(
							`The file "${file}" adds a new dependency, script or property ("${line}"). Review this carefully.`,
						);
					}
				}
			} catch {
				// [Note]: Nothing to handle here
			}
		}

		const createdFiles = danger.git.created_files;

		for (const file of createdFiles) {
			try {
				if (file.includes('package.json')) {
					const contents = <IPackageJson>(
						JSON.parse(readFileSync(file, 'utf-8').toString())
					);

					if (
						contents.dependencies.length > 0 ||
						contents.devDependencies.length > 0
					) {
						warn(
							`The file "${file}" adds one or more new dependencies. Review this carefully.`,
						);
					}
				}
			} catch {
				// [Note]: Nothing to handle here
			}
		}
	},
} satisfies Rules;
