import { Capacitor } from '@capacitor/core';

export async function initStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
}
