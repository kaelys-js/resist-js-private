import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import HeaderUserTest from './HeaderUserTest.svelte';

describe('HeaderUser', () => {
	it('renders trigger button with data-testid', () => {
		const { container } = render(HeaderUserTest);
		const trigger: HTMLElement | null = container.querySelector(
			'[data-testid="header-user-trigger"]',
		);
		expect(trigger).toBeInTheDocument();
	});

	it('renders trigger with correct aria-label', () => {
		const { container } = render(HeaderUserTest);
		const trigger: HTMLElement | null = container.querySelector(
			'[data-testid="header-user-trigger"]',
		);
		expect(trigger).toHaveAttribute('aria-label', 'User menu');
	});

	it('renders avatar fallback with default monogram "U"', () => {
		const { container } = render(HeaderUserTest);
		const fallback: HTMLElement | null = container.querySelector('[data-slot="avatar-fallback"]');
		expect(fallback).toBeInTheDocument();
		expect(fallback?.textContent?.trim()).toBe('U');
	});

	it('renders avatar root inside trigger', () => {
		const { container } = render(HeaderUserTest);
		const trigger: HTMLElement | null = container.querySelector(
			'[data-testid="header-user-trigger"]',
		);
		const avatar: HTMLElement | null = trigger?.querySelector('[data-slot="avatar"]') ?? null;
		expect(avatar).toBeInTheDocument();
	});
});
