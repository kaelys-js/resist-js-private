import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AppLogo from '@/ui/app-logo/AppLogo.svelte';

/**
 * Queries the rendered logo img element from the container.
 *
 * @param container - DOM container from render()
 * @returns The img element
 */
function queryImg(container: HTMLElement): HTMLImageElement {
  const img: HTMLImageElement | null = container.querySelector('img.logo-img');
  if (!img) throw new Error('Logo img not found');
  return img;
}

describe('AppLogo', () => {
  it('renders an img element pointing to favicon.svg', () => {
    const { container } = render(AppLogo);
    const img: HTMLImageElement = queryImg(container);
    expect(img.getAttribute('src')).toBe('/favicon.svg');
  });

  it('defaults to size 24', () => {
    const { container } = render(AppLogo);
    const img: HTMLImageElement = queryImg(container);
    expect(img.getAttribute('width')).toBe('24');
    expect(img.getAttribute('height')).toBe('24');
  });

  it('respects custom size prop', () => {
    const { container } = render(AppLogo, { props: { size: 48 } });
    const img: HTMLImageElement = queryImg(container);
    expect(img.getAttribute('width')).toBe('48');
    expect(img.getAttribute('height')).toBe('48');
  });

  it('applies custom class to entrance wrapper', () => {
    const { container } = render(AppLogo, { props: { class: 'custom-logo' } });
    const wrapper: HTMLElement | null = container.querySelector('.logo-entrance');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.classList.contains('custom-logo')).toBe(true);
  });

  it('has aria-hidden for decorative usage', () => {
    const { container } = render(AppLogo);
    const img: HTMLImageElement = queryImg(container);
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders sparkle overlay element', () => {
    const { container } = render(AppLogo);
    const sparkle: HTMLElement | null = container.querySelector('.logo-sparkle');
    expect(sparkle).toBeInTheDocument();
  });
});
