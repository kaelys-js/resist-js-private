import { cleanup, render, screen, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSwitcherTest from './LanguageSwitcherTest.svelte';

describe('LanguageSwitcher', () => {
	// bits-ui's BodyScrollLock schedules a 24ms setTimeout on destroy.
	// testing-library's auto-cleanup runs AFTER afterEach (via beforeEach return),
	// so the timer is scheduled after fake timers are already restored.
	// Fix: explicit cleanup() first → schedules timer → runAllTimers flushes it.
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		cleanup();
		vi.runAllTimers();
		vi.useRealTimers();
	});

	it('renders sub-trigger with "Language" text', () => {
		render(LanguageSwitcherTest);
		expect(screen.getByText('Language')).toBeInTheDocument();
	});

	it('renders trigger as a clickable element', () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		expect(trigger.closest('[role="menuitem"]')).toBeInTheDocument();
	});

	it('renders endonym for each language when sub-menu opens', async () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		await fireEvent.click(trigger);
		expect(screen.getByText('日本語', { exact: false })).toBeInTheDocument();
	});

	it('renders exonym in parentheses when different from endonym', async () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		await fireEvent.click(trigger);
		expect(screen.getByText(/\(Japanese\)/)).toBeInTheDocument();
	});

	it('renders lang attribute on language name elements', async () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		await fireEvent.click(trigger);
		// Sub-menu content portals to document body, so query globally
		const langElements: NodeListOf<HTMLElement> = document.querySelectorAll('[lang="ja"]');
		expect(langElements.length).toBeGreaterThan(0);
	});

	it('does not render exonym for English when viewed from English', async () => {
		render(LanguageSwitcherTest);
		const trigger: HTMLElement = screen.getByText('Language');
		await fireEvent.click(trigger);
		// English viewed from English: endonym === exonym, so no parenthetical
		expect(screen.queryByText('(English)')).not.toBeInTheDocument();
	});
});
