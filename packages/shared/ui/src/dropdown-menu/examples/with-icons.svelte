<script lang="ts">
  /**
   * DropdownMenu Lens example — items decorated with Lucide
   * icons and a destructive variant for the final row.
   *
   * @module
   */
  import * as DropdownMenu from '@/ui/dropdown-menu';
  import Button from '@/ui/button/button.svelte';
  import UserIcon from '@lucide/svelte/icons/user';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import MailIcon from '@lucide/svelte/icons/mail';
  import TrashIcon from '@lucide/svelte/icons/trash';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet children()}
      <Button variant="outline">Actions</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content class="w-56">
    <DropdownMenu.Item>
      <UserIcon />
      Profile
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      <MailIcon />
      Messages
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      <SettingsIcon />
      Settings
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item variant="destructive">
      <TrashIcon />
      Delete Account
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
