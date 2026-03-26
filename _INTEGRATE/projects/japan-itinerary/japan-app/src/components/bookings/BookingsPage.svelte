<script lang="ts">
  import { Page, Navbar, BlockTitle } from 'framework7-svelte';
  import { onMount } from 'svelte';
  import { BOOKINGS } from '../../data/data';
  import { loadBookings, saveBookings } from '../../lib/state';
  import type { BookingState, BookingStatus } from '../../data/types';
  import BookingCard from './BookingCard.svelte';
  import PaidEntryList from './PaidEntryList.svelte';
  import TransitPasses from './TransitPasses.svelte';

  let bookingState = $state<BookingState>({});

  function handleStatusChange(id: string, status: BookingStatus) {
    bookingState = { ...bookingState, [id]: status };
    saveBookings(bookingState);
  }

  onMount(async () => {
    const saved = await loadBookings();
    const merged: BookingState = {};
    for (const b of BOOKINGS) {
      merged[b.id] = saved[b.id] ?? b.defaultStatus;
    }
    bookingState = merged;
  });
</script>

<Page name="bookings">
  <Navbar title="Bookings" />

  <BlockTitle large>Pre-Trip Bookings</BlockTitle>
  {#each BOOKINGS as booking (booking.id)}
    <BookingCard
      {booking}
      status={bookingState[booking.id] ?? booking.defaultStatus}
      onStatusChange={handleStatusChange}
    />
  {/each}

  <BlockTitle large>Paid Entry (No Advance Booking)</BlockTitle>
  <PaidEntryList />

  <TransitPasses />

  <div style="height: calc(var(--space-xl) + env(safe-area-inset-bottom, 0px));"></div>
</Page>
