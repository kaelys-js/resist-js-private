import type { Rules } from '../interfaces/rulesInterface';

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execSync = promisify(exec);

export default {
	description: '[Task] Styling Check (alwaysRunStyleCheck)',
	run: async ({ fail }): Promise<void> => {
		/**
		 * Process results.
		 *
		 * @param {!string} result Stdout + stderr.
		 */
		function handleResult(result: string): void {
			if (result.includes('Code style issues found in')) {
				const rows = result.split('\n');

				for (const row of rows) {
					if (row.includes('[warn]') && !row.includes('Code style issues')) {
						const message = row.split('[warn] ').at(1) ?? '';
						fail(`The styling is incorrect for "${message}".`);
					}
				}
			}
		}

		try {
			const { stderr, stdout } = await execSync('pnpm lint:format');
			const result = `${stderr}${stdout}`;

			handleResult(result);
		} catch (error) {
			const result = (<string>error).toString();

			handleResult(result);

			throw new Error(
				'There were styling errors, refer to the report at the end.',
			);
		}
	},
} satisfies Rules;
