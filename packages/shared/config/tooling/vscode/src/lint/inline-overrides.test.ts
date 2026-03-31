/**
 * Tests for Inline Severity Override Decorations.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { InlineOverrideDecorator } from './inline-overrides';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEditor(text: string): any {
  return {
    document: {
      uri: vscode.Uri.file('/test/file.ts'),
      getText: () => text,
      positionAt: (offset: number) => {
        let line = 0;
        let col = 0;
        for (let i = 0; i < offset && i < text.length; i++) {
          if (text[i] === '\n') {
            line++;
            col = 0;
          } else {
            col++;
          }
        }
        return new vscode.Position(line, col);
      },
    },
    setDecorations: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InlineOverrideDecorator', () => {
  let decorator: InlineOverrideDecorator;

  beforeEach(() => {
    vi.clearAllMocks();
    decorator = new InlineOverrideDecorator();
  });

  afterEach(() => {
    decorator.dispose();
  });

  it('detects resist-lint-disable comments', () => {
    const text = '// resist-lint-disable: no-console\nconst x = 1;';
    const count = decorator.countOverrides(text);
    expect(count).toBe(1);
  });

  it('detects resist-lint-disable-next-line comments', () => {
    const text = '// resist-lint-disable-next-line: no-var\nvar x = 1;';
    const count = decorator.countOverrides(text);
    expect(count).toBe(1);
  });

  it('detects multiple override comments', () => {
    const text = [
      '// resist-lint-disable: no-console',
      'console.log("hi");',
      '// resist-lint-disable-next-line: no-var',
      'var x = 1;',
      '// resist-lint-disable',
    ].join('\n');

    const count = decorator.countOverrides(text);
    expect(count).toBe(3);
  });

  it('returns zero for files without overrides', () => {
    const text = 'const x = 1;\n// regular comment\nlet y = 2;';
    const count = decorator.countOverrides(text);
    expect(count).toBe(0);
  });

  it('applies decorations to editor', () => {
    const text = '// resist-lint-disable: no-console\nconst x = 1;';
    const editor = createMockEditor(text);

    decorator.updateDecorations(editor);

    expect(editor.setDecorations).toHaveBeenCalledTimes(1);
    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(1);
    expect(decorations[0].hoverMessage).toContain('resist-lint');
  });

  it('applies no decorations for clean files', () => {
    const text = 'const x = 1;';
    const editor = createMockEditor(text);

    decorator.updateDecorations(editor);

    expect(editor.setDecorations).toHaveBeenCalledTimes(1);
    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(0);
  });

  it('disposes without error', () => {
    decorator.dispose();
    expect(true).toBe(true);
  });
});
