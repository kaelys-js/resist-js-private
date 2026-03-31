/**
 * Document Debouncer
 *
 * Per-document timer management for lint-on-type. Each document URI gets its
 * own timer that is reset on every keystroke, preventing rapid re-linting.
 *
 * @module
 */

/**
 * Manages debounce timers keyed by document URI string.
 *
 * Implements the Disposable pattern for cleanup on extension deactivation.
 */
export class DocumentDebouncer {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /**
   * Schedules a function to run after a delay, cancelling any pending timer
   * for the same URI.
   *
   * @param uri - Document URI string
   * @param fn - Function to execute after the delay
   * @param ms - Delay in milliseconds
   */
  schedule(uri: string, fn: () => void, ms: number): void {
    this.cancel(uri);
    const timer: NodeJS.Timeout = setTimeout(() => {
      this.timers.delete(uri);
      fn();
    }, ms);
    this.timers.set(uri, timer);
  }

  /**
   * Cancels a pending timer for a specific document URI.
   *
   * @param uri - Document URI string
   */
  cancel(uri: string): void {
    const existing: NodeJS.Timeout | undefined = this.timers.get(uri);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(uri);
    }
  }

  /** Cancels all pending timers and clears the internal map. */
  dispose(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}
