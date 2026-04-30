/**
 * Tests for the adaptive quality controller.
 *
 * Verifies quality reduction on backpressure, recovery when
 * buffer clears, frame skip rate adjustment, and bounds clamping.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Bool, Num } from '@/schemas/common';
import { AdaptiveQualityController } from './adaptive-quality';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('AdaptiveQualityController', (): void => {
  let controller: AdaptiveQualityController;

  beforeEach((): void => {
    controller = new AdaptiveQualityController(60 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Initial state                                                    */
  /* ---------------------------------------------------------------- */

  it('starts at the configured base quality', (): void => {
    expect(controller.currentQuality).toBe(60 as Num);
  });

  it('starts with zero frame skip rate', (): void => {
    expect(controller.frameSkipRate).toBe(0 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Backpressure detection                                           */
  /* ---------------------------------------------------------------- */

  it('reduces quality when buffer is high', (): void => {
    // Simulate high buffer (> threshold)
    controller.reportBufferSize(50_000 as Num);
    expect((controller.currentQuality as number) < 60).toBe(true as Bool);
  });

  it('does not reduce quality below minimum', (): void => {
    // Hammer it with large buffers
    for (let i: Num = 0 as Num; (i as number) < 20; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(100_000 as Num);
    }
    expect((controller.currentQuality as number) >= 10).toBe(true as Bool);
  });

  it('increases frame skip rate under sustained pressure', (): void => {
    // Multiple high-buffer reports should increase skip rate
    for (let i: Num = 0 as Num; (i as number) < 10; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(80_000 as Num);
    }
    expect((controller.frameSkipRate as number) > 0).toBe(true as Bool);
  });

  /* ---------------------------------------------------------------- */
  /*  Recovery                                                         */
  /* ---------------------------------------------------------------- */

  it('recovers quality when buffer clears', (): void => {
    // Reduce quality first
    controller.reportBufferSize(50_000 as Num);
    const reducedQuality: Num = controller.currentQuality;
    expect((reducedQuality as number) < 60).toBe(true as Bool);

    // Buffer clears
    for (let i: Num = 0 as Num; (i as number) < 10; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(0 as Num);
    }
    expect((controller.currentQuality as number) > (reducedQuality as number)).toBe(true as Bool);
  });

  it('does not exceed base quality on recovery', (): void => {
    // Reduce then recover
    controller.reportBufferSize(50_000 as Num);
    for (let i: Num = 0 as Num; (i as number) < 50; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(0 as Num);
    }
    expect((controller.currentQuality as number) <= 60).toBe(true as Bool);
  });

  it('recovers frame skip rate when buffer clears', (): void => {
    // Build up skip rate
    for (let i: Num = 0 as Num; (i as number) < 10; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(80_000 as Num);
    }
    expect((controller.frameSkipRate as number) > 0).toBe(true as Bool);

    // Buffer clears
    for (let i: Num = 0 as Num; (i as number) < 20; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(0 as Num);
    }
    expect(controller.frameSkipRate).toBe(0 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  shouldSkipFrame                                                  */
  /* ---------------------------------------------------------------- */

  it('shouldSkipFrame returns false at zero skip rate', (): void => {
    expect(controller.shouldSkipFrame()).toBe(false as Bool);
  });

  it('shouldSkipFrame skips frames according to skip rate', (): void => {
    // Force skip rate up
    for (let i: Num = 0 as Num; (i as number) < 15; i = ((i as number) + 1) as Num) {
      controller.reportBufferSize(100_000 as Num);
    }

    // With a non-zero skip rate, some frames should be skipped
    let skipped: Num = 0 as Num;

    for (let i: Num = 0 as Num; (i as number) < 20; i = ((i as number) + 1) as Num) {
      if (controller.shouldSkipFrame()) {
        skipped = ((skipped as number) + 1) as Num;
      }
    }
    // At least some frames should be skipped
    expect((skipped as number) > 0).toBe(true as Bool);
  });

  /* ---------------------------------------------------------------- */
  /*  Reset                                                            */
  /* ---------------------------------------------------------------- */

  it('reset restores base quality and zero skip rate', (): void => {
    controller.reportBufferSize(50_000 as Num);
    controller.reset();
    expect(controller.currentQuality).toBe(60 as Num);
    expect(controller.frameSkipRate).toBe(0 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Different base qualities                                         */
  /* ---------------------------------------------------------------- */

  it('respects custom base quality', (): void => {
    const highQuality: AdaptiveQualityController = new AdaptiveQualityController(90 as Num);
    expect(highQuality.currentQuality).toBe(90 as Num);
    highQuality.reportBufferSize(50_000 as Num);
    expect((highQuality.currentQuality as number) < 90).toBe(true as Bool);
  });
});
