import type { DefinedString } from '@/shared/utils/util-schema/schemas';

import type { DangerRule } from '@/quality/lint/danger/src/schemas';

const JS_EXTENSION: DefinedString = '.js';

const MESSAGE: DefinedString =
	'There are one or more Javascript files. Please review this carefully.';

const rule: DangerRule = {
	description: 'Are there are javascript files?',
	name: 'none',
	run: async (): Promise<void> => {
		const modifiedFiles: DefinedString[] = [
			...globalThis.danger.git.modified_files,
			...globalThis.danger.git.created_files,
		];

		if (modifiedFiles.includes(JS_EXTENSION) === true) {
			globalThis.warn(MESSAGE);
		}
	},
};

export default rule;
