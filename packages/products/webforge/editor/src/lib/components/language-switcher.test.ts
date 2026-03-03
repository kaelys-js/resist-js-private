import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LanguageSwitcherTest from './LanguageSwitcherTest.svelte';

describe('LanguageSwitcher', () => {
	it('renders sub-trigger with "Language" text', () => {
		render(LanguageSwitcherTest);
		expect(screen.getByText('Language')).toBeInTheDocument();
	});

	it('renders trigger as a clickable element', () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		expect(trigger.closest('[role="menuitem"]')).toBeInTheDocument();
	});
});
