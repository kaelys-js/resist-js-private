import { describe, expect, test } from 'vitest';
import { perlin2d } from './perlin';

describe('perlin2d', () => {
  test('returns a number in range [-1, 1]', () => {
    for (let i = 0; i < 1000; i++) {
      const val = perlin2d(Math.random() * 100, Math.random() * 100);
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  test('is deterministic — same input returns same output', () => {
    const a = perlin2d(3.14, 2.71);
    const b = perlin2d(3.14, 2.71);
    expect(a).toBe(b);
  });

  test('varies with input — different inputs return different outputs', () => {
    const a = perlin2d(0, 0);
    const b = perlin2d(1.5, 2.5);
    expect(a).not.toBe(b);
  });

  test('is smooth — nearby inputs produce nearby outputs', () => {
    const a = perlin2d(5.0, 5.0);
    const b = perlin2d(5.001, 5.001);
    expect(Math.abs(a - b)).toBeLessThan(0.01);
  });

  test('varies across a range — not constant', () => {
    const values = new Set<number>();
    for (let x = 0; x < 10; x++) {
      values.add(Math.round(perlin2d(x * 0.7, 0) * 1000));
    }
    expect(values.size).toBeGreaterThan(3);
  });
});
