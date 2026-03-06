import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AppSidebarTest from './AppSidebarTest.svelte';
import { APP_NAME, APP_TAGLINE } from '$lib/config/app-meta';

describe('AppSidebar', () => {
	it('renders sidebar wrapper', () => {
		const { container } = render(AppSidebarTest);
		const sidebar: HTMLElement | null = container.querySelector('[data-slot="sidebar"]');
		expect(sidebar).toBeInTheDocument();
	});

	it('renders app branding', () => {
		const { container } = render(AppSidebarTest);
		const html = container.innerHTML;
		expect(html).toContain(APP_NAME);
		expect(html).toContain(APP_TAGLINE);
	});

	it('renders finance nav with default items', () => {
		render(AppSidebarTest);
		expect(screen.getByText('Overview')).toBeInTheDocument();
		expect(screen.getByText('Income')).toBeInTheDocument();
		expect(screen.getByText('Debt')).toBeInTheDocument();
	});

	it('renders help link in secondary nav', () => {
		render(AppSidebarTest);
		expect(screen.getByText('Help')).toBeInTheDocument();
	});

	it('renders user section in footer', () => {
		const { container } = render(AppSidebarTest);
		expect(container.innerHTML).toContain('User');
	});
});
