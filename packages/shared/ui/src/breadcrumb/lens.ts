import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'navigation',
	tags: ['shadcn', 'compound'],
	description: 'Breadcrumb trail navigation with separator icons.',
};

const examples: LensExample[] = [
	{
		name: 'simple',
		title: 'Simple Path',
		description: 'Basic breadcrumb trail with links and current page.',
	},
	{
		name: 'ellipsis',
		title: 'With Ellipsis',
		description: 'Long paths collapsed with an ellipsis.',
	},
];

export default examples;
