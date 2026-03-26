import type { Rules } from '../interfaces/rulesInterface';

import { statSync } from 'node:fs';
import { cwd } from 'node:process';

const rulesPath = `${cwd()}/packages/shared/config/rules/`;

interface BinaryFiles {
	[type: string]: Date;
}

const binaryFiles: BinaryFiles = {
	// [Note]: hadolint
	dockerfileDarwin: statSync(
		`${rulesPath}/dockerfile/eslint-plugin-dockerfile/bin/dockerfile-linter-darwin`,
	).ctime,
	dockerfileLinux: statSync(
		`${rulesPath}/dockerfile/eslint-plugin-dockerfile/bin/dockerfile-linter-linux`,
	).ctime,

	// [Note]: dotenv-linter
	env: statSync(`${rulesPath}/env/eslint-plugin-env/bin/dotenv-linter`).ctime,

	// [Note]: actionlint
	gitactionsDarwinArm64: statSync(
		`${rulesPath}/gitactions/eslint-plugin-gitactions/bin/actionlint-darwin-arm64`,
	).ctime,
	gitactionsDarwinX64: statSync(
		`${rulesPath}/gitactions/eslint-plugin-gitactions/bin/actionlint-darwin-x64`,
	).ctime,
	gitactionsLinux: statSync(
		`${rulesPath}/gitactions/eslint-plugin-gitactions/bin/actionlint-linux-ia32`,
	).ctime,
	gitactionsLinuxX64: statSync(
		`${rulesPath}/gitactions/eslint-plugin-gitactions/bin/actionlint-linux-x64`,
	).ctime,

	// [Note]: git-secrets
	leakyDarwinArm64: statSync(
		`${rulesPath}/leaky/eslint-plugin-leaky/bin/leaky-linter-darwin-arm64`,
	).ctime,
	leakyLinux: statSync(
		`${rulesPath}/leaky/eslint-plugin-leaky/bin/leaky-linter-linux-ia32`,
	).ctime,
	leakyLinuxArm64: statSync(
		`${rulesPath}/leaky/eslint-plugin-leaky/bin/leaky-linter-linux-arm64`,
	).ctime,
	leakyLinuxX64: statSync(
		`${rulesPath}/leaky/eslint-plugin-leaky/bin/leaky-linter-linux-x64`,
	).ctime,

	// [Note]: sh-linter
	shDarwin: statSync(`${rulesPath}/sh/eslint-plugin-sh/bin/sh-linter-darwin`)
		.ctime,
	shLinux: statSync(`${rulesPath}/sh/eslint-plugin-sh/bin/sh-linter-linux`)
		.ctime,

	// [Note]: tflint
	terraformDarwinArm64: statSync(
		`${rulesPath}/terraform/eslint-plugin-terraform/bin/terraform-linter-darwin-arm64`,
	).ctime,
	terraformLinux: statSync(
		`${rulesPath}/terraform/eslint-plugin-terraform/bin/terraform-linter-linux-ia32`,
	).ctime,
	terraformLinuxArm64: statSync(
		`${rulesPath}/terraform/eslint-plugin-terraform/bin/terraform-linter-linux-arm64`,
	).ctime,
	terraformLinuxX64: statSync(
		`${rulesPath}/terraform/eslint-plugin-terraform/bin/terraform-linter-linux-x64`,
	).ctime,
};

const MAX_DAYS = 60;

const MILLISECONDS_IN_DAY = 86_400_000;

export default {
	description: '[Task] Are Rules Binary Files Outdated? (binOutdated)',
	run: ({ warn }): boolean => {
		const now = new Date();
		let hasWarnings = false;

		for (const [type, fileCreationDate] of Object.entries(binaryFiles)) {
			const schemaUpdateDate = new Date(fileCreationDate);
			const differenceInTime = now.getTime() - schemaUpdateDate.getTime();
			const differenceInDays = differenceInTime / MILLISECONDS_IN_DAY;

			if (differenceInDays >= MAX_DAYS) {
				warn(
					`The binary file for "${type}" hasn't been updated in ${differenceInDays}. You should check for updates to it and then update it if necessary in a PR.`,
				);
				hasWarnings = true;
			}
		}

		if (hasWarnings) {
			throw new Error(
				'One or more files are outdated, refer to the report at the end.',
			);
		}
		return hasWarnings;
	},
} satisfies Rules;
