/**
 * Adaptive quality controller for preview frame streaming.
 *
 * Monitors WebSocket buffered amount and adjusts JPEG quality
 * and frame skip rate to prevent backpressure from overwhelming
 * the connection. Quality is reduced gradually under pressure
 * and recovered when the buffer clears.
 *
 * Algorithm:
 * - Buffer > HIGH threshold → reduce quality by step, increase skip
 * - Buffer < LOW threshold → increase quality by step, decrease skip
 * - Quality clamped to [MIN_QUALITY, baseQuality]
 * - Skip rate clamped to [0, MAX_SKIP_RATE]
 *
 * @module
 */

import type { Num } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Buffer threshold (bytes) above which quality is reduced. */
const HIGH_BUFFER_THRESHOLD: Num = 32_768 as Num; // 32 KB

/** Buffer threshold (bytes) below which quality is recovered. */
const LOW_BUFFER_THRESHOLD: Num = 8192 as Num; // 8 KB

/** Quality step for each adjustment cycle. */
const QUALITY_STEP: Num = 5 as Num;

/** Minimum JPEG quality floor. */
const MIN_QUALITY: Num = 10 as Num;

/** Maximum frame skip rate (skip N out of N+1 frames). */
const MAX_SKIP_RATE: Num = 3 as Num;

/** Number of consecutive high-buffer reports before skip rate increases. */
const SKIP_ESCALATION_COUNT: Num = 5 as Num;

/* ------------------------------------------------------------------ */
/*  Controller                                                         */
/* ------------------------------------------------------------------ */

/**
 * Adaptive quality controller for backpressure management.
 *
 * Reports WebSocket buffer size periodically, and the controller
 * adjusts quality and frame skip rate accordingly.
 *
 * @example
 * const controller = new AdaptiveQualityController(60);
 * // In the frame loop:
 * controller.reportBufferSize(ws.bufferedAmount);
 * if (controller.shouldSkipFrame()) return;
 * const quality = controller.currentQuality;
 */
export class AdaptiveQualityController {
  /** Base JPEG quality (the ceiling during recovery). */
  private readonly baseQuality: Num;

  /** Current adjusted JPEG quality. */
  private quality: Num;

  /** Current frame skip rate (0 = no skip, 1 = skip every other, etc.). */
  private skipRate: Num = 0 as Num;

  /** Frame counter for skip pattern. */
  private frameCounter: Num = 0 as Num;

  /** Consecutive high-buffer report count. */
  private highBufferCount: Num = 0 as Num;

  /**
   * Create a new adaptive quality controller.
   *
   * @param baseQuality - Initial/maximum JPEG quality (0-100)
   */
  constructor(baseQuality: Num) {
    this.baseQuality = baseQuality;
    this.quality = baseQuality;
  }

  /**
   * Current adjusted JPEG quality.
   *
   * @returns Quality value (MIN_QUALITY to baseQuality)
   */
  get currentQuality(): Num {
    return this.quality;
  }

  /**
   * Current frame skip rate.
   *
   * @returns Skip rate (0 = no skip)
   */
  get frameSkipRate(): Num {
    return this.skipRate;
  }

  /**
   * Report the current WebSocket buffered amount.
   *
   * Adjusts quality and skip rate based on buffer pressure:
   * - High buffer → reduce quality, escalate skip rate
   * - Low buffer → recover quality, de-escalate skip rate
   *
   * @param bufferSize - WebSocket.bufferedAmount in bytes
   */
  reportBufferSize(bufferSize: Num): void {
    if ((bufferSize as number) > (HIGH_BUFFER_THRESHOLD as number)) {
      // Under pressure — reduce quality
      this.quality = Math.max(
        MIN_QUALITY as number,
        (this.quality as number) - (QUALITY_STEP as number),
      ) as Num;

      // Track consecutive high-buffer reports for skip escalation
      this.highBufferCount = ((this.highBufferCount as number) + 1) as Num;
      if ((this.highBufferCount as number) >= (SKIP_ESCALATION_COUNT as number)) {
        this.skipRate = Math.min(MAX_SKIP_RATE as number, (this.skipRate as number) + 1) as Num;
        this.highBufferCount = 0 as Num;
      }
    } else if ((bufferSize as number) < (LOW_BUFFER_THRESHOLD as number)) {
      // Buffer clearing — recover quality
      this.quality = Math.min(
        this.baseQuality as number,
        (this.quality as number) + (QUALITY_STEP as number),
      ) as Num;

      // De-escalate skip rate
      if ((this.skipRate as number) > 0) {
        this.highBufferCount = ((this.highBufferCount as number) + 1) as Num;
        if ((this.highBufferCount as number) >= (SKIP_ESCALATION_COUNT as number)) {
          this.skipRate = ((this.skipRate as number) - 1) as Num;
          this.highBufferCount = 0 as Num;
        }
      } else {
        this.highBufferCount = 0 as Num;
      }
    } else {
      // In the neutral zone — reset counter but don't change quality
      this.highBufferCount = 0 as Num;
    }
  }

  /**
   * Check if the current frame should be skipped.
   *
   * Based on the skip rate, returns true for frames that should
   * be dropped. Uses a simple modular counter pattern.
   *
   * @returns True if this frame should be skipped
   */
  shouldSkipFrame(): boolean {
    if ((this.skipRate as number) === 0) {
      return false;
    }

    this.frameCounter = (((this.frameCounter as number) + 1) %
      ((this.skipRate as number) + 1)) as Num;
    return (this.frameCounter as number) !== 0;
  }

  /**
   * Reset quality and skip rate to initial values.
   *
   * Call when a session is restarted or a new stream begins.
   */
  reset(): void {
    this.quality = this.baseQuality;
    this.skipRate = 0 as Num;
    this.frameCounter = 0 as Num;
    this.highBufferCount = 0 as Num;
  }
}
