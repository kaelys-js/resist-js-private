/**
 * Unit tests for the shared UI utility functions.
 *
 * Tests the `cn` class-name merging function that combines clsx
 * conditional logic with tailwind-merge conflict resolution.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import type { Str } from '@/schemas/common';

import { cn } from './utils';

describe('cn', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('' as Str);
  });

  it('passes through a single class', () => {
    expect(cn('p-4')).toBe('p-4' as Str);
  });

  it('merges multiple class strings', () => {
    expect(cn('p-4', 'mt-2')).toBe('p-4 mt-2' as Str);
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8' as Str);
  });

  it('resolves conflicting text colors', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500' as Str);
  });

  it('resolves Tailwind conflicts with mixed classes', () => {
    const result: Str = cn('px-4 py-2', 'px-6');
    expect(result).toContain('px-6');
    expect(result).not.toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles conditional values via clsx (truthy)', () => {
    const isActive: boolean = true;
    const result: Str = cn('text-red-500', isActive && 'text-blue-500');
    expect(result).toContain('text-blue-500');
    expect(result).not.toContain('text-red-500');
  });

  it('ignores falsy conditional values', () => {
    const isActive: boolean = false;
    const result: Str = cn('text-red-500', isActive && 'text-blue-500');
    expect(result).toBe('text-red-500' as Str);
  });

  it('handles falsy inputs (false, 0, empty string)', () => {
    expect(cn('p-4', false, 'mb-3')).toBe('p-4 mb-3' as Str);
    expect(cn('p-4', 0, 'mb-3')).toBe('p-4 mb-3' as Str);
    expect(cn('p-4', '', 'mb-3')).toBe('p-4 mb-3' as Str);
  });

  it('handles undefined and null values gracefully', () => {
    expect(cn('p-4', undefined, null, 'mt-2')).toBe('p-4 mt-2' as Str);
  });

  it('handles array input', () => {
    expect(cn(['p-4', 'mt-2'])).toBe('p-4 mt-2' as Str);
  });

  it('handles object input (clsx style)', () => {
    expect(cn({ 'p-4': true, 'mt-2': false, 'mb-3': true })).toBe('p-4 mb-3' as Str);
  });

  it('merges complex mix of inputs', () => {
    const result: Str = cn('base', ['arr-1', 'arr-2'], { conditional: true }, undefined);
    expect(result).toBe('base arr-1 arr-2 conditional' as Str);
  });

  it('resolves conflicting Tailwind modifiers', () => {
    const result: Str = cn('hover:bg-red-500', 'hover:bg-blue-500');
    expect(result).toContain('hover:bg-blue-500');
    expect(result).not.toContain('hover:bg-red-500');
  });
});
