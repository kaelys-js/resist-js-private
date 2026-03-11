import { describe, expect, it } from 'vitest';
import { sleep } from './service';
import { MOCK_USER } from './data';

describe('sleep', () => {
  it('resolves immediately for 0 ms', async () => {
    const start = performance.now();
    await sleep(0);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('resolves immediately for negative ms', async () => {
    const start = performance.now();
    await sleep(-100);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('resolves after the specified delay', async () => {
    const start = performance.now();
    await sleep(100);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });

  it('returns undefined', async () => {
    const result = await sleep(0);
    expect(result).toBeUndefined();
  });
});

describe('MOCK_USER', () => {
  it('has a non-empty id', () => {
    expect(MOCK_USER.id).toBeTruthy();
    expect(typeof MOCK_USER.id).toBe('string');
  });

  it('has a non-empty displayName', () => {
    expect(MOCK_USER.displayName).toBeTruthy();
    expect(typeof MOCK_USER.displayName).toBe('string');
  });

  it('has a valid email', () => {
    expect(MOCK_USER.email).toContain('@');
  });

  it('has an avatarUrl string', () => {
    expect(typeof MOCK_USER.avatarUrl).toBe('string');
  });
});
