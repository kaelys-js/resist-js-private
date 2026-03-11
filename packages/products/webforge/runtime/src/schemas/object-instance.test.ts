/**
 * ObjectInstance schema tests.
 *
 * Tests for thin-instance object placement validation:
 * required fields, default values, and rejection of invalid data.
 *
 * @module
 */

import { describe, expect, test } from 'vitest';

import { safeParse } from '@/utils/result/safe';
import type { Result } from '@/schemas/result/result';

import { ObjectInstanceSchema, type ObjectInstance } from './object-instance';

// =============================================================================
// Default values
// =============================================================================

describe('ObjectInstanceSchema — defaults', () => {
  test('accepts minimal valid object (id, meshType, position)', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'torch-1',
      meshType: 'torch',
      position: [10, 0, 20],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe('torch-1');
    expect(result.data.meshType).toBe('torch');
    expect(result.data.position).toEqual([10, 0, 20]);
  });

  test('applies default rotation [0, 0, 0]', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'tree-1',
      meshType: 'tree-oak',
      position: [5, 0, 5],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rotation).toEqual([0, 0, 0]);
  });

  test('applies default scale [1, 1, 1]', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'tree-1',
      meshType: 'tree-oak',
      position: [5, 0, 5],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scale).toEqual([1, 1, 1]);
  });

  test('applies default tintColor [1, 1, 1, 1]', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'tree-1',
      meshType: 'tree-oak',
      position: [5, 0, 5],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.tintColor).toEqual([1, 1, 1, 1]);
  });

  test('applies default visible true', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'tree-1',
      meshType: 'tree-oak',
      position: [5, 0, 5],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.visible).toBe(true);
  });

  test('applies default eventId and scriptHook as empty string', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'npc-1',
      meshType: 'npc-villager',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.eventId).toBe('');
    expect(result.data.scriptHook).toBe('');
  });

  test('applies default properties as empty object', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'npc-1',
      meshType: 'npc-villager',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.properties).toEqual({});
  });
});

// =============================================================================
// Explicit values
// =============================================================================

describe('ObjectInstanceSchema — explicit values', () => {
  test('accepts all fields explicitly', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'chest-42',
      meshType: 'treasure-chest',
      position: [100, 2.5, 200],
      rotation: [0, 1.57, 0],
      scale: [2, 2, 2],
      tintColor: [1, 0.5, 0.5, 0.8],
      visible: false,
      eventId: 'chest-open',
      scriptHook: 'onInteract',
      properties: { gold: 100, locked: true, label: 'Royal Chest' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.position).toEqual([100, 2.5, 200]);
    expect(result.data.rotation).toEqual([0, 1.57, 0]);
    expect(result.data.scale).toEqual([2, 2, 2]);
    expect(result.data.tintColor).toEqual([1, 0.5, 0.5, 0.8]);
    expect(result.data.visible).toBe(false);
    expect(result.data.eventId).toBe('chest-open');
    expect(result.data.properties).toEqual({ gold: 100, locked: true, label: 'Royal Chest' });
  });

  test('accepts negative position values', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      meshType: 'marker',
      position: [-50, -1, -100],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.position).toEqual([-50, -1, -100]);
  });
});

// =============================================================================
// Rejection
// =============================================================================

describe('ObjectInstanceSchema — rejection', () => {
  test('rejects missing id', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      meshType: 'torch',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(false);
  });

  test('rejects empty id', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: '',
      meshType: 'torch',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(false);
  });

  test('rejects missing meshType', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(false);
  });

  test('rejects empty meshType', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      meshType: '',
      position: [0, 0, 0],
    });
    expect(result.ok).toBe(false);
  });

  test('rejects missing position', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      meshType: 'torch',
    });
    expect(result.ok).toBe(false);
  });

  test('rejects position with wrong length (2 elements)', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      meshType: 'torch',
      position: [0, 0],
    });
    expect(result.ok).toBe(false);
  });

  test('rejects unknown properties', () => {
    const result: Result<ObjectInstance> = safeParse(ObjectInstanceSchema, {
      id: 'obj-1',
      meshType: 'torch',
      position: [0, 0, 0],
      unknownField: true,
    });
    expect(result.ok).toBe(false);
  });
});
