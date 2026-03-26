<script lang="ts">
  import type { BudgetItem } from '../../data/types';
  import { formatJPY } from '../../lib/currency';
  import { ListItem, Toggle } from 'framework7-svelte';
  import { tapFeedback } from '../../lib/haptics';

  let { item, paid = false, actualAmount, onTogglePaid, onAmountChange }: {
    item: BudgetItem;
    paid?: boolean;
    actualAmount?: number;
    onTogglePaid?: (id: string, value: boolean) => void;
    onAmountChange?: (id: string, amount: number) => void;
  } = $props();

  function handleToggle() {
    tapFeedback();
    onTogglePaid?.(item.id, !paid);
  }

  function handleAmountInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value, 10);
    if (!isNaN(val)) {
      onAmountChange?.(item.id, val);
    }
  }
</script>

<ListItem title={item.name} after={formatJPY(item.amount)}>
  {#snippet innerEnd()}
    <div class="expense-item__controls">
      <Toggle
        checked={paid}
        onChange={handleToggle}
      />
      {#if paid}
        <input
          type="number"
          class="expense-item__input"
          placeholder="Actual"
          value={actualAmount ?? ''}
          oninput={handleAmountInput}
        />
      {/if}
    </div>
  {/snippet}
</ListItem>

<style>
  .expense-item__controls {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-left: var(--space-sm);
  }

  .expense-item__input {
    width: 72px;
    padding: 4px 8px;
    border: 1px solid var(--color-divider);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    font-family: inherit;
    background: var(--color-warm-white);
    color: var(--color-charcoal);
  }
</style>
