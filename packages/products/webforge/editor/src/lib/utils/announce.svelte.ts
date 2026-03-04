/**
 * Shared screen reader announcement system.
 *
 * A single `aria-live="polite"` region in `+layout.svelte` renders the
 * current announcement. Components call {@link announce} to push status
 * messages (e.g., "Copied!", "3 results found") to screen readers.
 *
 * @example
 * import { announce } from '$lib/utils/announce.svelte';
 * announce('Copied to clipboard');
 */

let message: string = $state('');

/**
 * Announce a message to screen readers via the global live region.
 *
 * Clears the message first, then sets it after a `requestAnimationFrame`
 * so the DOM mutation is detected as a change (prevents "same value"
 * announcements from being ignored).
 *
 * @param text - The message to announce
 */
export function announce(text: string): void {
	message = '';
	requestAnimationFrame(() => {
		message = text;
	});
}

/**
 * Returns the current announcement message for binding in the live region.
 *
 * @returns The current announcement text (empty string when idle)
 */
export function getAnnouncement(): string {
	return message;
}
