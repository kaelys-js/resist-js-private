<script lang="ts">
  import Skeleton from '@/ui/skeleton/skeleton.svelte';
</script>

<div class="flex items-center gap-4">
  <Skeleton class="size-12 rounded-full" />
  <div class="flex flex-col gap-2">
    <Skeleton class="h-4 w-[200px]" />
    <Skeleton class="h-4 w-[150px]" />
  </div>
</div>
