<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Flex direction @values 'row', 'column', 'row-reverse', 'column-reverse' */
    direction = 'row',
    /** Flex wrap @values 'nowrap', 'wrap', 'wrap-reverse' */
    wrap = 'nowrap',
    /** Align items @values 'stretch' */
    align = 'stretch',
    /** Justify content @values 'flex-start' */
    justify = 'flex-start',
    /** Gap between children @values number, string */
    gap,
    /** Flex shorthand for child sizing @values flex */
    flex,
    /** Flex basis @values basis */
    basis,
    /** Flex grow @values 0, 50, 100 */
    grow,
    /** Flex shrink @values 0, 50, 100 */
    shrink,
    children,
  }: {
    /** Flex direction */
    direction?: Str;
    /** Flex wrap */
    wrap?: Str;
    /** Align items */
    align?: Str;
    /** Justify content */
    justify?: Str;
    /** Gap between children */
    gap: Str;
    /** Flex shorthand for child sizing */
    flex: Str;
    /** Flex basis */
    basis: Str;
    /** Flex grow */
    grow: Num;
    /** Flex shrink */
    shrink: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
