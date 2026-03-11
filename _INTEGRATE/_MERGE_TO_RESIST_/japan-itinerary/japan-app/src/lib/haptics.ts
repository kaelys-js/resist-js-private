import { Capacitor } from '@capacitor/core';

let hapticsModule: typeof import('@capacitor/haptics') | null = null;

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!hapticsModule) {
    hapticsModule = await import('@capacitor/haptics');
  }
  return hapticsModule;
}

export async function tapFeedback(): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
}

export async function toggleFeedback(): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  await mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
}

export async function successFeedback(): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  await mod.Haptics.notification({ type: mod.NotificationType.Success });
}

export async function selectionFeedback(): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  await mod.Haptics.selectionChanged();
}
