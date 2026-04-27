/**
 * Dirty-frame detector for screenshot loop engines.
 *
 * Injects a MutationObserver + rAF-based dirty flag into the page
 * to detect when DOM content has changed. The screenshot loop polls
 * this flag before each capture — if the page hasn't changed, the
 * screenshot is skipped to save CPU.
 *
 * The detector is fail-open: if the page is navigating, closed, or
 * the script fails, it reports "dirty" so frames are captured.
 *
 * Flow:
 * 1. Install: inject MutationObserver + rAF script into page
 * 2. Poll: `isDirty()` reads and resets `window.__lensFrameDirty`
 * 3. MutationObserver sets flag on DOM mutations
 * 4. rAF callback sets flag on animation frames
 *
 * @module
 */

import type { Page } from 'playwright';

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

/**
 * Interface for dirty-frame detection.
 *
 * Used by the screenshot loop to skip captures when the page
 * content hasn't changed.
 */
export type DirtyDetector = {
  /**
   * Check if the page content has changed since the last check.
   *
   * Resets the dirty flag after reading. Returns true if dirty
   * (content changed) or if the check fails (fail-open).
   *
   * @returns True if the page has changed and needs re-capture
   */
  isDirty(): Promise<boolean>;
};

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Injects and polls a dirty-frame flag in a Playwright page.
 *
 * @example
 * const detector = new PageDirtyDetector(page);
 * await detector.install();
 * const dirty = await detector.isDirty();
 * if (dirty) captureScreenshot();
 */
export class PageDirtyDetector implements DirtyDetector {
  /** Playwright page to track. */
  private readonly page: Page;

  /** Whether the detection script has been injected. */
  private installed: boolean = false;

  /**
   * Create a new dirty detector.
   *
   * @param page - Playwright page to track for changes
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Inject the dirty detection script into the page.
   *
   * Sets up a MutationObserver on `document.body` (subtree + attributes +
   * childList + characterData) and a rAF loop that sets
   * `window.__lensFrameDirty = true` on any change.
   *
   * Idempotent — calling multiple times only injects once.
   */
  async install(): Promise<void> {
    if (this.installed) {
      return;
    }
    this.installed = true;

    await this.page.evaluate((): void => {
      const w = window as unknown as Record<string, unknown>;
      w.__lensFrameDirty = true; // Start dirty so first frame is captured

      // MutationObserver: flag on any DOM change
      const observer = new MutationObserver(() => {
        w.__lensFrameDirty = true;
      });

      if (document.body) {
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });
      }

      // rAF: flag on animation frame callbacks
      const origRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        w.__lensFrameDirty = true;
        return origRAF.call(window, callback);
      };
    });
  }

  /**
   * Check if the page content has changed since the last check.
   *
   * Reads and resets `window.__lensFrameDirty`. Fail-open: returns
   * true if the page is closed or evaluation fails.
   *
   * @returns True if page needs re-capture
   */
  async isDirty(): Promise<boolean> {
    if (this.page.isClosed()) {
      return true;
    }

    try {
      const dirty: unknown = await this.page.evaluate((): boolean => {
        const w = window as unknown as Record<string, unknown>;
        const d = Boolean(w.__lensFrameDirty);
        w.__lensFrameDirty = false;
        return d;
      });

      return Boolean(dirty);
    } catch {
      /* Page may be navigating or disconnected — fail-open, capture anyway */
      return true;
    }
  }
}
