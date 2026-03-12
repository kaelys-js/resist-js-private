<script lang="ts">
  import * as Dialog from '@/ui/dialog';
  import Button from '@/ui/button/button.svelte';
  import Input from '@/ui/input/input.svelte';
  import Label from '@/ui/label/label.svelte';
</script>

<Dialog.Root>
  <Dialog.Trigger>
    {#snippet children()}
      <Button variant="outline">Edit Profile</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit Profile</Dialog.Title>
      <Dialog.Description>
        Make changes to your profile here. Click save when you're done.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Name</Label>
        <Input class="col-span-3" placeholder="Enter your name" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Username</Label>
        <Input class="col-span-3" placeholder="@username" />
      </div>
    </div>
    <Dialog.Footer>
      <Button>Save changes</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
