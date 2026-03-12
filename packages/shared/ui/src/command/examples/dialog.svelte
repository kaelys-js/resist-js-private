<script lang="ts">
  import * as Command from '@/ui/command';
  import Button from '@/ui/button/button.svelte';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import UserIcon from '@lucide/svelte/icons/user';

  let dialogOpen: boolean = $state(false);
</script>

<Button variant="outline" onclick={() => (dialogOpen = true)}>Open Command Palette</Button>
<Command.Dialog bind:open={dialogOpen}>
  <Command.Input placeholder="Type a command or search..." />
  <Command.List>
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group heading="Suggestions">
      <Command.Item>
        <CalendarIcon />
        <span>Calendar</span>
      </Command.Item>
    </Command.Group>
    <Command.Separator />
    <Command.Group heading="Settings">
      <Command.Item>
        <UserIcon />
        <span>Profile</span>
        <Command.Shortcut>Ctrl+P</Command.Shortcut>
      </Command.Item>
      <Command.Item>
        <SettingsIcon />
        <span>Settings</span>
        <Command.Shortcut>Ctrl+,</Command.Shortcut>
      </Command.Item>
    </Command.Group>
  </Command.List>
</Command.Dialog>
