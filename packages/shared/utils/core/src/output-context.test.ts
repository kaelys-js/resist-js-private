/**
 * Tests for output context.
 *
 * @module
 */

import { describe, expect, it, beforeEach } from 'vitest';
import type { Bool, OutputFormat, Void } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { setOutputFormat, getOutputFormat, isMachineReadable } from './output-context';

beforeEach(() => {
  setOutputFormat('pretty');
});

describe('setOutputFormat / getOutputFormat', () => {
  it('sets and returns the format', () => {
    const set: Result<Void> = setOutputFormat('json');
    expect(set.ok).toBe(true);
    const get: Result<OutputFormat> = getOutputFormat();
    expect(get.ok).toBe(true);
    if (get.ok) {
      expect(get.data).toBe('json');
    }
  });

  it('defaults to pretty', () => {
    const get: Result<OutputFormat> = getOutputFormat();
    expect(get.ok).toBe(true);
    if (get.ok) {
      expect(get.data).toBe('pretty');
    }
  });

  it('rejects invalid format', () => {
    const result: Result<Void> = setOutputFormat('invalid' as OutputFormat);
    expect(result.ok).toBe(false);
  });
});

describe('isMachineReadable', () => {
  it('returns true for json', () => {
    setOutputFormat('json');
    const result: Result<Bool> = isMachineReadable();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns true for junit', () => {
    setOutputFormat('junit');
    const result: Result<Bool> = isMachineReadable();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns true for github', () => {
    setOutputFormat('github');
    const result: Result<Bool> = isMachineReadable();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(true);
    }
  });

  it('returns false for pretty', () => {
    setOutputFormat('pretty');
    const result: Result<Bool> = isMachineReadable();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(false);
    }
  });
});
