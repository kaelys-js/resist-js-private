import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavMainTest from './NavMainTest.svelte';

describe('NavMain', () => {
	it('renders group label', () => {
		render(NavMainTest);
		expect(screen.getByText('Assets')).toBeInTheDocument();
	});

	it('renders menu items', () => {
		render(NavMainTest);
		expect(screen.getByText('Tilesets')).toBeInTheDocument();
		expect(screen.getByText('Sprites')).toBeInTheDocument();
	});

	it('renders item links with href', () => {
		const { container } = render(NavMainTest);
		const links: NodeListOf<HTMLAnchorElement> = container.querySelectorAll('a[href]');
		const hrefs: string[] = [...links].map((a: HTMLAnchorElement) => a.getAttribute('href') ?? '');
		expect(hrefs).toContain('#tilesets');
		expect(hrefs).toContain('#sprites');
	});
});
