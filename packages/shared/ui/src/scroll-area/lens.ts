import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'layout',
	tags: ['shadcn', 'compound'],
	description: 'Custom scrollbar container for overflow content.',
};

const examples: LensExample[] = [
	{
		name: 'vertical',
		title: 'Vertical Scroll',
		description: 'A vertically scrollable area with content overflow.',
	},
	{
		name: 'horizontal',
		title: 'Horizontal Scroll',
		description: 'A horizontally scrollable area for wide content.',
	},
];

export default examples;
