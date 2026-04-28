<script lang="ts">
  /**
   * Lens example — Sheet demonstrating slide-in from left,
   * top, and bottom edges via the `side` prop.
   *
   * @module
   */
  import * as Sheet from '@/ui/sheet';
  import Button from '@/ui/button/button.svelte';
</script>

<div class="flex flex-wrap items-center gap-4">
  <Sheet.Root>
    <Sheet.Trigger>
      {#snippet children()}
        <Button variant="outline">Left</Button>
      {/snippet}
    </Sheet.Trigger>
    <Sheet.Content side="left">
      <Sheet.Header>
        <Sheet.Title>Navigation</Sheet.Title>
        <Sheet.Description>Browse the sidebar menu.</Sheet.Description>
      </Sheet.Header>
      <nav class="flex flex-col gap-2 px-4 py-4">
        <Button variant="ghost" class="justify-start">Dashboard</Button>
        <Button variant="ghost" class="justify-start">Projects</Button>
        <Button variant="ghost" class="justify-start">Settings</Button>
      </nav>
    </Sheet.Content>
  </Sheet.Root>

  <Sheet.Root>
    <Sheet.Trigger>
      {#snippet children()}
        <Button variant="outline">Top</Button>
      {/snippet}
    </Sheet.Trigger>
    <Sheet.Content side="top">
      <Sheet.Header>
        <Sheet.Title>Announcement</Sheet.Title>
        <Sheet.Description>Important notice from the top.</Sheet.Description>
      </Sheet.Header>
    </Sheet.Content>
  </Sheet.Root>

  <Sheet.Root>
    <Sheet.Trigger>
      {#snippet children()}
        <Button variant="outline">Bottom</Button>
      {/snippet}
    </Sheet.Trigger>
    <Sheet.Content side="bottom">
      <Sheet.Header>
        <Sheet.Title>Cookie Preferences</Sheet.Title>
        <Sheet.Description>Manage your cookie settings.</Sheet.Description>
      </Sheet.Header>
      <Sheet.Footer>
        <Sheet.Close>
          {#snippet children()}
            <Button variant="outline">Decline</Button>
          {/snippet}
        </Sheet.Close>
        <Button>Accept All</Button>
      </Sheet.Footer>
    </Sheet.Content>
  </Sheet.Root>
</div>
