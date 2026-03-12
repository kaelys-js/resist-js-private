<script lang="ts">
  import AspectRatio from '@/ui/aspect-ratio/aspect-ratio.svelte';
</script>

<div class="flex flex-wrap gap-4">
  <div class="w-[200px] overflow-hidden rounded-md border">
    <AspectRatio ratio={1}>
      <div
        class="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground"
      >
        1:1
      </div>
    </AspectRatio>
  </div>
  <div class="w-[200px] overflow-hidden rounded-md border">
    <AspectRatio ratio={4 / 3}>
      <div
        class="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground"
      >
        4:3
      </div>
    </AspectRatio>
  </div>
  <div class="w-[200px] overflow-hidden rounded-md border">
    <AspectRatio ratio={16 / 9}>
      <div
        class="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground"
      >
        16:9
      </div>
    </AspectRatio>
  </div>
</div>
