import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'form',
	tags: ['shadcn', 'compound'],
	description: 'Dropdown selection with grouped options.',
};

const examples: LensExample[] = [
	{
		name: 'basic',
		title: 'Basic Select',
		description: 'Simple select with a flat list of options.',
	},
	{
		name: 'grouped',
		title: 'With Groups',
		description: 'Options organized into groups with headings.',
	},
];

export default examples;
