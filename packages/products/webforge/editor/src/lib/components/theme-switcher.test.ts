import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ThemeSwitcherTest from './ThemeSwitcherTest.svelte';

describe('ThemeSwitcher', () => {
	it('renders sub-trigger with "Theme" text', () => {
		render(ThemeSwitcherTest);
		expect(screen.getByText('Theme')).toBeInTheDocument();
	});

	it('renders trigger as a clickable element', () => {
		render(ThemeSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Theme');
		expect(trigger.closest('[role="menuitem"]')).toBeInTheDocument();
	});
});
