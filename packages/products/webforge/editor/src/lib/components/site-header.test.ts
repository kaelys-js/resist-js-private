import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SiteHeaderTest from './SiteHeaderTest.svelte';

describe('SiteHeader', () => {
	it('renders a header element', () => {
		const { container } = render(SiteHeaderTest);
		const header: HTMLElement | null = container.querySelector('header');
		expect(header).toBeInTheDocument();
	});

	it('renders breadcrumb with "Editor" text', () => {
		render(SiteHeaderTest);
		expect(screen.getByText('Editor')).toBeInTheDocument();
	});

	it('renders breadcrumb with "Scene" text when not on error page', () => {
		render(SiteHeaderTest);
		expect(screen.getByText('Scene')).toBeInTheDocument();
	});

	it('renders breadcrumb with "Error" text when isError is true', () => {
		render(SiteHeaderTest, { props: { isError: true } });
		expect(screen.getByText('Error')).toBeInTheDocument();
	});

	it('does not show "Scene" in breadcrumb when isError is true', () => {
		render(SiteHeaderTest, { props: { isError: true } });
		expect(screen.queryByText('Scene')).not.toBeInTheDocument();
	});

	it('renders mode toggle button when modeToggle feature flag is true (default)', () => {
		render(SiteHeaderTest);
		expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
	});

	it('renders sidebar trigger with tooltip trigger attributes', () => {
		const { container } = render(SiteHeaderTest);
		const trigger: HTMLElement | null = container.querySelector('[data-slot="tooltip-trigger"]');
		expect(trigger).toBeInTheDocument();
	});
});
