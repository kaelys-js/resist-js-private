<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Whether content view is shown */
    active = false,
    /** Show close button in content view */
    closable = false,
    /** Disabled state */
    disabled = false,
    children,
  }: {
    /** Whether content view is shown */
    active?: Bool;
    /** Show close button in content view */
    closable?: Bool;
    /** Disabled state */
    disabled?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
