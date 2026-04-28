<script lang="ts">
  /**
   * Lens example — ScrollArea wrapping horizontally
   * overflowing content with a styled horizontal scrollbar.
   *
   * @module
   */
  import ScrollArea from '@/ui/scroll-area/scroll-area.svelte';
</script>

<ScrollArea class="w-64 rounded-md border" orientation="horizontal">
  <div class="flex gap-4 p-4">
    {#each Array.from({ length: 15 }, (_, i) => i + 1) as n (n)}
      <div
        class="flex h-20 w-24 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium"
      >
        {n}
      </div>
    {/each}
  </div>
</ScrollArea>
