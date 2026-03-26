import type { DangerParameters } from '../interfaces/dangerParametersInterface';
import type { Rules } from '../interfaces/rulesInterface';

import { exec, type ExecOptions } from 'node:child_process';

/* JSON from `pnpm outdated --json`. */
interface IOutdated {
	current: string;
	dependencyName: string;
	latest: string;
	wanted: string;
}

/**
 * Formats the collection of outdated dependencies into a Markdown table.
 *
 * @param {!object} outdatedDependencies List of outdated dependencies.
 * @param {!string[]} dependencyNames List of dependency names.
 * @returns {string} Markdown table.
 */
function formatOutdatedDependencies(
	outdatedDependencies = {},
	dependencyNames: string[] = [],
): string {
	const headers = [
		'| Dependency | Current | Wanted | Latest |',
		'|---------|---------|--------|--------|',
	];
	const content = dependencyNames.map((dependencyName) => {
		const { current, latest, wanted } = <IOutdated>(
			outdatedDependencies[dependencyName]
		);

		return `| ${dependencyName} | ${current} | ${wanted} | ${latest} |`;
	});

	return [...headers, content].join('\n');
}

/**
 * Promisify `outdatedCommand` and execute with `exec`.
 *
 * @param {!string} outdatedCommand The command.
 * @param {!Function} done Callback function.
 */
function execP(outdatedCommand: string, done: Function): void {
	const MAX_BUFFER = 10_485_760;
	const execOptions: ExecOptions = { maxBuffer: MAX_BUFFER };

	// eslint-disable-next-line security/detect-child-process
	exec(outdatedCommand, execOptions, (error, stdout) => {
		if (stdout) {
			// eslint-disable-next-line try-catch-failsafe/json-parse
			done(<object>JSON.parse(stdout));
		} else if (error === null) {
			// [Note]: Nothing to handle here
		} else {
			throw error;
		}
	});
}

/**
 * Executes `pnpm outdated --json` to find outdated dependencies in the workspace and processes the results into
 * markdown for Danger.
 *
 * @param {!DangerParameters} parameters Parameters.
 * @param {!Function} done Callback function.
 */
function outdatedDependency(
	{ fail, markdown, warn }: DangerParameters,
	done: Function,
): void {
	try {
		execP('pnpm outdated --json', (outdatedDependencies: object) => {
			const dependencyNames = Object.keys(outdatedDependencies);

			if (dependencyNames.length > 0) {
				const dependenciesTable = formatOutdatedDependencies(
					outdatedDependencies,
					dependencyNames,
				);

				warn(`You have ${dependencyNames.length} outdated dependencies.`);
				markdown(`
<details>
    <summary>Outdated Dependencies</summary>
${dependenciesTable}
</details>
    `);
				done();
			}
		});
	} catch (error) {
		const { message } = <{ message: string }>error;

		fail(`Danger Rule Error for outdatedDependency: ${message}`);
	}
}

export default {
	description: '[Task] Has Outdated Dependencies? (outdatedDependencies)',
	run: (parameters): boolean => {
		parameters.schedule((done) => {
			outdatedDependency(parameters, done);
		});

		return true;
	},
} satisfies Rules;
