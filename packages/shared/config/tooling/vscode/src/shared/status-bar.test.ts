/**
 * Tests for Status Bar Management
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 13
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStatusBar, createToolStatusBar, getFileDiagnosticCounts } from './status-bar';
import * as vscode from 'vscode';
import { BRAND_NAME } from './brand';

describe('Status Bar', () => {
  let statusBarItem: ReturnType<typeof vscode.window.createStatusBarItem>;

  beforeEach(() => {
    vi.clearAllMocks();
    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    } as unknown as vscode.ExtensionContext;
    statusBarItem = createToolStatusBar(context, 'Lint');
  });

  // =========================================================================
  // Status bar text
  // =========================================================================

  it('updateStatusBar("ready") shows check icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("ready") with counts shows branded prefix with pluralized counts', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 3,
      warnings: 7,
    });
    expect(statusBarItem.text).toBe(
      `$(check) ${BRAND_NAME}: $(error) 3 errors, $(warning) 7 warnings`,
    );
  });

  it('updateStatusBar("ready") with only errors shows branded prefix with error count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 5,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}: $(error) 5 errors`);
  });

  it('updateStatusBar("ready") with only warnings shows branded prefix with warning count', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 2,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}: $(warning) 2 warnings`);
  });

  it('updateStatusBar("ready") uses singular form for count of 1', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 1,
      warnings: 1,
    });
    expect(statusBarItem.text).toBe(
      `$(check) ${BRAND_NAME}: $(error) 1 error, $(warning) 1 warning`,
    );
  });

  it('updateStatusBar("ready") with zero counts shows check', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', {
      errors: 0,
      warnings: 0,
    });
    expect(statusBarItem.text).toBe(`$(check) ${BRAND_NAME}`);
  });

  it('updateStatusBar("linting") shows spinner', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'linting');
    expect(statusBarItem.text).toBe(`$(sync~spin) ${BRAND_NAME}: Linting...`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  it('updateStatusBar("error") shows error background', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'error');
    expect(statusBarItem.text).toBe(`$(error) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeDefined();
  });

  it('updateStatusBar("disabled") shows slash icon', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    expect(statusBarItem.text).toBe(`$(circle-slash) ${BRAND_NAME}`);
    expect(statusBarItem.backgroundColor).toBeUndefined();
  });

  // =========================================================================
  // Tooltip — MarkdownString setup
  // =========================================================================

  it('tooltip is a trusted MarkdownString with HTML and theme icon support', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
    expect(tooltip.isTrusted).toBe(true);
    expect(tooltip.supportHtml).toBe(true);
    expect(tooltip.supportThemeIcons).toBe(true);
  });

  // =========================================================================
  // Tooltip — VS Code MarkdownString style constraints
  //
  // VS Code only allows `style` on <span> elements. Allowed CSS properties
  // (in strict order, no spaces around `:`, trailing `;`):
  //   1. color:#hex;
  //   2. background-color:#hex;
  //   3. border-radius:Npx;
  // All other elements (td, div, table) have `style` stripped by the sanitizer.
  // Layout uses <table width="100%"> and <td align="right"> (HTML attributes).
  // =========================================================================

  it('tooltip uses style attributes only on <span> elements (VS Code sanitizer constraint)', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    // Every style= must be on a <span> — match style= preceded by tag name
    const styleMatches: RegExpMatchArray | null = tooltip.value.match(/<(\w+)\s[^>]*style="/g);

    if (styleMatches) {
      for (const match of styleMatches) {
        expect(match).toMatch(/^<span\s/);
      }
    }
  });

  it('tooltip CSS properties follow VS Code required order: color → background-color → border-radius', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', { errors: 1, warnings: 1 });
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    const styleValues: RegExpMatchArray | null = tooltip.value.match(/style="([^"]+)"/g);

    if (styleValues) {
      for (const attr of styleValues) {
        const value: string = attr.replace('style="', '').replace('"', '');
        const props: string[] = value.split(';').filter(Boolean);

        for (const prop of props) {
          // No spaces around colon
          expect(prop).not.toMatch(/\s*:\s+/);
          expect(prop).not.toMatch(/\s+:\s*/);
          // Only allowed properties
          expect(prop).toMatch(/^(color|background-color|border-radius):/);
        }

        // Order check: if multiple props, color < background-color < border-radius
        const order: string[] = props.map((p) => p.split(':')[0]);
        const expected: string[] = ['color', 'background-color', 'border-radius'];
        const filtered: string[] = expected.filter((p) => order.includes(p));
        expect(order).toEqual(filtered);
      }
    }
  });

  // =========================================================================
  // Tooltip — Header
  // =========================================================================

  it('tooltip header has brand text with color', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('color:#4ec9b0;');
    expect(tooltip.value).toContain('<b>Resist</b>');
  });

  it('tooltip header has state badge with icon inside styled span', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('$(pass-filled) Ready');
    expect(tooltip.value).toContain('background-color:#1e3a1e;border-radius:4px;');
  });

  it('tooltip header badge has double-space horizontal padding', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('\u00a0\u00a0$(pass-filled) Ready\u00a0\u00a0');
  });

  it('tooltip header uses table with right-aligned badge cell', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('<table width="100%"><tr>');
    expect(tooltip.value).toContain('<td align="right">');
  });

  it('tooltip header badge contains icon and label together per state', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'linting');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('$(sync~spin) Linting');

    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'error');
    const errorTooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(errorTooltip.value).toContain('$(error) Error');

    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    const disabledTooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(disabledTooltip.value).toContain('$(circle-slash) Paused');
  });

  // =========================================================================
  // Tooltip — Diagnostics content
  // =========================================================================

  it('tooltip shows "No issues" when ready with no counts', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('No issues in current file');
  });

  it('tooltip shows "Analyzing" placeholder when linting', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'linting');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Analyzing');
    expect(tooltip.value).toContain('$(sync~spin)');
  });

  it('tooltip shows error placeholder when in error state', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'error');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Linter encountered an error');
  });

  it('tooltip shows paused placeholder when disabled', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Linting is paused');
  });

  it('tooltip shows error/warning counts with rounded badges', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready', { errors: 2, warnings: 3 });
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('2 errors');
    expect(tooltip.value).toContain('3 warnings');
    expect(tooltip.value).toContain('border-radius:4px;');
    expect(tooltip.value).toContain('#f14c4c');
    expect(tooltip.value).toContain('#cca700');
  });

  it('tooltip uses --- separators between header, content, and footer', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    const separators: RegExpMatchArray | null = tooltip.value.match(/---/g);
    expect(separators).toHaveLength(2);
  });

  it('tooltip footer uses br for second row of buttons', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('<br>');
  });

  // =========================================================================
  // Tooltip — Footer actions
  // =========================================================================

  it('tooltip footer buttons have rounded background spans', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('background-color:#404854;border-radius:4px;');
  });

  it('tooltip footer buttons use command: links for clickable actions', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('href="command:resist.lint.toggleEnable"');
    expect(tooltip.value).toContain('href="command:resist.lint.restart"');
    expect(tooltip.value).toContain('href="command:resist.lint.showOutput"');
    expect(tooltip.value).toContain('href="command:resist.lint.file"');
    expect(tooltip.value).toContain('href="command:resist.lint.fix"');
    expect(tooltip.value).toContain('href="command:resist.lint.workspace"');
  });

  it('tooltip footer has all 6 action labels', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Pause');
    expect(tooltip.value).toContain('Restart');
    expect(tooltip.value).toContain('Output');
    expect(tooltip.value).toContain('Lint File');
    expect(tooltip.value).toContain('Fix All');
    expect(tooltip.value).toContain('Lint Workspace');
  });

  it('tooltip footer buttons have double-space padding with icon inside', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    // Icon and link inside span with double \u00a0\u00a0 padding
    expect(tooltip.value).toContain('\u00a0\u00a0$(debug-pause)');
    expect(tooltip.value).toContain(`background-color:#404854;border-radius:4px;`);
  });

  it('tooltip footer shows Resume when disabled, Pause when ready', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'disabled');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('Resume');
    expect(tooltip.value).not.toContain('Pause linting');

    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const readyTooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(readyTooltip.value).toContain('Pause');
  });

  it('tooltip footer buttons have title attributes for hover tooltips', () => {
    updateStatusBar(statusBarItem as vscode.StatusBarItem, 'ready');
    const tooltip = statusBarItem.tooltip as vscode.MarkdownString;
    expect(tooltip.value).toContain('title="Pause linting"');
    expect(tooltip.value).toContain('title="Clear cache and re-lint"');
    expect(tooltip.value).toContain('title="Lint entire workspace"');
  });

  // =========================================================================
  // getFileDiagnosticCounts
  // =========================================================================

  it('getFileDiagnosticCounts counts errors and warnings', () => {
    const collection = vscode.languages.createDiagnosticCollection('test');
    const uri = vscode.Uri.file('/test.ts');
    const range = new vscode.Range(0, 0, 0, 1);

    const diags = [
      new vscode.Diagnostic(range, 'err1', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'err2', vscode.DiagnosticSeverity.Error),
      new vscode.Diagnostic(range, 'warn1', vscode.DiagnosticSeverity.Warning),
      new vscode.Diagnostic(range, 'info1', vscode.DiagnosticSeverity.Information),
    ];

    collection.set(uri, diags);
    const counts = getFileDiagnosticCounts(
      collection as unknown as vscode.DiagnosticCollection,
      uri,
    );
    expect(counts.errors).toBe(2);
    expect(counts.warnings).toBe(1);
  });

  it('getFileDiagnosticCounts returns zeros for unknown URI', () => {
    const collection = vscode.languages.createDiagnosticCollection('test');
    const uri = vscode.Uri.file('/unknown.ts');
    const counts = getFileDiagnosticCounts(
      collection as unknown as vscode.DiagnosticCollection,
      uri,
    );
    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(0);
  });
});
