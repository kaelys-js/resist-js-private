import { TRIP_META } from '../data/data';

export type TripPhase = 'pre-trip' | 'during-trip' | 'post-trip';

export function getTripPhase(): TripPhase {
  const now = new Date();
  const start = new Date(TRIP_META.startDate + 'T00:00:00');
  const end = new Date(TRIP_META.endDate + 'T23:59:59');

  if (now < start) return 'pre-trip';
  if (now > end) return 'post-trip';
  return 'during-trip';
}

export function getCountdownText(): string {
  const now = new Date();
  const start = new Date(TRIP_META.startDate + 'T00:00:00');
  const phase = getTripPhase();

  if (phase === 'pre-trip') {
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays === 1 ? '' : 's'} to go`;
  }

  if (phase === 'during-trip') {
    const diffMs = now.getTime() - start.getTime();
    const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return `Day ${dayNumber} of ${TRIP_META.totalDays}`;
  }

  return 'Trip complete';
}

export function getCurrentDayNumber(): number | null {
  const now = new Date();
  const start = new Date(TRIP_META.startDate + 'T00:00:00');
  const diffMs = now.getTime() - start.getTime();
  const dayNumber = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (dayNumber >= 1 && dayNumber <= TRIP_META.totalDays) return dayNumber;
  return null;
}
