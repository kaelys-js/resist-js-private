import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'form',
	tags: ['input-group', 'addon', 'prefix', 'suffix', 'input'],
	description: 'Groups inputs with addons, buttons, or text for compound form controls.',
};

const examples: LensExample[] = [
	{
		name: 'basic',
		title: 'Basic Input Group',
		description: 'Input groups with a URL prefix addon and a search button suffix.',
	},
];

export default examples;
