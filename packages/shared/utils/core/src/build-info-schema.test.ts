/**
 * Tests for BuildInfoSchema — Valibot schema for build-time metadata.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { safeParse } from '@/utils/result/safe';
import { BuildInfoSchema } from './build-info-schema';

describe('BuildInfoSchema', () => {
  const validBuildInfo = {
    version: '0.0.0',
    commit: 'abc1234',
    commitFull: 'abc1234def5678901234567890abcdef12345678',
    branch: 'main',
    dirty: false,
    buildTimestamp: '2026-01-01T00:00:00.000Z',
  };

  it('passes with valid build info', () => {
    const result = safeParse(BuildInfoSchema, validBuildInfo);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe('0.0.0');
      expect(result.data.commit).toBe('abc1234');
      expect(result.data.commitFull).toBe('abc1234def5678901234567890abcdef12345678');
      expect(result.data.branch).toBe('main');
      expect(result.data.dirty).toBe(false);
      expect(result.data.buildTimestamp).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('fails with missing version', () => {
    const { version: _, ...noVersion } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noVersion);
    expect(result.ok).toBe(false);
  });

  it('fails with empty version string', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, version: '' });
    expect(result.ok).toBe(false);
  });

  it('fails with missing commit', () => {
    const { commit: _, ...noCommit } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noCommit);
    expect(result.ok).toBe(false);
  });

  it('fails with empty commit string', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, commit: '' });
    expect(result.ok).toBe(false);
  });

  it('fails with missing commitFull', () => {
    const { commitFull: _, ...noCommitFull } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noCommitFull);
    expect(result.ok).toBe(false);
  });

  it('fails with missing branch', () => {
    const { branch: _, ...noBranch } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noBranch);
    expect(result.ok).toBe(false);
  });

  it('fails with missing dirty flag', () => {
    const { dirty: _, ...noDirty } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noDirty);
    expect(result.ok).toBe(false);
  });

  it('fails with non-boolean dirty', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, dirty: 'yes' });
    expect(result.ok).toBe(false);
  });

  it('fails with invalid timestamp', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, buildTimestamp: 'not-a-date' });
    expect(result.ok).toBe(false);
  });

  it('fails with missing buildTimestamp', () => {
    const { buildTimestamp: _, ...noTimestamp } = validBuildInfo;
    const result = safeParse(BuildInfoSchema, noTimestamp);
    expect(result.ok).toBe(false);
  });

  it('rejects unknown extra keys (strictObject)', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, extra: 'field' });
    expect(result.ok).toBe(false);
  });

  it('accepts dirty = true', () => {
    const result = safeParse(BuildInfoSchema, { ...validBuildInfo, dirty: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.dirty).toBe(true);
  });
});
