import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import WebForgeLogo from './WebForgeLogo.svelte';

/**
 * Queries the rendered SVG element from the container.
 *
 * @param container - DOM container from render()
 * @returns The SVG element
 */
function querySvg(container: HTMLElement): SVGSVGElement {
	const svg: SVGSVGElement | null = container.querySelector('svg');
	if (!svg) throw new Error('SVG not found');
	return svg;
}

describe('WebForgeLogo', () => {
	it('renders an SVG element', () => {
		const { container } = render(WebForgeLogo);
		const svg: SVGSVGElement = querySvg(container);
		expect(svg.tagName.toLowerCase()).toBe('svg');
	});

	it('defaults to size 24', () => {
		const { container } = render(WebForgeLogo);
		const svg: SVGSVGElement = querySvg(container);
		expect(svg.getAttribute('width')).toBe('24');
		expect(svg.getAttribute('height')).toBe('24');
	});

	it('respects custom size prop', () => {
		const { container } = render(WebForgeLogo, { props: { size: 48 } });
		const svg: SVGSVGElement = querySvg(container);
		expect(svg.getAttribute('width')).toBe('48');
		expect(svg.getAttribute('height')).toBe('48');
	});

	it('applies custom class', () => {
		const { container } = render(WebForgeLogo, { props: { class: 'custom-logo' } });
		const svg: SVGSVGElement = querySvg(container);
		expect(svg.classList.contains('custom-logo')).toBe(true);
	});

	it('has aria-hidden for decorative usage', () => {
		const { container } = render(WebForgeLogo);
		const svg: SVGSVGElement = querySvg(container);
		expect(svg.getAttribute('aria-hidden')).toBe('true');
	});
});
