/**
 * Tests for Inline Severity Override Decorations.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { InlineOverrideDecorator } from './inline-overrides';
import { DISABLE_FILE_PREFIX, DISABLE_NEXT_LINE_PREFIX } from '../shared/brand';

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

  it('detects disable comments', () => {
    const text = `// ${DISABLE_FILE_PREFIX}: no-console\nconst x = 1;`;
    const count = decorator.countOverrides(text);
    expect(count).toBe(1);
  });

  it('detects disable-next-line comments', () => {
    const text = `// ${DISABLE_NEXT_LINE_PREFIX}: no-var\nvar x = 1;`;
    const count = decorator.countOverrides(text);
    expect(count).toBe(1);
  });

  it('detects multiple override comments', () => {
    const text = [
      `// ${DISABLE_FILE_PREFIX}: no-console`,
      'console.log("hi");',
      `// ${DISABLE_NEXT_LINE_PREFIX}: no-var`,
      'var x = 1;',
      `// ${DISABLE_FILE_PREFIX}`,
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
    const text = `// ${DISABLE_FILE_PREFIX}: no-console\nconst x = 1;`;
    const editor = createMockEditor(text);

    decorator.updateDecorations(editor);

    expect(editor.setDecorations).toHaveBeenCalledTimes(1);
    const decorations = editor.setDecorations.mock.calls[0][1];
    expect(decorations).toHaveLength(1);
    expect(decorations[0].hoverMessage).toContain(DISABLE_FILE_PREFIX);
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
