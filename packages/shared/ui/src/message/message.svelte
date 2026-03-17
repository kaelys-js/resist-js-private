<!-- @convert-to-lens -->
<script lang="ts">
  import type { Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Message content @values string, element */
    content,
    /** Message type @values 'info', 'success', 'warning', 'error', 'loading' */
    type = 'info',
    /** Auto-close time (seconds) @values 0, 3, 6 */
    duration = 3,
    /** Maximum concurrent messages @values 0, 50, 100 */
    maxCount,
    children,
  }: {
    /** Message content */
    content: Str;
    /** Message type */
    type?: Str;
    /** Auto-close time (seconds) */
    duration?: Num;
    /** Maximum concurrent messages */
    maxCount: Num;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
