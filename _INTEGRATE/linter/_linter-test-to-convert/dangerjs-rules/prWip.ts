import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task]: [PR] Marked As Work In Progress? (prWip)',
	run: ({ danger, isCi, warn }): boolean => {
		if (isCi && danger.github.pr.title.includes('[WIP]')) {
			warn('PR is marked as Work in Progress.');
		}

		return true;
	},
} satisfies Rules;
