<script lang="ts">
  /**
   * Test harness for `@/ui/nav-secondary` with a fixed Settings/Help
   * item fixture. Lets editor unit tests verify the secondary nav
   * group rendering in the editor's TestProviders context.
   *
   * @module
   */
  import CircleHelp from '@lucide/svelte/icons/circle-help';
  import Settings from '@lucide/svelte/icons/settings';
  import TestProviders from './TestProviders.svelte';
  import NavSecondary from '@/ui/nav-secondary/NavSecondary.svelte';

  const items = [
    { title: 'Settings', url: '#settings', icon: Settings },
    { title: 'Help', url: '#help', icon: CircleHelp },
  ];
</script>

<TestProviders>
  <NavSecondary {items} />
</TestProviders>
