<script lang="ts">
  /**
   * Test harness for LanguageSwitcher inside an open DropdownMenu so
   * unit tests can drive locale selection against the live menu (the
   * switcher is normally a submenu nested in the user dropdown).
   *
   * @module
   */
  import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
  import TestProviders from './TestProviders.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
</script>

<TestProviders>
  <DropdownMenu.Root open={true}>
    <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <LanguageSwitcher />
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</TestProviders>
