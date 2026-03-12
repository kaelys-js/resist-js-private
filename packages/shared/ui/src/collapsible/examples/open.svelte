<script lang="ts">
  import * as Collapsible from '@/ui/collapsible';
  import Button from '@/ui/button/button.svelte';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

  let isOpen: boolean = $state(true);
</script>

<Collapsible.Root bind:open={isOpen} class="w-80 space-y-2">
  <div class="flex items-center justify-between space-x-4">
    <h4 class="text-sm font-semibold">Project files</h4>
    <Collapsible.Trigger>
      {#snippet children()}
        <Button variant="ghost" size="sm">
          <ChevronsUpDownIcon class="size-4" />
          <span class="sr-only">Toggle</span>
        </Button>
      {/snippet}
    </Collapsible.Trigger>
  </div>
  <div class="rounded-md border px-4 py-2 text-sm font-mono">src/index.ts</div>
  <Collapsible.Content>
    <div class="space-y-2">
      <div class="rounded-md border px-4 py-2 text-sm font-mono">src/utils.ts</div>
      <div class="rounded-md border px-4 py-2 text-sm font-mono">src/types.ts</div>
      <div class="rounded-md border px-4 py-2 text-sm font-mono">src/config.ts</div>
    </div>
  </Collapsible.Content>
</Collapsible.Root>
