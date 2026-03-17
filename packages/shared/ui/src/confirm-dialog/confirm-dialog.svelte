<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Dialog visibility */
    visible = false,
    /** Confirmation message @values string, ReactNode */
    message,
    /** Dialog header text @values header */
    header,
    /** Icon class/component @values icon */
    icon,
    /** Accept button text @values 'Yes' */
    acceptLabel = 'Yes',
    /** Reject button text @values 'No' */
    rejectLabel = 'No',
    /** Accept callback */
    accept,
    /** Reject callback */
    reject,
    /** Can be dragged */
    draggable = true,
    /** Can be closed */
    closable = true,
    /** Dialog position @values position */
    position,
    children,
  }: {
    /** Dialog visibility */
    visible?: Bool;
    /** Confirmation message */
    message: Str;
    /** Dialog header text */
    header: Str;
    /** Icon class/component */
    icon: Str;
    /** Accept button text */
    acceptLabel?: Str;
    /** Reject button text */
    rejectLabel?: Str;
    /** Accept callback */
    accept: () => void;
    /** Reject callback */
    reject: () => void;
    /** Can be dragged */
    draggable?: Bool;
    /** Can be closed */
    closable?: Bool;
    /** Dialog position */
    position: Str;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
