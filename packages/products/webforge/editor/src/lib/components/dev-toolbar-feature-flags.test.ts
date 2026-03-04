import { render, screen } from '@testing-library/svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import DevToolbarFeatureFlagsTest from './DevToolbarFeatureFlagsTest.svelte';
import { discoverFeatureFlags } from '$lib/debug/dev-toolbar-registry';

beforeAll(() => {
	// ScrollArea internals need ResizeObserver, which JSDOM lacks.
	globalThis.ResizeObserver ??= class {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	} as unknown as typeof ResizeObserver;
});

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

	it('renders search/filter input', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const input: HTMLInputElement | null = container.querySelector(
			'input[placeholder="Filter flags..."]',
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

	it('renders badge showing enabled/total count', () => {
		const { container } = render(DevToolbarFeatureFlagsTest);
		const badge: HTMLElement | null = container.querySelector('[data-testid="flags-badge"]');
		expect(badge).toBeInTheDocument();
		// All flags default to true, so badge should show all enabled
		expect(badge?.textContent).toBe(`${flags.length}/${flags.length}`);
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
		expect(flags.length).toBe(16);
	});
});
