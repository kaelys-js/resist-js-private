/**
 * Unit tests for the DevToolbar Feature-Flags panel — discovers flags
 * from `FeatureFlagsSchema` and asserts that the panel renders the
 * expected testid, heading, and one Switch per flag.
 *
 * @module
 */

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import DevToolbarFeatureFlagsTest from './DevToolbarFeatureFlagsTest.svelte';
import { discoverFeatureFlags } from '@/utils/devtools/dev-toolbar-registry';
import { FeatureFlagsSchema } from '$lib/schemas/editor-state';

const flags = discoverFeatureFlags(
  FeatureFlagsSchema.entries as unknown as Record<string, Record<string, unknown>>,
);

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
    expect(flags.length).toBe(28);
  });
});
