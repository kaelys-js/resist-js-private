<script lang="ts" module>
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

  /** Expose instances to tests via mount()'s returned component API. */
  export function getSidebar() {
    return sidebar;
  }
  export function getRetrieved() {
    return retrieved;
  }
</script>
