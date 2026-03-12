<script lang="ts">
  import Label from '@/ui/label/label.svelte';
  import Input from '@/ui/input/input.svelte';
</script>

<div class="grid w-full max-w-sm items-center gap-1.5">
  <Label for="email">Email</Label>
  <Input type="email" id="email" placeholder="Email" />
</div>
