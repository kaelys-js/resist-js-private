import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'display',
	tags: ['animated'],
	description: 'Page-level fade-in entrance animation.',
};

const examples: LensExample[] = [
	{
		name: 'basic',
		title: 'Basic Fade In',
		description: 'A card that fades in on mount.',
	},
];

export default examples;
