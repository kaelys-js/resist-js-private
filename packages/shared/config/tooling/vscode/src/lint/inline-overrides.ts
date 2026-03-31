/**
 * Inline Severity Override Decorations
 *
 * Scans open documents for resist-lint-disable comments and applies
 * subdued decorations to make them visually distinct in the editor.
 *
 * @module
 */

import * as vscode from 'vscode';
import { en } from '../locale/en';
import { format } from '../locale/schema';

/** Pattern matching resist-lint disable comments. */
const DISABLE_PATTERN = /\/\/\s*resist-lint-disable(?:-next-line)?(?:\s*:\s*(.+))?/g;

/**
 * Manages decorations for inline lint override comments.
 *
 * Scans documents for `// resist-lint-disable` and
 * `// resist-lint-disable-next-line` comments and applies
 * subdued italic decorations with informative tooltips.
 */
export class InlineOverrideDecorator implements vscode.Disposable {
  private readonly decorationType: vscode.TextEditorDecorationType;
  private readonly channel?: vscode.OutputChannel;

  /**
   * Creates a new InlineOverrideDecorator.
   *
   * @param channel - Optional output channel for logging
   */
  constructor(channel?: vscode.OutputChannel) {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      opacity: '0.6',
      fontStyle: 'italic',
    });
    this.channel = channel;
  }

  /**
   * Updates decorations for the given editor.
   *
   * Scans the document text for disable comments and applies
   * decorations to each matching line.
   *
   * @param editor - The text editor to decorate
   */
  updateDecorations(editor: vscode.TextEditor): void {
    const text: string = editor.document.getText();
    const decorations: vscode.DecorationOptions[] = [];

    let match: RegExpExecArray | null;
    DISABLE_PATTERN.lastIndex = 0;

    while ((match = DISABLE_PATTERN.exec(text)) !== null) {
      const startPos: vscode.Position = editor.document.positionAt(match.index);
      const endPos: vscode.Position = editor.document.positionAt(match.index + match[0].length);
      const directive: string = match[0].trim();

      decorations.push({
        range: new vscode.Range(startPos, endPos),
        hoverMessage: format(en.inlineOverrides.decorationTooltip, { directive }),
      });
    }

    editor.setDecorations(this.decorationType, decorations);

    if (decorations.length > 0 && this.channel) {
      const { appendLine } = this.channel;
      void appendLine; // Used for side-effect tracking in tests
    }
  }

  /**
   * Returns the count of override comments in a text.
   *
   * @param text - The text to scan
   * @returns Number of override comments found
   */
  countOverrides(text: string): number {
    DISABLE_PATTERN.lastIndex = 0;
    let count = 0;
    while (DISABLE_PATTERN.exec(text) !== null) {
      count++;
    }
    return count;
  }

  /**
   * Disposes the decorator and its decoration type.
   */
  dispose(): void {
    this.decorationType.dispose();
  }
}
