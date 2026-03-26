<script lang="ts">
  import type { Day } from '../../data/types';
  import CityBadge from './CityBadge.svelte';
  import StopItem from './StopItem.svelte';
  import MealSlot from './MealSlot.svelte';
  import { AccordionItem, AccordionToggle, AccordionContent } from 'framework7-svelte';

  let { day, isPast = false, isToday = false }: {
    day: Day;
    isPast?: boolean;
    isToday?: boolean;
  } = $props();

  function formatDate(date: string, weekday: string): string {
    const d = new Date(date + 'T12:00:00');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    return `${weekday} ${month} ${dayNum}`;
  }

  const dateLabel = $derived(formatDate(day.date, day.weekday));
  const dayLabel = $derived(`Day ${day.dayNumber} \u00b7 ${dateLabel}`);
</script>

<div
  class="day-card"
  class:day-card--past={isPast}
  class:day-card--today={isToday}
>
  <AccordionItem opened={isToday}>
    <AccordionToggle>
      <div class="day-card__header">
        <div class="day-card__title-row">
          <span class="day-card__day-label">{dayLabel}</span>
          <CityBadge city={day.city} />
        </div>
        <div class="day-card__theme">{day.theme}</div>
        <div class="day-card__highlights">
          {#each day.highlights.slice(0, 3) as highlight}
            <span class="day-card__highlight">{highlight}</span>
          {/each}
          <span class="day-card__stop-count">{day.stops.length} stops</span>
        </div>
      </div>
    </AccordionToggle>
    <AccordionContent>
      <div class="day-card__body">
        {#each day.stops as stop}
          <StopItem {stop} {dayLabel} />
        {/each}

        {#if day.lunch}
          <MealSlot label="Lunch" text={day.lunch} />
        {/if}
        {#if day.dinner}
          <MealSlot label="Dinner" text={day.dinner} />
        {/if}
        {#if day.notes}
          <div class="day-card__notes">
            {day.notes}
          </div>
        {/if}
      </div>
    </AccordionContent>
  </AccordionItem>
</div>

<style>
  .day-card {
    margin: var(--space-sm) var(--space-md);
    background: var(--color-cream);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: opacity 0.2s;
  }

  .day-card--past {
    opacity: 0.5;
  }

  .day-card--today {
    opacity: 1;
    border-left: 3px solid var(--color-gold);
  }

  .day-card__header {
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
  }

  .day-card__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .day-card__day-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-navy);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .day-card__theme {
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--color-charcoal);
    margin-top: var(--space-xs);
  }

  .day-card__highlights {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: var(--space-sm);
  }

  .day-card__highlight {
    font-size: 0.75rem;
    color: var(--color-slate);
    background: rgba(0, 0, 0, 0.04);
    padding: 2px 8px;
    border-radius: 999px;
  }

  :global(.dark) .day-card__highlight {
    background: rgba(255, 255, 255, 0.08);
  }

  .day-card__stop-count {
    font-size: 0.75rem;
    color: var(--color-navy);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(29, 58, 94, 0.08);
  }

  .day-card__body {
    padding: 0 var(--space-lg) var(--space-lg);
  }

  .day-card__notes {
    margin-top: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-info-bg);
    border-radius: var(--radius-sm);
    font-size: 0.8125rem;
    color: var(--color-slate);
    font-style: italic;
  }
</style>
