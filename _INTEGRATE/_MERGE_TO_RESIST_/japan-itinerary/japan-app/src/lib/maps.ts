import { Capacitor } from '@capacitor/core';

export function openInMaps(query: string): void {
  const encoded = encodeURIComponent(query);

  if (Capacitor.getPlatform() === 'ios') {
    window.open(`maps://maps.apple.com/?q=${encoded}`, '_system');
  } else {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      '_blank',
    );
  }
}

export async function copyAddress(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
