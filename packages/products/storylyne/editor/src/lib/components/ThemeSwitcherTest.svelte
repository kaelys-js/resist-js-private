<script lang="ts">
  /**
   * Test harness for ThemeSwitcher inside an open DropdownMenu so unit
   * tests can drive theme selection against the live menu (the
   * switcher is normally a submenu nested in the user dropdown).
   *
   * @module
   */
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import TestProviders from './TestProviders.svelte';
  import ThemeSwitcher from './ThemeSwitcher.svelte';
</script>

<TestProviders>
  <DropdownMenu.Root open={true}>
    <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <ThemeSwitcher />
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</TestProviders>
