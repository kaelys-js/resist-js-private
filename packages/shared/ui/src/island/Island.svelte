<!-- @convert-to-lens -->
<script lang="ts">
  /**
   * Island — isolates interactive content within an otherwise static page.
   *
   * Wraps children in a container that can be independently hydrated,
   * styled, and animated. Useful for embedding rich interactive widgets
   * (charts, forms, editors) inside predominantly static layouts.
   *
   * @example
   * ```svelte
   * <Island>
   *   <InteractiveChart data={chartData} />
   * </Island>
   * ```
   */
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  const {
    /** Additional CSS classes to apply to the island container. @values p-4, rounded-lg border */
    class: className,
    /** The interactive content to render inside the island. @values {#snippet}...{/snippet} */
    children,
  }: {
    /** Additional CSS classes to apply to the island container. @values p-4, rounded-lg border */
    class?: string;
    /** The interactive content to render inside the island. @values {#snippet}...{/snippet} */
    children?: Snippet;
  } = $props();
</script>

<div data-slot="island" class={cn('island', className)}>
  {@render children?.()}
</div>
