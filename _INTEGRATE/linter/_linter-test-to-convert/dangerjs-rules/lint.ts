import type { DangerRule } from '@/quality/lint/danger/src/schemas';

import type { DefinedString } from '@/shared/utils/util-schema/schemas';

const rule: DangerRule = {
	description: 'Lint.',
	name: 'none',
	run: async (): Promise<void> => {
		const failureMessage: DefinedString = await globalThis.pnpmWorkspaceScript({
			script: 'lint',
		});

		if (failureMessage.length > 0) {
			globalThis.fail(failureMessage);
		}
	},
};

export default rule;
