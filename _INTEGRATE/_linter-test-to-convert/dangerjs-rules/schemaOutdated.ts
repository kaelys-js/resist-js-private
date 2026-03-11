import type { Rules } from '../interfaces/rulesInterface';

import { readdirSync, readFileSync } from 'node:fs';
import { cwd } from 'node:process';

const MILLISECONDS_IN_DAY = 86_400_000;
const WARN_ON_DAYS = 60;
const FAIL_ON_DAYS = 90;

export default {
	description:
		'[Task] Are Any `packages/shared/schema` Out Of Date? (schemaOutdated)',
	// eslint-disable-next-line max-lines-per-function
	run: ({ fail, warn }): boolean => {
		let hasErrors = false;

		const CWD = cwd();
		const now = new Date();
		const schemaFileList = readdirSync(`${CWD}/packages/shared/schemas`);

		for (const file of schemaFileList) {
			try {
				const { $comment } = <{ $comment: string }>(
					JSON.parse(
						readFileSync(
							`${CWD}/packages/shared/schemas/${file}`,
							'utf-8',
						).toString(),
					)
				);

				if ($comment) {
					const schemaUpdateDate = new Date($comment);
					const differenceInTime = now.getTime() - schemaUpdateDate.getTime();
					const differenceInDays = differenceInTime / MILLISECONDS_IN_DAY;

					if (differenceInDays >= WARN_ON_DAYS) {
						warn(
							`The schema for "${file}" hasn't been updated in ${differenceInDays}. You should check for updates to the schema and then update the "$comment" with the current date in a PR.`,
						);

						hasErrors = true;
					} else if (differenceInDays >= FAIL_ON_DAYS) {
						fail(
							`The schema for "${file}" hasn't been updated in ${differenceInDays}. You MUST check for updates to the schema and then update the "$comment" with the current date in a PR.`,
						);

						hasErrors = true;
					} else {
						// [Note]: Nothing to handle here
					}
				} else {
					fail(
						`The schema for "${file}" has no "$version" property defining the last time the schema was updated.`,
					);

					hasErrors = true;
				}
			} catch {
				// [Note]: Nothing to handle here
			}
		}

		if (hasErrors) {
			throw new Error(
				'Checks failed for schemaOutdated, refer to the report at the end.',
			);
		}
		return hasErrors;
	},
} satisfies Rules;
