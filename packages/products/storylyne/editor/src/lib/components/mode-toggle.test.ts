/**
 * Unit tests for the ModeToggle button — verifies the accessible
 * name (`Toggle mode`), presence of sun/moon SVG icons for the
 * light/dark indicator, and that the button acts as a
 * dropdown-menu trigger.
 *
 * @module
 */

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ModeToggleTest from './ModeToggleTest.svelte';

describe('ModeToggle', () => {
  it('renders toggle button with accessible name', () => {
    render(ModeToggleTest);
    expect(screen.getByRole('button', { name: /toggle mode/i })).toBeInTheDocument();
  });

  it('renders sun icon for light mode indicator', () => {
    const { container } = render(ModeToggleTest);
    const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders toggle button as dropdown menu trigger', () => {
    const { container } = render(ModeToggleTest);
    const trigger: HTMLElement | null = container.querySelector(
      '[data-slot="dropdown-menu-trigger"]',
    );
    expect(trigger).toBeInTheDocument();
  });
});
