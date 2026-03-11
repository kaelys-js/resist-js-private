<script lang="ts">
  import { Card, CardContent } from 'framework7-svelte';
  import { BUDGET_CATEGORIES, GRAND_TOTALS } from '../../data/data';
  import DonutChart from './DonutChart.svelte';

  const chartSegments = BUDGET_CATEGORIES.map((cat) => {
    const colors: Record<string, string> = {
      transit: '#1d3a5e',
      tickets: '#c63d3a',
      accommodation: '#b8860b',
      meals: '#16a34a',
      misc: '#6b7b8c',
    };
    const midValue = Math.round(
      (cat.estimatedRange.low + cat.estimatedRange.high) / 2,
    );
    return {
      label: cat.name,
      value: midValue,
      color: colors[cat.id] || '#6b7b8c',
    };
  });
</script>

<Card>
  <CardContent>
    <div class="budget-summary">
      <h3 class="budget-summary__title">Estimated Total (per person)</h3>
      <p class="budget-summary__range">
        CAD ${GRAND_TOTALS.budget.cadLow.toLocaleString()}\u2013{GRAND_TOTALS.midRange.cadHigh.toLocaleString()}
      </p>
      <DonutChart segments={chartSegments} centerText="Per Person" />
    </div>
  </CardContent>
</Card>

<style>
  .budget-summary {
    text-align: center;
  }

  .budget-summary__title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-navy);
    margin: 0 0 var(--space-xs);
  }

  .budget-summary__range {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-charcoal);
    margin: 0 0 var(--space-md);
  }
</style>
