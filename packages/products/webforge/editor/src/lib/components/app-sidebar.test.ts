import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AppSidebarTest from './AppSidebarTest.svelte';

describe('AppSidebar', () => {
	it('renders sidebar wrapper', () => {
		const { container } = render(AppSidebarTest);
		const sidebar: HTMLElement | null = container.querySelector('[data-slot="sidebar"]');
		expect(sidebar).toBeInTheDocument();
	});

	it('renders WebForge branding', () => {
		render(AppSidebarTest);
		expect(screen.getAllByText('WebForge').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('RPG Editor')).toBeInTheDocument();
	});

	it('renders scene list with default scenes', () => {
		render(AppSidebarTest);
		expect(screen.getByText('Overworld')).toBeInTheDocument();
		expect(screen.getByText('Town Interior')).toBeInTheDocument();
		expect(screen.getByText('Dungeon B1')).toBeInTheDocument();
	});

	it('renders help link in secondary nav', () => {
		render(AppSidebarTest);
		expect(screen.getByText('Help')).toBeInTheDocument();
	});

	it('renders user section in footer', () => {
		render(AppSidebarTest);
		expect(screen.getByText('Project')).toBeInTheDocument();
	});
});
