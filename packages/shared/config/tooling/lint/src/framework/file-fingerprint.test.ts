/**
 * Tests for fingerprintFiles helper.
 *
 * @module
 */

import { mkdirSync, writeFileSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fingerprintFiles } from './file-fingerprint.ts';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `fingerprint-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('fingerprintFiles', () => {
  it('returns the same hash for the same input set', () => {
    const a: string = join(tmpDir, 'a.ts');
    const b: string = join(tmpDir, 'b.ts');
    writeFileSync(a, 'one');
    writeFileSync(b, 'two');

    const h1: string = fingerprintFiles([a, b]);
    const h2: string = fingerprintFiles([a, b]);
    expect(h1).toBe(h2);
  });

  it('is order-independent (sorted internally)', () => {
    const a: string = join(tmpDir, 'a.ts');
    const b: string = join(tmpDir, 'b.ts');
    writeFileSync(a, 'one');
    writeFileSync(b, 'two');

    const h1: string = fingerprintFiles([a, b]);
    const h2: string = fingerprintFiles([b, a]);
    expect(h1).toBe(h2);
  });

  it('changes when content changes (different size)', () => {
    const a: string = join(tmpDir, 'a.ts');
    writeFileSync(a, 'short');
    const before: string = fingerprintFiles([a]);

    writeFileSync(a, 'much longer content here than before');
    const after: string = fingerprintFiles([a]);

    expect(before).not.toBe(after);
  });

  it('changes when mtime changes (same size)', () => {
    const a: string = join(tmpDir, 'a.ts');
    writeFileSync(a, 'abc');
    const before: string = fingerprintFiles([a]);

    /* Force mtime change without altering size: same content, new mtime. */
    utimesSync(a, new Date(0), new Date(0));
    const after: string = fingerprintFiles([a]);
    expect(before).not.toBe(after);
  });

  it('handles missing files via MISSING sentinel', () => {
    const real: string = join(tmpDir, 'real.ts');
    const ghost: string = join(tmpDir, 'does-not-exist.ts');
    writeFileSync(real, 'x');

    /* Hash with the missing path differs from hash without it. */
    const withMissing: string = fingerprintFiles([real, ghost]);
    const withoutMissing: string = fingerprintFiles([real]);
    expect(withMissing).not.toBe(withoutMissing);
  });

  it('returns a stable hash for empty input', () => {
    const h1: string = fingerprintFiles([]);
    const h2: string = fingerprintFiles([]);
    expect(h1).toBe(h2);
    expect(h1.length).toBeGreaterThan(0);
  });

  it('returns hex-encoded sha256 (64 chars)', () => {
    const a: string = join(tmpDir, 'a.ts');
    writeFileSync(a, 'x');
    const h: string = fingerprintFiles([a]);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces a different hash when a file is added to the set', () => {
    const a: string = join(tmpDir, 'a.ts');
    const b: string = join(tmpDir, 'b.ts');
    writeFileSync(a, 'x');
    writeFileSync(b, 'y');

    const one: string = fingerprintFiles([a]);
    const two: string = fingerprintFiles([a, b]);
    expect(one).not.toBe(two);
  });
});
