<script lang="ts">
  import * as Collapsible from '@/ui/collapsible';
  import Button from '@/ui/button/button.svelte';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

  let isOpen: boolean = $state(false);
</script>

<Collapsible.Root bind:open={isOpen} class="w-80 space-y-2">
  <div class="flex items-center justify-between space-x-4">
    <h4 class="text-sm font-semibold">3 items tagged</h4>
    <Collapsible.Trigger>
      {#snippet children()}
        <Button variant="ghost" size="sm">
          <ChevronsUpDownIcon class="size-4" />
          <span class="sr-only">Toggle</span>
        </Button>
      {/snippet}
    </Collapsible.Trigger>
  </div>
  <div class="rounded-md border px-4 py-2 text-sm font-mono">@radix-ui/primitives</div>
  <Collapsible.Content>
    <div class="space-y-2">
      <div class="rounded-md border px-4 py-2 text-sm font-mono">@radix-ui/colors</div>
      <div class="rounded-md border px-4 py-2 text-sm font-mono">@stitches/react</div>
    </div>
  </Collapsible.Content>
</Collapsible.Root>
