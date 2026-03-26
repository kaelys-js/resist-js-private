import type { DangerParameters } from '../interfaces/dangerParametersInterface';
import type { Rules } from '../interfaces/rulesInterface';

import { readFileSync } from 'node:fs';

/** Lint Message. */
interface LintMessage {
	/** Column #. */
	column: number;

	/** Line #. */
	line: number;

	/** Message. */
	message: string;

	/** Severity. 1 = Warning 2 = Error. */
	severity: number;
}

/** Lint Results. */
interface LintResults {
	/** Error Count. */
	errorCount: number;

	/** Fatal Error Count. */
	fatalErrorCount: number;

	/** The path to the file. */
	filePath: string;

	/** Messages for the result. */
	messages: LintMessage[];

	/** Warning Count. */
	warningCount: number;
}

/**
 * Loads `eslint` report and builds a markdown table with the Warning and Errors from the report.
 *
 * @param {!DangerParameters} parameters Parameters.
 */
export function rulesReport({
	fail,
	markdown,
}: Readonly<DangerParameters>): void {
	try {
		const report = <LintResults[]>(
			JSON.parse(
				readFileSync(
					'./report-duplicate-code/.lint-results.json',
					'utf-8',
				).toString(),
			)
		);
		let warnings = 0;
		let errors = 0;

		for (const entry of report) {
			warnings += entry.warningCount;
			errors += entry.errorCount;
			errors += entry.fatalErrorCount;
		}

		if (warnings > 0 || errors > 0) {
			let markdownString = `
| Type | File | Line | Column | Message |
| ---- | ---- | ---- | ------ | ------- |
            `;

			const filteredReport = report.filter((entry) => {
				return entry.messages.length > 0;
			});

			for (const entry of filteredReport) {
				const { filePath, messages } = entry;

				for (const messageObject of messages) {
					const { column, line, message, severity } = messageObject;

					markdownString += `|${
						severity === 1 ? '⚠️' : '❌'
					}|${filePath}|${line}|${column}|${message}|`;
				}
			}

			markdown(markdownString);

			if (errors > 0) {
				fail(`There are ${errors} linting errors.`);
			}
		}
	} catch {
		// [Note]: Nothing to handle here
	}
}

export default {
	description: '[Task] Preparing Rules Report (rulesReport).',
	run: (parameters): boolean => {
		rulesReport(parameters);

		return true;
	},
} satisfies Rules;
