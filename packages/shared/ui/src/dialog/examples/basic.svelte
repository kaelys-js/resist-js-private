<script lang="ts">
  import * as Dialog from '@/ui/dialog';
  import Button from '@/ui/button/button.svelte';
</script>

<Dialog.Root>
  <Dialog.Trigger>
    {#snippet children()}
      <Button variant="outline">Open Dialog</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Are you sure?</Dialog.Title>
      <Dialog.Description>
        This action cannot be undone. This will permanently delete your account and remove your data
        from our servers.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close>
        {#snippet children()}
          <Button variant="outline">Cancel</Button>
        {/snippet}
      </Dialog.Close>
      <Button>Continue</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
