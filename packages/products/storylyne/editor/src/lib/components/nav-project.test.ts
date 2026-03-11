import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavProjectTest from './NavProjectTest.svelte';

describe('NavProject', () => {
  it('renders user name', () => {
    render(NavProjectTest);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders placeholder subtitle', () => {
    render(NavProjectTest);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders chevron icon', () => {
    const { container } = render(NavProjectTest);
    const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT render ModeToggle button', () => {
    render(NavProjectTest);
    // ModeToggle renders a button with aria-label "Toggle mode"
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
  });
});
