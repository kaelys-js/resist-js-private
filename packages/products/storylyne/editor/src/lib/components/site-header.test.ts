/**
 * Unit tests for the SiteHeader — verifies the `<header>` landmark,
 * breadcrumb "Home" entry, sidebar trigger, and the user-menu
 * trigger rendered through `SiteHeaderTest`.
 *
 * @module
 */

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SiteHeaderTest from './SiteHeaderTest.svelte';

describe('SiteHeader', () => {
  it('renders a header element', () => {
    const { container } = render(SiteHeaderTest);
    const header: HTMLElement | null = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders breadcrumb with "Home" text', () => {
    render(SiteHeaderTest);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders breadcrumb with active scene name when provided', () => {
    render(SiteHeaderTest, { props: { activeSceneName: 'My Scene' } });
    expect(screen.getByText('My Scene')).toBeInTheDocument();
  });

  it('renders "Scenes" in breadcrumb when scene is active', () => {
    render(SiteHeaderTest, { props: { activeSceneName: 'My Scene' } });
    expect(screen.getByText('Scenes')).toBeInTheDocument();
  });

  it('renders breadcrumb with "Home" when no active scene', () => {
    render(SiteHeaderTest);
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
  });

  it('does not show "Scenes" when no active scene', () => {
    render(SiteHeaderTest);
    expect(screen.queryByText('Scenes')).not.toBeInTheDocument();
  });

  it('renders breadcrumb with "Error" text when isError is true', () => {
    render(SiteHeaderTest, { props: { isError: true } });
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('does not show active scene in breadcrumb when isError is true', () => {
    render(SiteHeaderTest, { props: { isError: true, activeSceneName: 'My Scene' } });
    expect(screen.queryByText('My Scene')).not.toBeInTheDocument();
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
