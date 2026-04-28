<script lang="ts">
  /**
   * Lens example — basic Skeleton shapes laid out as pulsing
   * placeholder lines at varying widths.
   *
   * @module
   */
  import Skeleton from '@/ui/skeleton/skeleton.svelte';
</script>

<div class="flex flex-col gap-3">
  <Skeleton class="h-4 w-[250px]" />
  <Skeleton class="h-4 w-[200px]" />
  <Skeleton class="h-4 w-[150px]" />
</div>
