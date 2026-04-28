<script lang="ts" module>
  /**
   * Test-only harness mounted by `context.svelte.test.ts` to
   * exercise `setSidebar` / `useSidebar` and expose the
   * resulting `SidebarState` instances back to the test.
   *
   * @module
   */
  import type { SidebarStateProps } from './context.svelte.js';
</script>

<script lang="ts">
  import { setSidebar, useSidebar } from './context.svelte.js';

  type Props = {
    /** Initial sidebar state props forwarded to `setSidebar`. */
    init: SidebarStateProps;
  };
  const { init }: Props = $props();
  const sidebar = setSidebar(init);
  const retrieved = useSidebar();

  /** Expose the locally-set `SidebarState` instance to tests. */
  export function getSidebar() {
    return sidebar;
  }
  /** Expose the value retrieved via `useSidebar()` to tests. */
  export function getRetrieved() {
    return retrieved;
  }
</script>
