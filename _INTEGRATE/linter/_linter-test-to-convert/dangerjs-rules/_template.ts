import type { DangerRule } from '@/quality/lint/danger/src/schemas';

const rule: DangerRule = {
	description: 'A description of your rule, shown in the CLI and reports.',
	name: 'none',
	run: async (): Promise<void> => {
		// [Note]: Available methods
		// @see https://danger.systems/js/reference
		globalThis.danger;
		globalThis.fail('');
		globalThis.markdown('');
		globalThis.message('');
		globalThis.warn('');
	},
};

export default rule;
