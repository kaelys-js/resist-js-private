<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Image items */
    value,
    /** Current image index @values 0, 0, 10 */
    activeIndex = 0,
    /** Fullscreen mode */
    fullScreen = false,
    /** Visible thumbnails @values 0, 3, 6 */
    numVisible = 3,
    /** Show thumbnail strip */
    showThumbnails = true,
    /** Show dot indicators */
    showIndicators = false,
    /** Show prev/next arrows */
    showItemNavigators = false,
    /** Circular navigation */
    circular = false,
    /** Auto-advance */
    autoPlay = false,
    /** Auto-advance interval @values 0, 4000, 8000 */
    transitionInterval = 4000,
    /** Thumbnail position @values 'bottom', 'top', 'left', 'right' */
    thumbnailsPosition = 'bottom',
    children,
  }: {
    /** Image items */
    value: Str[];
    /** Current image index */
    activeIndex?: Num;
    /** Fullscreen mode */
    fullScreen?: Bool;
    /** Visible thumbnails */
    numVisible?: Num;
    /** Show thumbnail strip */
    showThumbnails?: Bool;
    /** Show dot indicators */
    showIndicators?: Bool;
    /** Show prev/next arrows */
    showItemNavigators?: Bool;
    /** Circular navigation */
    circular?: Bool;
    /** Auto-advance */
    autoPlay?: Bool;
    /** Auto-advance interval */
    transitionInterval?: Num;
    /** Thumbnail position */
    thumbnailsPosition?: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
