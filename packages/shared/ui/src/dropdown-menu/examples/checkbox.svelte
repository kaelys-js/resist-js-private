<script lang="ts">
  import * as DropdownMenu from '@/ui/dropdown-menu';
  import Button from '@/ui/button/button.svelte';

  let showStatusBar: boolean = $state(true);
  let showActivityBar: boolean = $state(false);
  let showPanel: boolean = $state(true);
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet children()}
      <Button variant="outline">View Options</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-56">
    <DropdownMenu.Label>Appearance</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.CheckboxItem bind:checked={showStatusBar}>Status Bar</DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem bind:checked={showActivityBar}>
      Activity Bar
    </DropdownMenu.CheckboxItem>
    <DropdownMenu.CheckboxItem bind:checked={showPanel}>Panel</DropdownMenu.CheckboxItem>
  </DropdownMenu.Content>
</DropdownMenu.Root>
<p class="mt-2 text-xs text-muted-foreground">
  Status Bar: {showStatusBar} | Activity Bar: {showActivityBar} | Panel: {showPanel}
</p>
