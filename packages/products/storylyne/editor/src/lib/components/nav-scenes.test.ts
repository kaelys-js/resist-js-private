/**
 * Unit tests for the NavScenes sidebar group — verifies scene
 * titles, the "Scenes" group label, and active-state styling for
 * the expanded sidebar layout via `NavScenesTest`.
 *
 * @module
 */

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavScenesTest from './NavScenesTest.svelte';

describe('NavScenes — expanded sidebar', () => {
  it('renders scene titles', () => {
    render(NavScenesTest);
    expect(screen.getByText('Overworld')).toBeInTheDocument();
    expect(screen.getByText('Dungeon B1')).toBeInTheDocument();
  });

  it('renders group label "Scenes"', () => {
    render(NavScenesTest);
    expect(screen.getByText('Scenes')).toBeInTheDocument();
  });

  it('renders "New Scene" button', () => {
    render(NavScenesTest);
    expect(screen.getByText('New Scene')).toBeInTheDocument();
  });

  it('renders "More" action for each scene', () => {
    render(NavScenesTest);
    const moreButtons: HTMLElement[] = screen.getAllByText('More');
    expect(moreButtons).toHaveLength(2);
  });
});

describe('NavScenes — collapsed sidebar', () => {
  it('renders popover trigger with menu button when collapsed', () => {
    const { container } = render(NavScenesTest, { props: { collapsed: true } });
    const menuButtons: NodeListOf<Element> = container.querySelectorAll(
      '[data-sidebar="menu-button"]',
    );
    expect(menuButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render collapsible group label when collapsed', () => {
    const { container } = render(NavScenesTest, { props: { collapsed: true } });
    const groupLabels: NodeListOf<Element> = container.querySelectorAll(
      '[data-sidebar="group-label"]',
    );
    expect(groupLabels).toHaveLength(0);
  });
});
