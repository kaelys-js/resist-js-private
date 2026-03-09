import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'navigation',
	tags: ['menubar', 'menu', 'toolbar'],
	description: 'Horizontal menu bar with dropdown menus for application commands.',
};

const examples: LensExample[] = [
	{
		name: 'basic',
		title: 'Basic Menubar',
		description: 'A menubar with File, Edit, and View menus including checkbox items.',
	},
];

export default examples;
