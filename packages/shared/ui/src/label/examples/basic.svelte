<script lang="ts">
  /**
   * Label Lens example — basic standalone label.
   *
   * @module
   */
  import Label from '@/ui/label/label.svelte';
</script>

<div class="flex flex-col gap-4">
  <Label>Email address</Label>
  <Label class="text-destructive">Required field</Label>
</div>
