import { Capacitor } from '@capacitor/core';

export async function shareStop(
  location: string,
  time: string,
  dayLabel: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: `Japan 2026 - ${dayLabel}`,
      text: `${time} - ${location}`,
      dialogTitle: 'Share this stop',
    });
  } else if (navigator.share) {
    await navigator.share({
      title: `Japan 2026 - ${dayLabel}`,
      text: `${time} - ${location}`,
    });
  }
}

export async function shareDayPlan(
  dayNumber: number,
  theme: string,
  stops: string[],
): Promise<void> {
  const text = `Day ${dayNumber}: ${theme}\n\n${stops.join('\n')}`;

  if (Capacitor.isNativePlatform()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: `Japan 2026 - Day ${dayNumber}`,
      text,
      dialogTitle: 'Share day plan',
    });
  } else if (navigator.share) {
    await navigator.share({
      title: `Japan 2026 - Day ${dayNumber}`,
      text,
    });
  }
}
