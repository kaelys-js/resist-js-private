<script lang="ts">
  /**
   * Empty Lens example — basic empty state with an Inbox icon,
   * title, and description.
   *
   * @module
   */
  import * as Empty from '@/ui/empty';
  import InboxIcon from '@lucide/svelte/icons/inbox';
</script>

<Empty.Root>
  <Empty.Media variant="icon">
    <InboxIcon />
  </Empty.Media>
  <Empty.Title>No items found</Empty.Title>
  <Empty.Description>Get started by creating your first item.</Empty.Description>
</Empty.Root>
