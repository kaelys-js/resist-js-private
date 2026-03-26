import { readFileSync } from 'node:fs';

import type { DefinedString } from '@/shared/utils/util-schema/schemas';

import type { DangerRule } from '@/quality/lint/danger/src/schemas';
import { findWorkspaceDir } from '@/shared/utils/util-test/patch/findWorkspaceDir';

const TERM_TODO: DefinedString = 'TODO';
const TERM_FIXME: DefinedString = 'FIXME';

const rule: DangerRule = {
	description: 'Are there any `TODO` or `FIXME`?',
	name: 'none',
	run: async (): Promise<void> => {
		const modifiedFiles: DefinedString[] = [
			...globalThis.danger.git.modified_files,
			...globalThis.danger.git.created_files,
		];
		const WORKSPACE_DIR: DefinedString =
			(await findWorkspaceDir(process.cwd())) ?? '';

		for (const file of modifiedFiles) {
			const contents: DefinedString = readFileSync(
				`${WORKSPACE_DIR}/${file.split('/').slice(1).join('/')}`,
				'utf-8',
			).toString(); // TODO(gaia): readFileSync should come from a utility package

			if (
				contents.includes(TERM_TODO) === true ||
				contents.includes(TERM_FIXME) === true
			) {
				globalThis.warn(
					`The file "${file}" contains one or more "${TERM_TODO}" or "${TERM_FIXME}".`,
				);
			}
		}
	},
};

export default rule;
