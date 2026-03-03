import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NavScenesTest from './NavScenesTest.svelte';

describe('NavScenes', () => {
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
