import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import DevToolbarTest from './DevToolbarTest.svelte';

beforeAll(() => {
	// ScrollArea + Tooltip internals need ResizeObserver, which JSDOM lacks.
	globalThis.ResizeObserver ??= class {
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {}
	} as unknown as typeof ResizeObserver;
});

/**
 * Helper to expand the toolbar and return the container + trigger.
 *
 * @param container - The render container
 * @returns The trigger element
 */
async function expandToolbar(container: HTMLElement): Promise<HTMLElement> {
	const trigger: HTMLElement = container.querySelector('[data-testid="dev-toolbar-trigger"]')!;
	await fireEvent.click(trigger);
	await tick();
	return trigger;
}

describe('DevToolbar', () => {
	it('is hidden when debug is not enabled', () => {
		const { container } = render(DevToolbarTest);
		const toolbar: HTMLElement | null = container.querySelector('[data-testid="dev-toolbar"]');
		expect(toolbar).not.toBeInTheDocument();
	});

	it('renders trigger pill with "DEV" text when debug enabled', () => {
		render(DevToolbarTest, { props: { debugEnabled: true } });
		expect(screen.getByText('DEV')).toBeInTheDocument();
	});

	it('renders trigger pill with correct testid', () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		const trigger: HTMLElement | null = container.querySelector(
			'[data-testid="dev-toolbar-trigger"]',
		);
		expect(trigger).toBeInTheDocument();
	});

	it('trigger pill has aria-expanded="false" initially', () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		const trigger: HTMLElement | null = container.querySelector(
			'[data-testid="dev-toolbar-trigger"]',
		);
		expect(trigger?.getAttribute('aria-expanded')).toBe('false');
	});

	it('clicking trigger expands toolbar bar', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);
		const bar: HTMLElement | null = container.querySelector('[data-testid="dev-toolbar-bar"]');
		expect(bar).toBeInTheDocument();
	});

	it('toolbar bar has role="toolbar" and aria-label', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);
		const bar: HTMLElement | null = container.querySelector('[role="toolbar"]');
		expect(bar).toBeInTheDocument();
		expect(bar?.getAttribute('aria-label')).toBe('Developer toolbar');
	});

	it('three panel buttons visible when expanded', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);
		expect(container.querySelector('[data-testid="toolbar-btn-flags"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="toolbar-btn-app"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="toolbar-btn-debug"]')).toBeInTheDocument();
	});

	it('quick action buttons visible when expanded', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);
		expect(container.querySelector('[data-testid="toolbar-btn-mode"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="toolbar-btn-copy"]')).toBeInTheDocument();
		expect(container.querySelector('[data-testid="toolbar-btn-reset"]')).toBeInTheDocument();
	});

	it('clicking a panel button opens its panel', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);

		const flagsBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-flags"]')!;
		await fireEvent.click(flagsBtn);
		await tick();

		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).toBeInTheDocument();
		});
	});

	it('clicking same button again closes panel', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);

		const flagsBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-flags"]')!;
		await fireEvent.click(flagsBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).toBeInTheDocument();
		});

		await fireEvent.click(flagsBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).not.toBeInTheDocument();
		});
	});

	it('only one panel open at a time', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);

		// Open flags panel
		const flagsBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-flags"]')!;
		await fireEvent.click(flagsBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).toBeInTheDocument();
		});

		// Click app state button — flags panel should close
		const appBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-app"]')!;
		await fireEvent.click(appBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).not.toBeInTheDocument();
			expect(container.querySelector('[data-testid="dev-toolbar-app-state"]')).toBeInTheDocument();
		});
	});

	it('Escape closes active panel', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		await expandToolbar(container);

		const flagsBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-flags"]')!;
		await fireEvent.click(flagsBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).toBeInTheDocument();
		});

		await fireEvent.keyDown(window, { key: 'Escape' });
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).not.toBeInTheDocument();
		});
	});

	it('collapsing toolbar closes active panel', async () => {
		const { container } = render(DevToolbarTest, { props: { debugEnabled: true } });
		const trigger = await expandToolbar(container);

		// Open a panel
		const flagsBtn: HTMLElement = container.querySelector('[data-testid="toolbar-btn-flags"]')!;
		await fireEvent.click(flagsBtn);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).toBeInTheDocument();
		});

		// Collapse toolbar
		await fireEvent.click(trigger);
		await tick();
		await waitFor(() => {
			expect(container.querySelector('[data-testid="dev-toolbar-flags"]')).not.toBeInTheDocument();
			expect(container.querySelector('[data-testid="dev-toolbar-bar"]')).not.toBeInTheDocument();
		});
	});
});
