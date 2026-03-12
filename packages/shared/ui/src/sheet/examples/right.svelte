<script lang="ts">
  import * as Sheet from '@/ui/sheet';
  import Button from '@/ui/button/button.svelte';
  import Input from '@/ui/input/input.svelte';
  import Label from '@/ui/label/label.svelte';
</script>

<Sheet.Root>
  <Sheet.Trigger>
    {#snippet children()}
      <Button variant="outline">Open Right</Button>
    {/snippet}
  </Sheet.Trigger>
  <Sheet.Content side="right">
    <Sheet.Header>
      <Sheet.Title>Edit Profile</Sheet.Title>
      <Sheet.Description>
        Make changes to your profile here. Click save when you're done.
      </Sheet.Description>
    </Sheet.Header>
    <div class="grid gap-4 px-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Name</Label>
        <Input class="col-span-3" placeholder="Enter your name" />
      </div>
      <div class="grid grid-cols-4 items-center gap-4">
        <Label class="text-right">Username</Label>
        <Input class="col-span-3" placeholder="@username" />
      </div>
    </div>
    <Sheet.Footer>
      <Sheet.Close>
        {#snippet children()}
          <Button variant="outline">Cancel</Button>
        {/snippet}
      </Sheet.Close>
      <Button>Save changes</Button>
    </Sheet.Footer>
  </Sheet.Content>
</Sheet.Root>
