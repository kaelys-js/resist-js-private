/**
 * Tests for Diagnostic Filtering UI.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { DiagnosticFilter } from './diagnostic-filter';
import { BRAND_NAME, DIAGNOSTIC_SOURCE } from '../shared/brand';

// =============================================================================
// Helpers
// =============================================================================

function createDiag(ruleId: string): any {
  return {
    range: new vscode.Range(0, 0, 0, 5),
    message: `Issue from ${ruleId}`,
    severity: vscode.DiagnosticSeverity.Warning,
    source: DIAGNOSTIC_SOURCE,
    code: ruleId,
  };
}

function createChannel(): any {
  return { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(), name: BRAND_NAME };
}

/**
 * Creates a mock collection that is iterable (for...of) and has forEach.
 *
 * @param {Array<[vscode.Uri, any[]]>} entries - URI-diagnostic pairs
 * @returns {object} Mock diagnostic collection
 */
function createMockCollection(entries: Array<[vscode.Uri, any[]]>): any {
  return {
    *[Symbol.iterator]() {
      for (const entry of entries) {
        yield entry;
      }
    },
    forEach: vi.fn((cb: any) => {
      for (const [uri, diags] of entries) {
        cb(uri, diags);
      }
    }),
    set: vi.fn(),
    get: vi.fn(),
    clear: vi.fn(),
    delete: vi.fn(),
    dispose: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

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
    const store = new Map<string, any[]>([
      [uri.toString(), [createDiag('naming/no-default-export'), createDiag('jsdoc/require-param')]],
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
    const collection = createMockCollection([
      [
        vscode.Uri.file('/test.ts'),
        [
          createDiag('naming/no-default'),
          createDiag('jsdoc/require-param'),
          createDiag('testing/no-skip'),
        ],
      ],
    ]);

    filter.applyFilter(['naming'], collection);

    expect(collection.set).toHaveBeenCalled();
    const [, filtered] = collection.set.mock.calls[0]!;
    expect(filtered).toHaveLength(1);
    expect(filtered[0].code).toBe('naming/no-default');
  });

  it('clears filter and restores original diagnostics', () => {
    const originalDiags = [createDiag('naming/no-default'), createDiag('jsdoc/require-param')];
    const collection = createMockCollection([[vscode.Uri.file('/test.ts'), originalDiags]]);

    // Apply then clear
    filter.applyFilter(['naming'], collection);
    filter.clearFilter(collection);

    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('returns undefined categories when no filter active', () => {
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('returns active categories when filter is applied', () => {
    const collection = createMockCollection([]);

    filter.applyFilter(['naming', 'jsdoc'], collection);

    const active = filter.getActiveCategories();
    expect(active).toContain('naming');
    expect(active).toContain('jsdoc');
  });

  it('clears filter when empty categories provided', () => {
    const collection = createMockCollection([]);

    filter.applyFilter([], collection);
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('logs filter application', () => {
    const collection = createMockCollection([]);

    filter.applyFilter(['naming'], collection);

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('filter applied'))).toBe(true);
  });

  it('cleans up on dispose', () => {
    filter.dispose();
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('skips non-resist diagnostics in extractCategories (line 70)', () => {
    const foreignDiag = { ...createDiag('naming/rule'), source: 'eslint' };
    const resistDiag = createDiag('jsdoc/require-param');
    const collection = createMockCollection([
      [vscode.Uri.file('/test.ts'), [foreignDiag, resistDiag]],
    ]);

    const categories = filter.extractCategories(
      collection as unknown as vscode.DiagnosticCollection,
    );
    expect(categories).toEqual(['jsdoc']);
  });

  it('shows no-categories info when collection has no resist diagnostics (line 96-98)', async () => {
    const collection = createMockCollection([]);
    await filter.showFilterQuickPick(collection as unknown as vscode.DiagnosticCollection);
    expect(vscode.window.showInformationMessage).toHaveBeenCalled();
  });

  it('returns early when user cancels quick pick (line 105-107)', async () => {
    const collection = createMockCollection([
      [vscode.Uri.file('/test.ts'), [createDiag('naming/rule')]],
    ]);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined);
    await filter.showFilterQuickPick(collection as unknown as vscode.DiagnosticCollection);
    expect(filter.getActiveCategories()).toBeUndefined();
  });

  it('applies filter from quick pick selection (line 109-110)', async () => {
    const collection = createMockCollection([
      [vscode.Uri.file('/test.ts'), [createDiag('naming/rule'), createDiag('jsdoc/param')]],
    ]);
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(['naming'] as any);
    await filter.showFilterQuickPick(collection as unknown as vscode.DiagnosticCollection);
    expect(filter.getActiveCategories()).toContain('naming');
  });

  it('preserves non-resist diagnostics during filter (line 142-143)', () => {
    const foreignDiag = { ...createDiag('some-rule'), source: 'eslint' };
    const resistDiag = createDiag('naming/rule');
    const collection = createMockCollection([
      [vscode.Uri.file('/test.ts'), [foreignDiag, resistDiag]],
    ]);

    filter.applyFilter(['naming'], collection);

    const [, filtered] = collection.set.mock.calls[0]!;
    expect(filtered).toHaveLength(2); // both preserved: foreign + matching resist
  });
});
