import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'overlay',
	tags: ['shadcn', 'compound'],
	description: 'Contextual dropdown menu with items and sub-menus.',
};

const examples: LensExample[] = [
	{ name: 'basic', title: 'Basic Menu', description: 'Items with shortcuts and separators.' },
	{
		name: 'with-icons',
		title: 'With Icons',
		description: 'Menu items with Lucide icons and a destructive variant.',
	},
	{
		name: 'checkbox',
		title: 'Checkbox Items',
		description: 'Toggle-able checkbox items inside a dropdown.',
	},
];

export default examples;
