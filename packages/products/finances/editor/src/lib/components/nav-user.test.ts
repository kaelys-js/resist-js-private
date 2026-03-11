import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavUserTest from './NavUserTest.svelte';

describe('NavUser', () => {
  it('renders user name', () => {
    render(NavUserTest);
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('renders placeholder subtitle', () => {
    render(NavUserTest);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders chevron icon', () => {
    const { container } = render(NavUserTest);
    const svgs: NodeListOf<SVGSVGElement> = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT render ModeToggle button', () => {
    render(NavUserTest);
    // ModeToggle renders a button with aria-label "Toggle mode"
    expect(screen.queryByRole('button', { name: /toggle mode/i })).not.toBeInTheDocument();
  });
});
