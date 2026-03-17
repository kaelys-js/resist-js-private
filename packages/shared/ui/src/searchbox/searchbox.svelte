<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Search text @values value */
    value,
    /** Initial value @values defaultValue */
    defaultValue,
    /** Visual style @values appearance */
    appearance,
    /** Input size @values size */
    size,
    /** Disabled state */
    disabled = false,
    /** Clear/dismiss button @values slot */
    dismiss,
    /** Search icon @values slot */
    contentBefore,
    /** Additional content @values slot */
    contentAfter,
    children,
  }: {
    /** Search text */
    value: Str;
    /** Initial value */
    defaultValue: Str;
    /** Visual style */
    appearance: Str;
    /** Input size */
    size: Str;
    /** Disabled state */
    disabled?: Bool;
    /** Clear/dismiss button */
    dismiss: Str;
    /** Search icon */
    contentBefore: Str;
    /** Additional content */
    contentAfter: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
