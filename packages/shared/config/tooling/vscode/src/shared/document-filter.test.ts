/**
 * Tests for Document Filter/Selector
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-60.md TASK 1
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { isWorkspaceDocument, forEachOpenDocument } from './document-filter';
import * as output from './output';

vi.mock('./output', () => ({
  logError: vi.fn(),
  log: vi.fn(),
}));

vi.mock('../locale/schema', () => ({
  format: vi.fn((template: string, params: Record<string, string | number>) => {
    let result: string = template;

    for (const [key, value] of Object.entries(params)) {
      result = result.replaceAll(`{${key}}`, String(value));
    }
    return result;
  }),
}));

vi.mock('../locale/en', () => ({
  en: {
    documentFilter: {
      iterationError: 'Document iteration failed for {file}: {error}',
    },
  },
}));

function createMockDoc(
  scheme: string,
  isUntitled: boolean,
  fsPath: string = '/test/file.ts',
): vscode.TextDocument {
  return {
    uri: { scheme, fsPath } as unknown as vscode.Uri,
    isUntitled,
  } as unknown as vscode.TextDocument;
}

describe('Document Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(vscode.workspace, 'textDocuments', {
      value: [],
      writable: true,
      configurable: true,
    });
  });

  describe('isWorkspaceDocument', () => {
    it('returns true for file scheme + not untitled', () => {
      const doc = createMockDoc('file', false);
      expect(isWorkspaceDocument(doc)).toBe(true);
    });

    it('returns false for untitled document', () => {
      const doc = createMockDoc('file', true);
      expect(isWorkspaceDocument(doc)).toBe(false);
    });

    it('returns false for git scheme', () => {
      const doc = createMockDoc('git', false);
      expect(isWorkspaceDocument(doc)).toBe(false);
    });

    it('returns false for output scheme', () => {
      const doc = createMockDoc('output', false);
      expect(isWorkspaceDocument(doc)).toBe(false);
    });
  });

  describe('forEachOpenDocument', () => {
    it('iterates matching documents', () => {
      const doc1 = createMockDoc('file', false, '/a.ts');
      const doc2 = createMockDoc('file', false, '/b.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc1, doc2],
        writable: true,
        configurable: true,
      });

      const action = vi.fn();
      forEachOpenDocument(() => true, action);

      expect(action).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledWith(doc1);
      expect(action).toHaveBeenCalledWith(doc2);
    });

    it('skips non-matching documents', () => {
      const doc1 = createMockDoc('file', false, '/a.ts');
      const doc2 = createMockDoc('git', false, '/b.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc1, doc2],
        writable: true,
        configurable: true,
      });

      const action = vi.fn();
      forEachOpenDocument((doc) => doc.uri.scheme === 'file', action);

      expect(action).toHaveBeenCalledTimes(1);
      expect(action).toHaveBeenCalledWith(doc1);
    });

    it('catches per-doc errors and continues', () => {
      const doc1 = createMockDoc('file', false, '/a.ts');
      const doc2 = createMockDoc('file', false, '/b.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc1, doc2],
        writable: true,
        configurable: true,
      });

      const action = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('boom');
        })
        .mockImplementationOnce(() => {});

      const channel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;
      forEachOpenDocument(() => true, action, channel);

      expect(action).toHaveBeenCalledTimes(2);
      expect(action).toHaveBeenCalledWith(doc2);
    });

    it('logs errors when channel is provided', () => {
      const doc = createMockDoc('file', false, '/fail.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc],
        writable: true,
        configurable: true,
      });

      const action = vi.fn(() => {
        throw new Error('test error');
      });
      const channel = { appendLine: vi.fn() } as unknown as vscode.OutputChannel;

      forEachOpenDocument(() => true, action, channel);

      expect(output.logError).toHaveBeenCalledOnce();
      expect(output.logError).toHaveBeenCalledWith(
        channel,
        'Document iteration failed for /fail.ts: test error',
      );
    });

    it('works without channel (no logging, no crash)', () => {
      const doc = createMockDoc('file', false, '/fail.ts');
      Object.defineProperty(vscode.workspace, 'textDocuments', {
        value: [doc],
        writable: true,
        configurable: true,
      });

      const action = vi.fn(() => {
        throw new Error('silent error');
      });

      expect(() => forEachOpenDocument(() => true, action)).not.toThrow();
      expect(output.logError).not.toHaveBeenCalled();
    });
  });
});
