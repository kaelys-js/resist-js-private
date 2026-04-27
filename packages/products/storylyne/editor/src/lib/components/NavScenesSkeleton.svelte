<script lang="ts">
  /**
   * NavScenesSkeleton — placeholder bones rendered while the scene
   * list is loading. Shows three Skeleton row placeholders in the
   * expanded sidebar (hidden when the sidebar is collapsed to icon
   * mode).
   *
   * @module
   */
  import { Skeleton } from '@/ui/skeleton/index.js';
  import * as Sidebar from '@/ui/sidebar/index.js';
  import type { Num } from '@/schemas/common';

  const skeletonCount: Num = 3;
</script>

<!-- Expanded: 3 scene row skeletons with label (hidden when collapsed to icon) -->
<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
  <Sidebar.GroupLabel>
    <Skeleton class="h-4 w-16" />
  </Sidebar.GroupLabel>
  <Sidebar.Menu>
    {#each Array(skeletonCount) as _}
      <Sidebar.MenuItem>
        <div class="flex items-center gap-2 px-2 py-1.5">
          <Skeleton class="size-4 shrink-0 rounded" />
          <Skeleton class="h-4 w-24" />
        </div>
      </Sidebar.MenuItem>
    {/each}
  </Sidebar.Menu>
</Sidebar.Group>
<!-- Collapsed: single icon skeleton matching NavScenes' Sidebar.MenuButton with MapIcon -->
<Sidebar.Group class="hidden group-data-[collapsible=icon]:flex">
  <Sidebar.Menu>
    <Sidebar.MenuItem>
      <div class="flex size-8 items-center justify-center rounded-md p-2 mx-auto">
        <Skeleton class="size-4 shrink-0 rounded" />
      </div>
    </Sidebar.MenuItem>
  </Sidebar.Menu>
</Sidebar.Group>
