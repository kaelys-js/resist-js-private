import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ModeToggleTest from './ModeToggleTest.svelte';

describe('ModeToggle', () => {
	it('renders toggle button with accessible name', () => {
		render(ModeToggleTest);
		expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
	});

	it('renders sun icon for light mode indicator', () => {
		const { container } = render(ModeToggleTest);
		const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll('svg');
		expect(svgs.length).toBeGreaterThanOrEqual(2);
	});
});
