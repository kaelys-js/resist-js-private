<script lang="ts">
  import { TRIP_META } from '../../data/data';
  import { getCountdownText, getTripPhase } from '../../lib/countdown';

  const countdownText = getCountdownText();
  const phase = getTripPhase();

  function formatDateRange(): string {
    return 'April 8\u201322 \u00b7 15 days';
  }
</script>

<div class="trip-header">
  <div class="trip-header__top">
    <h1 class="trip-header__title">{TRIP_META.title}</h1>
    <span
      class="trip-header__countdown"
      class:countdown--active={phase === 'during-trip'}
      class:countdown--done={phase === 'post-trip'}
    >
      {countdownText}
    </span>
  </div>
  <p class="trip-header__subtitle">{formatDateRange()}</p>
  <div class="trip-header__flights">
    <span>{TRIP_META.flights.outbound.code} out</span>
    <span class="trip-header__dot">\u00b7</span>
    <span>{TRIP_META.flights.return.code} return</span>
  </div>
</div>

<style>
  .trip-header {
    background: var(--color-navy);
    color: white;
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    margin: var(--space-md);
  }

  .trip-header__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .trip-header__title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .trip-header__countdown {
    background: var(--color-gold);
    color: white;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .countdown--active {
    background: var(--color-free);
  }

  .countdown--done {
    background: var(--color-slate);
  }

  .trip-header__subtitle {
    margin: var(--space-xs) 0 0;
    font-size: 0.9375rem;
    opacity: 0.85;
  }

  .trip-header__flights {
    margin-top: var(--space-sm);
    font-size: 0.75rem;
    opacity: 0.65;
  }

  .trip-header__dot {
    margin: 0 4px;
  }
</style>
