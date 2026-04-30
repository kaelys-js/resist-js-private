/**
 * Shared clipboard utility for the Lens documentation system.
 *
 * Provides a cross-browser clipboard copy function with `navigator.clipboard`
 * and `document.execCommand('copy')` fallback for insecure contexts.
 *
 * @module
 */
import type { Bool, Str } from '@/schemas/common';

/**
 * Copy text to clipboard with legacy fallback.
 *
 * Uses `navigator.clipboard.writeText()` when available, falls back to
 * `document.execCommand('copy')` via a hidden textarea for older browsers
 * or insecure contexts.
 *
 * @param {Str} text - The string to copy to the clipboard
 * @returns {Promise<Bool>} Whether the copy succeeded
 *
 * @example
 * ```typescript
 * const ok = await clipboardCopy('<Button>Click me</Button>');
 * if (ok) console.log('Copied!');
 * ```
 */
export async function clipboardCopy(text: Str): Promise<Bool> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* clipboard API rejected — fall through to legacy */
    }
  }
  // Legacy fallback: hidden textarea + execCommand
  try {
    const ta: HTMLTextAreaElement = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    // insertBefore(node, null) appends — avoids ParentNode.append vs Body.append type conflict
    document.body.insertBefore(ta, null);
    ta.select();
    const ok: Bool = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    /* execCommand not available — copy failed entirely */
    return false;
  }
}
