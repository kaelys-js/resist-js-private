import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavUserTest from './NavUserTest.svelte';

describe('NavUser', () => {
	it('renders user name', () => {
		render(NavUserTest);
		expect(screen.getByText('Test User')).toBeInTheDocument();
	});

	it('renders app name', () => {
		render(NavUserTest);
		expect(screen.getByText('WebForge')).toBeInTheDocument();
	});

	it('renders chevron icon', () => {
		const { container } = render(NavUserTest);
		const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll('svg');
		expect(svgs.length).toBeGreaterThanOrEqual(1);
	});
});
