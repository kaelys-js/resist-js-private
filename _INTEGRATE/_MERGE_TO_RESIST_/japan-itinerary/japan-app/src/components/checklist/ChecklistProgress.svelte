<script lang="ts">
  import { Progressbar, Block } from 'framework7-svelte';

  let { completed = 0, total = 0 }: {
    completed?: number;
    total?: number;
  } = $props();

  const percent = $derived(total > 0 ? Math.round((completed / total) * 100) : 0);
</script>

<Block class="checklist-progress">
  <div class="checklist-progress__text">
    <span class="checklist-progress__count">{completed} of {total} completed</span>
    <span class="checklist-progress__percent">{percent}%</span>
  </div>
  <Progressbar
    progress={percent}
    color={percent === 100 ? 'green' : undefined}
  />
</Block>

<style>
  .checklist-progress__text {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
    font-size: 0.875rem;
  }

  .checklist-progress__count {
    color: var(--color-charcoal);
    font-weight: 500;
  }

  .checklist-progress__percent {
    color: var(--color-navy);
    font-weight: 600;
  }
</style>
