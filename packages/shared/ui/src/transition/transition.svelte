<!-- @convert-to-lens -->
<script lang="ts">
  import type { Bool, Num, Str } from '@/schemas/common';
  import type { Snippet } from 'svelte';

  let {
    /** Control visibility */
    show,
    /** Enter transition classes @values enter */
    enter,
    /** Enter start state @values enterFrom */
    enterFrom,
    /** Enter end state @values enterTo */
    enterTo,
    /** Leave transition classes @values leave */
    leave,
    /** Leave start state @values leaveFrom */
    leaveFrom,
    /** Leave end state @values leaveTo */
    leaveTo,
    /** Duration (ms) @values number, object */
    duration = 300,
    /** Named transition preset @values name */
    name,
    /** Animate on initial mount */
    appear = false,
    children,
  }: {
    /** Control visibility */
    show: Bool;
    /** Enter transition classes */
    enter: Str;
    /** Enter start state */
    enterFrom: Str;
    /** Enter end state */
    enterTo: Str;
    /** Leave transition classes */
    leave: Str;
    /** Leave start state */
    leaveFrom: Str;
    /** Leave end state */
    leaveTo: Str;
    /** Duration (ms) */
    duration?: Num;
    /** Named transition preset */
    name: Str;
    /** Animate on initial mount */
    appear?: Bool;
    /** Content to render inside the component. */
    children?: Snippet;
  } = $props();
</script>

<!-- Placeholder: implement from LENS-COMPONENTS.md -->
<div>
  {@render children?.()}
</div>
