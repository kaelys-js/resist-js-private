<script lang="ts">
  import { GRAND_TOTALS } from '../../data/data';
  import { Block } from 'framework7-svelte';
</script>

<Block>
  <div class="grand-total">
    <table class="grand-total__table">
      <thead>
        <tr>
          <th></th>
          <th>Budget</th>
          <th>Mid-Range</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="grand-total__label">Japan expenses</td>
          <td>~\u00a5{GRAND_TOTALS.budget.jpy.toLocaleString()}</td>
          <td>~\u00a5{GRAND_TOTALS.midRange.jpy.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="grand-total__label">Flights</td>
          <td colspan="2" class="grand-total__centered">
            ~CAD ${GRAND_TOTALS.flightsCad.low}\u2013{GRAND_TOTALS.flightsCad.high}
          </td>
        </tr>
        <tr class="grand-total__total-row">
          <td class="grand-total__label">GRAND TOTAL</td>
          <td>~CAD ${GRAND_TOTALS.budget.cadLow.toLocaleString()}\u2013{GRAND_TOTALS.budget.cadHigh.toLocaleString()}</td>
          <td>~CAD ${GRAND_TOTALS.midRange.cadLow.toLocaleString()}\u2013{GRAND_TOTALS.midRange.cadHigh.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>
</Block>

<style>
  .grand-total {
    background: var(--color-cream);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    overflow-x: auto;
  }

  .grand-total__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  .grand-total__table th {
    text-align: right;
    padding: var(--space-sm);
    font-weight: 600;
    color: var(--color-navy);
    border-bottom: 2px solid var(--color-divider);
  }

  .grand-total__table th:first-child {
    text-align: left;
  }

  .grand-total__table td {
    padding: var(--space-sm);
    text-align: right;
    border-bottom: 1px solid var(--color-divider);
  }

  .grand-total__label {
    text-align: left !important;
    font-weight: 500;
    color: var(--color-charcoal);
  }

  .grand-total__centered {
    text-align: center !important;
  }

  .grand-total__total-row td {
    font-weight: 700;
    color: var(--color-navy);
    border-bottom: none;
    border-top: 2px solid var(--color-navy);
  }
</style>
