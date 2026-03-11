<script lang="ts">
  import type { Booking, BookingStatus } from '../../data/types';
  import { Card, CardHeader, CardContent, Icon } from 'framework7-svelte';
  import { tapFeedback } from '../../lib/haptics';

  let { booking, status, onStatusChange }: {
    booking: Booking;
    status: BookingStatus;
    onStatusChange?: (id: string, status: BookingStatus) => void;
  } = $props();

  const statusCycle: BookingStatus[] = ['need_to_book', 'booked', 'na'];
  const statusLabels: Record<BookingStatus, string> = {
    need_to_book: 'Need to Book',
    booked: 'Booked',
    na: 'N/A',
  };
  const statusEmoji: Record<BookingStatus, string> = {
    need_to_book: '\u23f3',
    booked: '\u2705',
    na: '\u2014',
  };

  function cycleStatus() {
    tapFeedback();
    const idx = statusCycle.indexOf(status);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    onStatusChange?.(booking.id, next);
  }

  const badgeClass = $derived(
    status === 'booked'
      ? 'badge-status--booked'
      : status === 'need_to_book'
        ? 'badge-status--need-to-book'
        : 'badge-status--na',
  );
</script>

<Card class={booking.urgent ? 'booking-card--urgent' : ''}>
  <CardHeader>
    <div class="booking-card__header">
      <Icon f7={booking.icon} size="20px" />
      <span class="booking-card__name">{booking.name}</span>
      <button class="badge-status {badgeClass}" onclick={cycleStatus}>
        {statusEmoji[status]} {statusLabels[status]}
      </button>
    </div>
  </CardHeader>
  <CardContent>
    <div class="booking-card__details">
      <div class="booking-card__row">
        <span class="booking-card__label">When:</span>
        <span>{booking.whenToBook}</span>
      </div>
      <div class="booking-card__row">
        <span class="booking-card__label">Cost:</span>
        <span>{booking.estimatedCost}</span>
      </div>
      <div class="booking-card__row">
        <span class="booking-card__label">Platform:</span>
        <span>{booking.platform}</span>
      </div>
      {#if booking.notes}
        <p class="booking-card__notes">{booking.notes}</p>
      {/if}
    </div>
  </CardContent>
</Card>

<style>
  .booking-card__header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
  }

  .booking-card__name {
    flex: 1;
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .booking-card__details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.8125rem;
  }

  .booking-card__row {
    display: flex;
    gap: var(--space-sm);
  }

  .booking-card__label {
    color: var(--color-slate);
    min-width: 60px;
    font-weight: 500;
  }

  .booking-card__notes {
    margin: var(--space-xs) 0 0;
    font-size: 0.8125rem;
    color: var(--color-slate);
    font-style: italic;
  }

  :global(.booking-card--urgent) {
    border-left: 3px solid var(--color-vermillion);
  }

  button.badge-status {
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
</style>
