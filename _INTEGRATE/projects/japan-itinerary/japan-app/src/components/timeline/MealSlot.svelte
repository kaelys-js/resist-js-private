<script lang="ts">
  import { Icon } from 'framework7-svelte';

  let { label, text }: { label: string; text: string } = $props();
</script>

<div class="meal-slot">
  <Icon f7="flame" size="14px" color="green" />
  <span class="meal-label">{label}:</span>
  <span class="meal-text">{text}</span>
</div>

<style>
  .meal-label {
    font-weight: 600;
    margin-left: 6px;
  }

  .meal-text {
    margin-left: 4px;
  }
</style>
