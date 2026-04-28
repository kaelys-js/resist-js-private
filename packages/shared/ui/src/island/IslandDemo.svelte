<script lang="ts">
  /**
   * Demo for the Island component — shows a basic interactive island
   * embedded in static content.
   *
   * @module
   */
  import Island from './Island.svelte';
</script>

<div class="flex flex-col gap-4">
  <p class="text-sm text-muted-foreground">Static content above the island.</p>
  <Island class="rounded-lg border bg-card p-4">
    <div class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold">Interactive Island</h3>
      <p class="text-xs text-muted-foreground">
        This content is independently hydrated and interactive.
      </p>
      <button
        type="button"
        class="w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Click me
      </button>
    </div>
  </Island>
  <p class="text-sm text-muted-foreground">Static content below the island.</p>
</div>
