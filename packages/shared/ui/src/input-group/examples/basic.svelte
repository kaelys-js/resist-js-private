<script lang="ts">
  /**
   * InputGroup Lens example — basic input combined with addons.
   *
   * @module
   */
  import * as InputGroup from '@/ui/input-group';
</script>

<div class="flex flex-col gap-4 w-full max-w-sm">
  <InputGroup.Root>
    <InputGroup.Addon>https://</InputGroup.Addon>
    <InputGroup.Input placeholder="example.com" />
  </InputGroup.Root>
  <InputGroup.Root>
    <InputGroup.Input placeholder="Search..." />
    <InputGroup.Button>Go</InputGroup.Button>
  </InputGroup.Root>
</div>
