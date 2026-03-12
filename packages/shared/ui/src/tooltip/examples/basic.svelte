<script lang="ts">
  import Button from '@/ui/button/button.svelte';
  import * as Tooltip from '@/ui/tooltip';
</script>

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger>
      <Button variant="outline">Hover me</Button>
    </Tooltip.Trigger>
    <Tooltip.Content>This is a tooltip</Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
