/**
 * Tests for Diagnostic Filtering UI.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DiagnosticFilter } from './diagnostic-filter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDiag(ruleId: string): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: `Issue from ${ruleId}`,
    severity: vscode.DiagnosticSeverity.Warning,
    source: 'resist-linter',
    code: ruleId,
  };
}

function createChannel(): any {
  return { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(), name: 'Resist' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiagnosticFilter', () => {
  let filter: DiagnosticFilter;
  let channel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    channel = createChannel();
    filter = new DiagnosticFilter(channel);
  });

  afterEach(() => {
    filter.dispose();
  });

  it('extracts unique categories from diagnostics', () => {
    const collection = vscode.languages.createDiagnosticCollection('test');
    const uri = vscode.Uri.file('/test.ts');
    collection.set(uri, [
      createDiag('naming/no-default-export'),
      createDiag('naming/require-camel-case'),
      createDiag('jsdoc/require-param'),
      createDiag('naming/no-default-export'), // duplicate category
    ]);

    // Need to make forEach work with our mock
    const mockCollection = collection as any;
    const store = new Map<string, any[]>();
    store.set(uri.toString(), [
      createDiag('naming/no-default-export'),
      createDiag('jsdoc/require-param'),
    ]);
    mockCollection.forEach = vi.fn((cb: any) => {
      for (const [key, value] of store) {
        cb(vscode.Uri.file(key), value);
      }
    });

    const categories = filter.extractCategories(mockCollection);

    expect(categories).toEqual(['jsdoc', 'naming']);
  });

  it('applies category filter to diagnostics', () => {
    const collection: any = {
      forEach: vi.fn((cb: any) => {
        cb(vscode.Uri.file('/test.ts'), [
          createDiag('naming/no-default'),
          createDiag('jsdoc/require-param'),
          createDiag('testing/no-skip'),
        ]);
      }),
      set: vi.fn(),
      get: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    };

    filter.applyFilter(['naming'], collection);

    expect(collection.set).toHaveBeenCalled();
    const setCall = collection.set.mock.calls[0];
    const filtered = setCall[1];
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe('naming/no-default');
  });

  it('clears filter and restores original diagnostics', () => {
    const originalDiags = [createDiag('naming/no-default'), createDiag('jsdoc/require-param')];
    const collection: any = {
      forEach: vi.fn((cb: any) => {
        cb(vscode.Uri.file('/test.ts'), originalDiags);
      }),
      set: vi.fn(),
      get: vi.fn(),
      clear: vi.fn(),
      delete: vi.fn(),
      dispose: vi.fn(),
    };

    // Apply then clear
    filter.applyFilter(['naming'], collection);
    filter.clearFilter(collection);

    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('returns undefined categories when no filter active', () => {
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('returns active categories when filter is applied', () => {
    const collection: any = {
      forEach: vi.fn(),
      set: vi.fn(),
    };
    filter.applyFilter(['naming', 'jsdoc'], collection);

    const active = filter.getActiveCategories();
    expect(active).toContain('naming');
    expect(active).toContain('jsdoc');
  });

  it('clears filter when empty categories provided', () => {
    const collection: any = {
      forEach: vi.fn(),
      set: vi.fn(),
    };

    filter.applyFilter([], collection);
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('logs filter application', () => {
    const collection: any = { forEach: vi.fn(), set: vi.fn() };
    filter.applyFilter(['naming'], collection);

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('filter applied'))).toBe(true);
  });

  it('cleans up on dispose', () => {
    filter.dispose();
    expect(filter.getActiveCategories()).toBeUndefined();
  });
});
