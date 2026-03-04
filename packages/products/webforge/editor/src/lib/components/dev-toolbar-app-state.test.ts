import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DevToolbarAppStateTest from './DevToolbarAppStateTest.svelte';
import { discoverAppPreferences, humanizeKey } from '$lib/debug/dev-toolbar-registry';

const preferences = discoverAppPreferences();

describe('DevToolbarAppState', () => {
	it('renders the panel with correct testid', () => {
		const { container } = render(DevToolbarAppStateTest);
		const panel: HTMLElement | null = container.querySelector(
			'[data-testid="dev-toolbar-app-state"]',
		);
		expect(panel).toBeInTheDocument();
	});

	it('renders "App Preferences" heading', () => {
		render(DevToolbarAppStateTest);
		expect(screen.getByText('App Preferences')).toBeInTheDocument();
	});

	it('renders an accessible label for each preference', () => {
		render(DevToolbarAppStateTest);
		for (const pref of preferences) {
			const label: HTMLElement | null = document.querySelector(`label[for="pref-${pref.key}"]`);
			expect(label).toBeInTheDocument();
			expect(label?.textContent?.trim()).toBe(humanizeKey(pref.key));
		}
	});

	it('renders a Select trigger for theme picklist', () => {
		const { container } = render(DevToolbarAppStateTest);
		const trigger: HTMLElement | null = container.querySelector('#pref-theme');
		expect(trigger).toBeInTheDocument();
	});

	it('renders a Select trigger for mode picklist', () => {
		const { container } = render(DevToolbarAppStateTest);
		const trigger: HTMLElement | null = container.querySelector('#pref-mode');
		expect(trigger).toBeInTheDocument();
	});

	it('renders a Select trigger for locale picklist', () => {
		const { container } = render(DevToolbarAppStateTest);
		const trigger: HTMLElement | null = container.querySelector('#pref-locale');
		expect(trigger).toBeInTheDocument();
	});

	it('renders a Switch for sidebarOpen boolean', () => {
		const { container } = render(DevToolbarAppStateTest);
		const toggle: HTMLElement | null = container.querySelector('#pref-sidebarOpen');
		expect(toggle).toBeInTheDocument();
		expect(toggle?.getAttribute('role')).toBe('switch');
	});

	it('renders an Input for appName string', () => {
		const { container } = render(DevToolbarAppStateTest);
		const input: HTMLInputElement | null = container.querySelector('#pref-appName');
		expect(input).toBeInTheDocument();
		expect(input?.tagName).toBe('INPUT');
	});

	it('renders "Reset to Defaults" button', () => {
		render(DevToolbarAppStateTest);
		expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
	});

	it('renders correct number of preferences from schema', () => {
		expect(preferences.length).toBe(5);
	});

	it('appName input reflects default store value', () => {
		const { container } = render(DevToolbarAppStateTest);
		const input: HTMLInputElement | null = container.querySelector('#pref-appName');
		expect(input?.value).toBe('WebForge');
	});

	it('sidebarOpen switch defaults to checked', () => {
		const { container } = render(DevToolbarAppStateTest);
		const toggle: HTMLElement | null = container.querySelector('#pref-sidebarOpen');
		expect(toggle?.dataset.state).toBe('checked');
	});
});
