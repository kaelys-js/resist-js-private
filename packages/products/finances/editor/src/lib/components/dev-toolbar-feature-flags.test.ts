import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DevToolbarFeatureFlagsTest from './DevToolbarFeatureFlagsTest.svelte';
import { discoverFeatureFlags } from '$lib/debug/dev-toolbar-registry';

const flags = discoverFeatureFlags();

describe('DevToolbarFeatureFlags', () => {
	it('renders the panel with correct testid', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const panel: HTMLElement | null = container.querySelector('[data-testid="dev-toolbar-flags"]');
		expect(panel).toBeInTheDocument();
	});

	it('renders "Feature Flags" heading', () => {
		render(DevToolbarFeatureFlagsTest);
		expect(screen.getByText('Feature Flags')).toBeInTheDocument();
	});

	it('renders a Switch for each feature flag', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const switches: NodeListOf<HTMLButtonElement> =
			container.querySelectorAll('button[role="switch"]');
		expect(switches.length).toBe(flags.length);
	});

	it('renders an accessible label for each flag', () => {
		render(DevToolbarFeatureFlagsTest);
		for (const flag of flags) {
			const label: HTMLElement | null = document.querySelector(`label[for="flag-${flag.key}"]`);
			expect(label).toBeInTheDocument();
		}
	});

	it('renders search input', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const input: HTMLInputElement | null = container.querySelector(
			'input[placeholder="Search flags\u2026"]',
		);
		expect(input).toBeInTheDocument();
	});

	it('renders "Enable All" button', () => {
		render(DevToolbarFeatureFlagsTest);
		expect(screen.getByText('Enable All')).toBeInTheDocument();
	});

	it('renders "Disable All" button', () => {
		render(DevToolbarFeatureFlagsTest);
		expect(screen.getByText('Disable All')).toBeInTheDocument();
	});

	it('all switches default to checked (all flags enabled by default)', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const switches: NodeListOf<HTMLButtonElement> =
			container.querySelectorAll('button[role="switch"]');
		for (const toggle of switches) {
			expect((toggle as HTMLElement).dataset.state).toBe('checked');
		}
	});

	it('count of flags matches schema entries', () => {
		expect(flags.length).toBe(26);
	});
});
