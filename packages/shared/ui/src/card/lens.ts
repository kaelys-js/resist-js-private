import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'layout',
	tags: ['shadcn', 'compound'],
	description: 'Content card container with header, content, and footer.',
};

const examples: LensExample[] = [
	{ name: 'basic', title: 'Basic Card', description: 'Card with header, content, and footer.' },
	{ name: 'with-action', title: 'With Action', description: 'Card header with an action slot.' },
];

export default examples;
