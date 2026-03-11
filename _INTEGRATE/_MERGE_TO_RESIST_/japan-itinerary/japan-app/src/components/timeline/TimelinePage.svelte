<script lang="ts">
  import { Page, Navbar } from 'framework7-svelte';
  import { DAYS } from '../../data/data';
  import { getCurrentDayNumber } from '../../lib/countdown';
  import TripHeader from './TripHeader.svelte';
  import DayCard from './DayCard.svelte';

  const currentDay = getCurrentDayNumber();
</script>

<Page name="timeline">
  <Navbar title="Timeline" />

  <TripHeader />

  <div class="timeline-list">
    {#each DAYS as day (day.dayNumber)}
      <DayCard
        {day}
        isPast={currentDay !== null && day.dayNumber < currentDay}
        isToday={day.dayNumber === currentDay}
      />
    {/each}
  </div>
</Page>

<style>
  .timeline-list {
    padding-bottom: calc(var(--space-xl) + env(safe-area-inset-bottom, 0px));
  }
</style>
