/**
 * Unit tests for the DevToolbar App-State panel — discovers app
 * preferences from `AppPreferencesSchema`, mounts the panel via
 * `DevToolbarAppStateTest`, and asserts the expected testid, heading,
 * and that every discovered preference renders a control row.
 *
 * @module
 */

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DevToolbarAppStateTest from './DevToolbarAppStateTest.svelte';
import { discoverAppPreferences } from '@/utils/devtools/dev-toolbar-registry';
import { APP_NAME } from '$lib/config/app-meta';
import { AppPreferencesSchema } from '$lib/schemas/editor-state';

const preferences = discoverAppPreferences(
  AppPreferencesSchema.entries as unknown as Record<string, Record<string, unknown>>,
);

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

  it('renders an accessible label for boolean and string preferences', () => {
    render(DevToolbarAppStateTest);
    const nonPicklistPrefs = preferences.filter((p) => p.type !== 'picklist');

    for (const pref of nonPicklistPrefs) {
      const label: HTMLElement | null = document.querySelector(`label[for="pref-${pref.key}"]`);
      expect(label).toBeInTheDocument();
    }
  });

  it('renders a combobox trigger for each picklist preference', () => {
    const { container } = render(DevToolbarAppStateTest);
    const comboboxes: NodeListOf<HTMLElement> =
      container.querySelectorAll('button[role="combobox"]');
    const picklistPrefs = preferences.filter((p) => p.type === 'picklist');
    expect(comboboxes.length).toBe(picklistPrefs.length);
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
    expect(preferences.length).toBe(10);
  });

  it('renders App section header', () => {
    render(DevToolbarAppStateTest);
    expect(screen.getByText('App')).toBeInTheDocument();
  });

  it('renders User section header', () => {
    render(DevToolbarAppStateTest);
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('renders Scenes section header', () => {
    render(DevToolbarAppStateTest);
    expect(screen.getByText('Scenes')).toBeInTheDocument();
  });

  it('renders Log Out button when not logged out', () => {
    render(DevToolbarAppStateTest);
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });

  it('renders Simulate Empty Scenes switch', () => {
    const { container } = render(DevToolbarAppStateTest);
    const toggle: HTMLElement | null = container.querySelector('#pref-simulate-empty-scenes');
    expect(toggle).toBeInTheDocument();
    expect(toggle?.getAttribute('role')).toBe('switch');
  });

  it('appName input reflects default store value', () => {
    const { container } = render(DevToolbarAppStateTest);
    const input: HTMLInputElement | null = container.querySelector('#pref-appName');
    expect(input?.value).toBe(APP_NAME);
  });

  it('sidebarOpen switch defaults to checked', () => {
    const { container } = render(DevToolbarAppStateTest);
    const toggle: HTMLElement | null = container.querySelector('#pref-sidebarOpen');
    expect(toggle?.dataset.state).toBe('checked');
  });
});
