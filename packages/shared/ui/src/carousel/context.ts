/**
 * Carousel context — shared types and `setEmblaContext` /
 * `getEmblaContext` helpers used by the Carousel root and its
 * sub-components (content, item, next, previous) to communicate
 * Embla state without prop-drilling.
 *
 * @module
 */

import type {
  EmblaCarouselSvelteType,
  default as emblaCarouselSvelte,
} from 'embla-carousel-svelte';
import { getContext, hasContext, setContext } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { WithElementRef } from '../utils.js';

/** Description. */
export type CarouselAPI =
  NonNullable<NonNullable<EmblaCarouselSvelteType['$$_attributes']>['on:emblaInit']> extends (
    evt: CustomEvent<infer CarouselAPI>,
  ) => void
    ? CarouselAPI
    : never;

type EmblaCarouselConfig = NonNullable<Parameters<typeof emblaCarouselSvelte>[1]>;

/** Description. */
export type CarouselOptions = EmblaCarouselConfig['options'];
/** Description. */
export type CarouselPlugins = EmblaCarouselConfig['plugins'];

////

/** Description. */
export type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugins;
  setApi?: (api: CarouselAPI | undefined) => void;
  orientation?: 'horizontal' | 'vertical';
} & WithElementRef<HTMLAttributes<HTMLDivElement>>;

const EMBLA_CAROUSEL_CONTEXT = Symbol('EMBLA_CAROUSEL_CONTEXT');

/** Description. */
export type EmblaContext = {
  api: CarouselAPI | undefined;
  orientation: 'horizontal' | 'vertical';
  scrollNext: () => void;
  scrollPrev: () => void;
  canScrollNext: boolean;
  canScrollPrev: boolean;
  handleKeyDown: (e: KeyboardEvent) => void;
  options: CarouselOptions;
  plugins: CarouselPlugins;
  onInit: (e: CustomEvent<CarouselAPI>) => void;
  scrollTo: (index: number, jump?: boolean) => void;
  scrollSnaps: number[];
  selectedIndex: number;
};

/**
 * Stores the Carousel's EmblaContext under the shared key so
 * descendant Carousel parts can read it via `getEmblaContext`.
 *
 * @param config - The EmblaContext to publish for descendants
 * @returns The same `config` (passthrough for chaining)
 */
export function setEmblaContext(config: EmblaContext): EmblaContext {
  setContext(EMBLA_CAROUSEL_CONTEXT, config);
  return config;
}

/**
 * Retrieves the Carousel's EmblaContext from a descendant
 * component, throwing a descriptive error if no `<Carousel.Root>`
 * ancestor has set it.
 *
 * @param name - Component name used in the error message
 * @returns The EmblaContext set by the nearest `<Carousel.Root>`
 */
export function getEmblaContext(name = 'This component') {
  if (!hasContext(EMBLA_CAROUSEL_CONTEXT)) {
    throw new Error(`${name} must be used within a <Carousel.Root> component`);
  }
  return getContext<ReturnType<typeof setEmblaContext>>(EMBLA_CAROUSEL_CONTEXT);
}
