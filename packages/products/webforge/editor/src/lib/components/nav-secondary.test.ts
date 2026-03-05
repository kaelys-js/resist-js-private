import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavSecondaryTest from './NavSecondaryTest.svelte';
import type { Str } from '@/schemas/common';

describe('NavSecondary', () => {
	it('renders menu items', () => {
		render(NavSecondaryTest);
		expect(screen.getByText('Settings')).toBeInTheDocument();
		expect(screen.getByText('Help')).toBeInTheDocument();
	});

	it('renders item links with href', () => {
		const { container } = render(NavSecondaryTest);
		const links: NodeListOf<HTMLAnchorElement> = container.querySelectorAll('a[href]');
		const hrefs: Str[] = [...links].map((a: HTMLAnchorElement) => a.getAttribute('href') ?? '');
		expect(hrefs).toContain('#settings');
		expect(hrefs).toContain('#help');
	});
});
