<script lang="ts">
  /**
   * Lens example — Spinner paired with a "Loading…" text
   * caption for in-flight async operations.
   *
   * @module
   */
  import Spinner from '@/ui/spinner/Spinner.svelte';
</script>

<div class="flex items-center gap-2 text-sm text-muted-foreground">
  <Spinner />
  Loading...
</div>
