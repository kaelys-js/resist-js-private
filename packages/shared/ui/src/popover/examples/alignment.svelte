<script lang="ts">
  import * as Popover from '@/ui/popover';
  import Button from '@/ui/button/button.svelte';
</script>

<div class="flex flex-wrap items-center gap-4">
  <Popover.Root>
    <Popover.Trigger>
      {#snippet children()}
        <Button variant="outline" size="sm">Align Start</Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content align="start">
      <p class="text-sm">Aligned to the start of the trigger.</p>
    </Popover.Content>
  </Popover.Root>

  <Popover.Root>
    <Popover.Trigger>
      {#snippet children()}
        <Button variant="outline" size="sm">Align Center</Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content align="center">
      <p class="text-sm">Aligned to the center (default).</p>
    </Popover.Content>
  </Popover.Root>

  <Popover.Root>
    <Popover.Trigger>
      {#snippet children()}
        <Button variant="outline" size="sm">Align End</Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content align="end">
      <p class="text-sm">Aligned to the end of the trigger.</p>
    </Popover.Content>
  </Popover.Root>
</div>
