<!-- @convert-to-lens -->
<script lang="ts">
  import { cn, type WithElementRef } from '../utils.js';
  import {
    type CarouselAPI,
    type CarouselProps,
    type EmblaContext,
    setEmblaContext,
  } from './context.js';

  let {
    ref = $bindable(null),
    /** Embla carousel options for scroll behavior and snapping. */
    opts = {},
    /** Array of Embla carousel plugins. */
    plugins = [],
    /** Callback to receive the carousel API instance. */
    setApi = () => {
      /* no-op — default callback */
    },
    /** Scroll direction of the carousel. @values horizontal, vertical */
    orientation = 'horizontal',
    class: className,
    children,
    ...restProps
  }: WithElementRef<CarouselProps> = $props();

  let carouselState = $state<EmblaContext>({
    api: undefined,
    canScrollNext: false,
    canScrollPrev: false,
    handleKeyDown,
    onInit,
    options: opts,
    orientation,
    plugins,
    scrollNext,
    scrollPrev,
    scrollSnaps: [],
    scrollTo,
    selectedIndex: 0,
  });

  setEmblaContext(carouselState);

  function scrollPrev() {
    carouselState.api?.scrollPrev();
  }

  function scrollNext() {
    carouselState.api?.scrollNext();
  }

  function scrollTo(index: number, jump?: boolean) {
    carouselState.api?.scrollTo(index, jump);
  }

  function onSelect() {
    if (!carouselState.api) {
      return;
    }
    carouselState.selectedIndex = carouselState.api.selectedScrollSnap();
    carouselState.canScrollNext = carouselState.api.canScrollNext();
    carouselState.canScrollPrev = carouselState.api.canScrollPrev();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollNext();
    }
  }

  function onInit(event: CustomEvent<CarouselAPI>) {
    carouselState.api = event.detail;
    setApi(carouselState.api);

    carouselState.scrollSnaps = carouselState.api.scrollSnapList();
    carouselState.api.on('select', onSelect);
    onSelect();
  }

  $effect(() => {
    return () => {
      carouselState.api?.off('select', onSelect);
    };
  });
</script>

<div
  bind:this={ref}
  data-slot="carousel"
  class={cn('relative', className)}
  role="region"
  aria-roledescription="carousel"
  {...restProps}
>
  {@render children?.()}
</div>
