<script lang="ts">
  import type { BudgetCategory, ExpenseState } from '../../data/types';
  import { formatJPY } from '../../lib/currency';
  import { AccordionItem, AccordionToggle, AccordionContent, List, Icon } from 'framework7-svelte';
  import ExpenseItem from './ExpenseItem.svelte';

  let { category, expenseState = {}, onTogglePaid, onAmountChange }: {
    category: BudgetCategory;
    expenseState?: ExpenseState;
    onTogglePaid?: (id: string, value: boolean) => void;
    onAmountChange?: (id: string, amount: number) => void;
  } = $props();

  const paidTotal = $derived(
    category.items.reduce((sum, item) => {
      const exp = expenseState[item.id];
      if (exp?.paid) {
        return sum + (exp.actualAmount ?? item.amount);
      }
      return sum;
    }, 0),
  );

  const rangeText = $derived(
    `${formatJPY(category.estimatedRange.low)}\u2013${formatJPY(category.estimatedRange.high)}`,
  );
</script>

<div class="expense-category">
  <AccordionItem>
    <AccordionToggle>
      <div class="expense-category__header">
        <Icon f7={category.icon} size="20px" color="primary" />
        <div class="expense-category__info">
          <span class="expense-category__name">{category.name}</span>
          <span class="expense-category__range">{rangeText}</span>
        </div>
        {#if paidTotal > 0}
          <span class="expense-category__paid">
            {formatJPY(paidTotal)} paid
          </span>
        {/if}
      </div>
    </AccordionToggle>
    <AccordionContent>
      <List>
        {#each category.items as item (item.id)}
          <ExpenseItem
            {item}
            paid={expenseState[item.id]?.paid ?? false}
            actualAmount={expenseState[item.id]?.actualAmount}
            {onTogglePaid}
            {onAmountChange}
          />
        {/each}
      </List>
    </AccordionContent>
  </AccordionItem>
</div>

<style>
  .expense-category {
    margin: var(--space-sm) var(--space-md);
    background: var(--color-cream);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .expense-category__header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
  }

  .expense-category__info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .expense-category__name {
    font-weight: 600;
    font-size: 0.9375rem;
    color: var(--color-charcoal);
  }

  .expense-category__range {
    font-size: 0.75rem;
    color: var(--color-slate);
    margin-top: 2px;
  }

  .expense-category__paid {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-free);
    white-space: nowrap;
  }
</style>
