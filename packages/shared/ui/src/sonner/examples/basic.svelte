<script lang="ts">
  /**
   * Lens example — Sonner mounted with three buttons firing
   * default, success, and error toasts.
   *
   * @module
   */
  import { toast } from 'svelte-sonner';
  import Button from '@/ui/button/button.svelte';
  import Sonner from '@/ui/sonner/Sonner.svelte';
</script>

<div class="flex flex-wrap gap-2">
  <Button variant="outline" onclick={() => toast('Event has been created.')}>Default</Button>
  <Button variant="outline" onclick={() => toast.success('Successfully saved!')}>Success</Button>
  <Button variant="outline" onclick={() => toast.error('Something went wrong.')}>Error</Button>
</div>
<Sonner />
