import { Capacitor } from '@capacitor/core';
import { DAYS } from '../data/data';

export async function scheduleTripNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const { display } = await LocalNotifications.requestPermissions();
  if (display !== 'granted') return;

  // Cancel any existing
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel(pending);
  }

  // Schedule a morning notification for each trip day
  const notifications = DAYS.map((day, index) => ({
    id: index + 1,
    title: `Day ${day.dayNumber}: ${day.theme}`,
    body: `${day.city} \u2014 ${day.stops.length} stops planned today`,
    schedule: {
      at: new Date(`${day.date}T07:00:00`),
      allowWhileIdle: true,
    },
    extra: { dayNumber: day.dayNumber },
  }));

  await LocalNotifications.schedule({ notifications });
}
