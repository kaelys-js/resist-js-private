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

	it('renders breadcrumb with "Scene" text', () => {
		render(SiteHeaderTest);
		expect(screen.getByText('Scene')).toBeInTheDocument();
	});

	it('renders mode toggle button', () => {
		render(SiteHeaderTest);
		expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
	});
});
