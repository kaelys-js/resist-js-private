<script lang="ts">
  import { Page, Navbar, BlockTitle } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { BUDGET_CATEGORIES } from '../../data/data';
  import { loadExpenses, saveExpenses } from '../../lib/state';
  import type { ExpenseState } from '../../data/types';
  import BudgetSummary from './BudgetSummary.svelte';
  import JrPassWarning from './JrPassWarning.svelte';
  import ExpenseCategory from './ExpenseCategory.svelte';
  import GrandTotal from './GrandTotal.svelte';

  let expenseState = $state<ExpenseState>({});

  function handleTogglePaid(id: string, value: boolean) {
    expenseState = {
      ...expenseState,
      [id]: { ...expenseState[id], paid: value },
    };
    saveExpenses(expenseState);
  }

  function handleAmountChange(id: string, amount: number) {
    expenseState = {
      ...expenseState,
      [id]: { ...expenseState[id], paid: true, actualAmount: amount },
    };
    saveExpenses(expenseState);
  }

  onMount(async () => {
    expenseState = await loadExpenses();
  });
</script>

<Page name="budget">
  <Navbar title="Budget" />

  <BudgetSummary />

  <JrPassWarning />

  <BlockTitle large>Expense Breakdown</BlockTitle>

  {#each BUDGET_CATEGORIES as category (category.id)}
    <ExpenseCategory
      {category}
      {expenseState}
      onTogglePaid={handleTogglePaid}
      onAmountChange={handleAmountChange}
    />
  {/each}

  <BlockTitle large>Grand Total</BlockTitle>
  <GrandTotal />

  <div style="height: calc(var(--space-xl) + env(safe-area-inset-bottom, 0px));"></div>
</Page>
