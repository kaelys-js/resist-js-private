import type { LensExample, LensMeta } from '../lens/types.js';

export const meta: LensMeta = {
	category: 'form',
	tags: ['shadcn'],
	description: 'Form field label.',
};

const examples: LensExample[] = [
	{
		name: 'basic',
		title: 'Basic Label',
		description: 'Simple labels with default and destructive styling.',
	},
	{
		name: 'with-input',
		title: 'Label with Input',
		description: 'A label paired with an input field using the for attribute.',
	},
];

export default examples;
