<script lang="ts">
  /**
   * Carousel content — viewport / container pair that hosts the
   * Embla slides. Reads the shared `EmblaContext` for orientation
   * and Embla options, then mounts the `embla-carousel-svelte`
   * action.
   *
   * @module
   */

  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../utils.js';
  import { getEmblaContext } from './context.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

  const emblaCtx = getEmblaContext('<Carousel.Content/>');
</script>

<div
  data-slot="carousel-content"
  class="overflow-hidden"
  use:emblaCarouselSvelte={{
    options: {
      container: '[data-embla-container]',
      slides: '[data-embla-slide]',
      ...emblaCtx.options,
      axis: emblaCtx.orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins: emblaCtx.plugins,
  }}
  onemblaInit={emblaCtx.onInit}
>
  <div
    bind:this={ref}
    class={cn(
      'flex',
      emblaCtx.orientation === 'horizontal' ? '-ms-4' : '-mt-4 flex-col',
      className,
    )}
    data-embla-container=""
    {...restProps}
  >
    {@render children?.()}
  </div>
</div>
