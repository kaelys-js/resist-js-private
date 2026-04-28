<script lang="ts">
  /**
   * DropdownMenu Lens example — basic menu with items, keyboard
   * shortcuts, and a separator above a destructive action.
   *
   * @module
   */
  import * as DropdownMenu from '@/ui/dropdown-menu';
  import Button from '@/ui/button/button.svelte';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet children()}
      <Button variant="outline">Open Menu</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-56">
    <DropdownMenu.Label>My Account</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item>
      Profile
      <DropdownMenu.Shortcut>Ctrl+P</DropdownMenu.Shortcut>
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      Settings
      <DropdownMenu.Shortcut>Ctrl+,</DropdownMenu.Shortcut>
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item>
      Log out
      <DropdownMenu.Shortcut>Ctrl+Q</DropdownMenu.Shortcut>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
