import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import EmptyScenesTest from './EmptyScenesTest.svelte';

describe('EmptyScenes', () => {
  it('renders empty state container with data-testid', () => {
    const { container } = render(EmptyScenesTest);
    const emptyState: HTMLElement | null = container.querySelector('[data-testid="empty-scenes"]');
    expect(emptyState).toBeInTheDocument();
  });

  it('shows "No scenes yet" text', () => {
    render(EmptyScenesTest);
    expect(screen.getByText('No scenes yet')).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(EmptyScenesTest);
    expect(screen.getByText('Create your first scene to start building.')).toBeInTheDocument();
  });

  it('shows "New Scene" button', () => {
    render(EmptyScenesTest);
    expect(screen.getByText('New Scene')).toBeInTheDocument();
  });
});
