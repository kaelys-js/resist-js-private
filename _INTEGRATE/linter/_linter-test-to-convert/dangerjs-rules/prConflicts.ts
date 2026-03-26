import type { Rules } from '../interfaces/rulesInterface';

export default {
	description: '[Task]: [PR] Are There Merge Conflicts? (prConflicts)',
	run: (): boolean => {
		/*
		 * TODO(gaia): [Danger Rule]: Check whether PR conflicts with other branches locally.
		 * TODO(gaia): warn("This PR has merge conflicts.")
		 */

		return true;
	},
} satisfies Rules;
