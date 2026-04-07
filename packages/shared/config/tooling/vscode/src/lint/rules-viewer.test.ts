/**
 * Rules Viewer Tests
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseRulesOutput,
  renderRulesHtml,
  escapeHtml,
  resetPanel,
  showRulesViewer,
  type RuleSection,
} from './rules-viewer';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import * as vscode from 'vscode';

// Mock runner and workspace modules for showRulesViewer tests
vi.mock('../shared/runner', () => ({
  runToolText: vi.fn(),
}));

vi.mock('../shared/workspace', () => ({
  getBinaryPath: vi.fn(),
  getWorkspaceRoot: vi.fn(),
  clearCache: vi.fn(),
}));

// =============================================================================
// parseRulesOutput
// =============================================================================

describe('parseRulesOutput', () => {
  it('returns empty array for empty input', () => {
    const result: RuleSection[] = parseRulesOutput('');

    expect(result).toEqual([]);
  });

  it('parses a section header', () => {
    const output = 'TypeScript Rules\n\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('TypeScript Rules');
    expect(result[0]?.rules).toHaveLength(0);
  });

  it('strips trailing colon from section headers', () => {
    const output = 'TypeScript Rules:\n\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.name).toBe('TypeScript Rules');
  });

  it('parses a rule entry with severity', () => {
    const output = 'TypeScript Rules\n  no-var (error)\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules).toHaveLength(1);
    expect(result[0]?.rules[0]?.id).toBe('no-var');
    expect(result[0]?.rules[0]?.severity).toBe('error');
    expect(result[0]?.rules[0]?.fixable).toBe(false);
  });

  it('parses a fixable rule', () => {
    const output = 'Rules\n  no-var (error) [fixable]\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.fixable).toBe(true);
  });

  it('parses a non-fixable rule without fixable flag', () => {
    const output = 'Rules\n  no-var (warning)\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.fixable).toBe(false);
  });

  it('parses description lines', () => {
    const output = 'Rules\n  no-var (error)\n    Disallow var declarations\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.description).toBe('Disallow var declarations');
  });

  it('parses patterns', () => {
    const output = 'Rules\n  no-var (error)\n    Patterns: *.ts, *.tsx\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.patterns).toBe('*.ts, *.tsx');
  });

  it('parses categories and stages from combined line', () => {
    const output = 'Rules\n  no-var (error)\n    Categories: style  Stages: lint\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.categories).toBe('style');
    expect(result[0]?.rules[0]?.stages).toBe('lint');
  });

  it('parses full multi-rule block output', () => {
    const output = [
      'TypeScript Rules',
      '',
      '  no-var (error) [fixable]',
      '    Disallow var declarations',
      '    Patterns: *.ts, *.tsx',
      '    Categories: style  Stages: lint',
      '',
      '  prefer-const (warning)',
      '    Prefer const over let',
      '    Patterns: *.ts',
      '    Categories: best-practices  Stages: lint, format',
      '',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('TypeScript Rules');
    expect(result[0]?.rules).toHaveLength(2);

    const rule1 = result[0]?.rules[0];

    expect(rule1?.id).toBe('no-var');
    expect(rule1?.severity).toBe('error');
    expect(rule1?.fixable).toBe(true);
    expect(rule1?.description).toBe('Disallow var declarations');
    expect(rule1?.patterns).toBe('*.ts, *.tsx');
    expect(rule1?.categories).toBe('style');
    expect(rule1?.stages).toBe('lint');

    const rule2 = result[0]?.rules[1];

    expect(rule2?.id).toBe('prefer-const');
    expect(rule2?.severity).toBe('warning');
    expect(rule2?.fixable).toBe(false);
    expect(rule2?.stages).toBe('lint, format');
  });

  it('parses multiple sections', () => {
    const output = [
      'TypeScript Rules',
      '  no-var (error)',
      '',
      'Package Rules',
      '  pkg/name (warning)',
      '',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('TypeScript Rules');
    expect(result[1]?.name).toBe('Package Rules');
    expect(result[0]?.rules).toHaveLength(1);
    expect(result[1]?.rules).toHaveLength(1);
  });

  it('parses off severity rules', () => {
    const output = 'Rules\n  no-var (off)\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.severity).toBe('off');
  });
});

// =============================================================================
// escapeHtml
// =============================================================================

describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"hello" & \'world\'')).toBe('&quot;hello&quot; &amp; &#39;world&#39;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('does not double-escape', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });
});

// =============================================================================
// renderRulesHtml
// =============================================================================

describe('renderRulesHtml', () => {
  const nonce = 'test-nonce-123';

  const sampleSections: RuleSection[] = [
    {
      name: 'TypeScript Rules',
      rules: [
        {
          id: 'no-var',
          severity: 'error',
          fixable: true,
          description: 'Disallow var declarations',
          patterns: '*.ts, *.tsx',
          categories: 'style',
          stages: 'lint',
        },
        {
          id: 'prefer-const',
          severity: 'warning',
          fixable: false,
          description: 'Prefer const over let',
          patterns: '*.ts',
          categories: 'best-practices',
          stages: 'lint, format',
        },
        {
          id: 'old-rule',
          severity: 'off',
          fixable: false,
          description: 'Deprecated rule',
          patterns: '*.ts',
          categories: 'style',
          stages: 'lint',
        },
      ],
    },
  ];

  it('produces valid HTML document', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  it('includes CSP meta tag with nonce', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(`nonce-${nonce}`);
    expect(html).toContain(`style nonce="${nonce}"`);
    expect(html).toContain(`script nonce="${nonce}"`);
  });

  it('renders rule IDs', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('no-var');
    expect(html).toContain('prefer-const');
  });

  it('renders severity badges with correct CSS classes', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('severity-error');
    expect(html).toContain('severity-warning');
  });

  it('renders off severity badge with correct CSS class', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('severity-off');
  });

  it('renders fixable badge for fixable rules', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('badge-fixable');
    expect(html).toContain(en.rulesViewer.fixableLabel);
  });

  it('renders descriptions', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('Disallow var declarations');
    expect(html).toContain('Prefer const over let');
  });

  it('renders section headers', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('TypeScript Rules');
  });

  it('renders section count as active/total', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    // 2 active (error + warning), 3 total (includes off)
    expect(html).toContain('2/3');
  });

  it('renders search input', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('searchInput');
    expect(html).toContain(en.rulesViewer.searchPlaceholder);
  });

  it('renders collapse/expand buttons', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(en.rulesViewer.collapseAll);
    expect(html).toContain(en.rulesViewer.expandAll);
  });

  it('renders rules count', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(format(en.rulesViewer.rulesCount, { count: 3 }));
  });

  it('renders metadata pills for patterns, categories, stages', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(en.rulesViewer.patternsLabel);
    expect(html).toContain(en.rulesViewer.categoriesLabel);
    expect(html).toContain(en.rulesViewer.stagesLabel);
    expect(html).toContain('*.ts, *.tsx');
  });

  it('renders data-searchable attribute with lowercased content', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('data-searchable="no-var error');
  });

  it('renders data-severity, data-fixable, data-stages, data-categories attributes', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('data-severity="error"');
    expect(html).toContain('data-severity="warning"');
    expect(html).toContain('data-severity="off"');
    expect(html).toContain('data-fixable="true"');
    expect(html).toContain('data-fixable="false"');
    expect(html).toContain('data-stages="lint"');
    expect(html).toContain('data-categories="style"');
  });

  it('does not use inline onclick handlers (CSP-safe)', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).not.toContain('onclick=');
  });

  it('uses event delegation for section collapse', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain("e.target.closest('.section-header')");
  });

  it('escapes HTML in rule content', () => {
    const xssSection: RuleSection[] = [
      {
        name: 'Test',
        rules: [
          {
            id: '<script>alert(1)</script>',
            severity: 'error',
            fixable: false,
            description: '"><img onerror=alert(1)>',
            patterns: '',
            categories: '',
            stages: '',
          },
        ],
      },
    ];
    const html: string = renderRulesHtml(xssSection, nonce);

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;&gt;&lt;img');
  });

  it('renders empty sections gracefully', () => {
    const html: string = renderRulesHtml([], nonce);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(format(en.rulesViewer.rulesCount, { count: 0 }));
  });

  it('includes no-results element', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(en.rulesViewer.noMatchingRules);
    expect(html).toContain('noResults');
  });

  it('renders filter button', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('filterBtn');
    expect(html).toContain(en.rulesViewer.filterBtn);
  });

  it('renders filter dropdown with severity checkboxes', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('filterDropdown');
    expect(html).toContain(en.rulesViewer.severityGroup);
    expect(html).toContain('data-filter-type="severity"');
    expect(html).toContain('data-filter-value="error"');
    expect(html).toContain('data-filter-value="warning"');
    expect(html).toContain('data-filter-value="off"');
  });

  it('renders fixable-only checkbox in filter dropdown', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('data-filter-type="fixable"');
    expect(html).toContain(en.rulesViewer.fixableOnly);
  });

  it('renders stage checkboxes in filter dropdown', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(en.rulesViewer.stagesGroup);
    expect(html).toContain('data-filter-type="stage"');
    expect(html).toContain('data-filter-value="lint"');
    expect(html).toContain('data-filter-value="format"');
  });

  it('renders category checkboxes in filter dropdown', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain(en.rulesViewer.categoriesGroup);
    expect(html).toContain('data-filter-type="category"');
    expect(html).toContain('data-filter-value="style"');
    expect(html).toContain('data-filter-value="best-practices"');
  });

  it('renders clear filters button', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('clearFiltersBtn');
    expect(html).toContain(en.rulesViewer.clearFilters);
  });

  it('renders off badge with styled CSS class', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    expect(html).toContain('.severity-off');
    expect(html).toContain('severity-off');
  });

  it('severity badge checkboxes render with badge classes', () => {
    const html: string = renderRulesHtml(sampleSections, nonce);

    // Severity checkboxes in the dropdown use badge styling
    expect(html).toContain('<span class="badge severity-error">error</span>');
    expect(html).toContain('<span class="badge severity-warning">warning</span>');
    expect(html).toContain('<span class="badge severity-off">off</span>');
  });

  it('filters empty strings from stages split (line 239)', () => {
    const sections: RuleSection[] = [
      {
        name: 'Test',
        rules: [
          {
            id: 'rule-a',
            severity: 'error',
            fixable: false,
            description: '',
            patterns: '',
            categories: '',
            stages: 'lint,', // trailing comma → split produces ["lint", ""]
          },
        ],
      },
    ];
    const html: string = renderRulesHtml(sections, nonce);

    // "lint" should be present as a filter option, but not an empty string
    expect(html).toContain('data-filter-value="lint"');
    expect(html).not.toContain('data-filter-value=""');
  });

  it('filters empty strings from categories split (line 247)', () => {
    const sections: RuleSection[] = [
      {
        name: 'Test',
        rules: [
          {
            id: 'rule-b',
            severity: 'warning',
            fixable: false,
            description: '',
            patterns: '',
            categories: 'style,', // trailing comma → split produces ["style", ""]
            stages: '',
          },
        ],
      },
    ];
    const html: string = renderRulesHtml(sections, nonce);

    expect(html).toContain('data-filter-value="style"');
    // Empty category should not appear as a filter checkbox
    expect(html).not.toMatch(/data-filter-type="category" data-filter-value=""\s/);
  });
});

// =============================================================================
// showRulesViewer (WebviewPanel integration)
// =============================================================================

describe('showRulesViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPanel();
  });

  it('shows error message when no workspace folder', async () => {
    // workspaceFolders is already undefined in mock
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', { value: undefined });

    await showRulesViewer();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(en.messages.noWorkspaceFolder);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', { value: originalFolders });
  });

  it('shows error message when binary not found', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValueOnce(undefined);

    await showRulesViewer();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(en.messages.binaryNotInNodeModules);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });

  it('creates error panel when CLI fails', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValueOnce('/usr/bin/resist-lint');

    const { runToolText } = await import('../shared/runner');
    vi.mocked(runToolText).mockResolvedValueOnce({
      ok: false,
      error: 'Command failed',
      stderr: 'Command failed',
      code: 1,
    });

    await showRulesViewer();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'resist-rules',
      en.rulesViewer.title,
      vscode.ViewColumn.One,
      { enableScripts: false },
    );

    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0]?.value;
    expect(panel.webview.html).toContain('Command failed');

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });

  it('creates panel with rules HTML on success', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValueOnce('/usr/bin/resist-lint');

    const { runToolText } = await import('../shared/runner');
    vi.mocked(runToolText).mockResolvedValueOnce({
      ok: true,
      data: 'TestSection\n  my-rule (warning)\n    A test description\n',
      stderr: '',
      elapsed: 100,
    });

    await showRulesViewer();

    expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
      'resist-rules',
      en.rulesViewer.title,
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0]?.value;
    expect(panel.webview.html).toContain('my-rule');
    expect(panel.webview.html).toContain('A test description');

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });

  it('reveals existing panel instead of creating a new one', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValue('/usr/bin/resist-lint');

    const { runToolText } = await import('../shared/runner');
    vi.mocked(runToolText).mockResolvedValue({
      ok: true,
      data: 'Section\n  rule-a (error)\n',
      stderr: '',
      elapsed: 50,
    });

    // First call creates the panel
    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);

    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results[0]?.value;

    // Second call should reveal the existing panel, not create another
    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(panel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.One);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });

  it('clears currentPanel on dispose', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValue('/usr/bin/resist-lint');

    const { runToolText } = await import('../shared/runner');
    vi.mocked(runToolText).mockResolvedValue({
      ok: true,
      data: 'Section\n  rule-a (error)\n',
      stderr: '',
      elapsed: 50,
    });

    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);

    // Trigger the dispose callback that was registered
    const disposeCallback = (
      vscode.window.createWebviewPanel as unknown as { __disposeCallback: () => void }
    ).__disposeCallback;
    disposeCallback();

    // Now creating again should make a new panel, not reveal
    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });

  it('clears currentPanel on dispose after CLI failure', async () => {
    const originalFolders = vscode.workspace.workspaceFolders;
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace'), name: 'ws', index: 0 }],
      configurable: true,
    });

    const { getBinaryPath } = await import('../shared/workspace');
    vi.mocked(getBinaryPath).mockReturnValue('/usr/bin/resist-lint');

    const { runToolText } = await import('../shared/runner');
    vi.mocked(runToolText).mockResolvedValue({
      ok: false,
      error: 'CLI crashed',
      stderr: 'CLI crashed',
      code: 1,
    });

    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);

    // Trigger the dispose callback
    const disposeCallback = (
      vscode.window.createWebviewPanel as unknown as { __disposeCallback: () => void }
    ).__disposeCallback;
    disposeCallback();

    // After dispose, a new call should create a fresh panel
    await showRulesViewer();
    expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: originalFolders,
      configurable: true,
    });
  });
});

// =============================================================================
// parseRulesOutput — additional coverage
// =============================================================================

describe('parseRulesOutput — edge cases', () => {
  it('accumulates multi-line descriptions', () => {
    const output = [
      'Rules',
      '  my-rule (error)',
      '    First line of description',
      '    Second line of description',
      '    Third line of description',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.description).toBe(
      'First line of description Second line of description Third line of description',
    );
  });

  it('flushes final rule without trailing newline', () => {
    const output = 'Rules\n  final-rule (warning)';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules).toHaveLength(1);
    expect(result[0]?.rules[0]?.id).toBe('final-rule');
    expect(result[0]?.rules[0]?.severity).toBe('warning');
  });

  it('flushes current rule when a new section header appears', () => {
    const output = [
      'Section A',
      '  rule-a (error)',
      '    Description A',
      'Section B',
      '  rule-b (warning)',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result).toHaveLength(2);
    expect(result[0]?.rules).toHaveLength(1);
    expect(result[0]?.rules[0]?.id).toBe('rule-a');
    expect(result[0]?.rules[0]?.description).toBe('Description A');
    expect(result[1]?.rules).toHaveLength(1);
    expect(result[1]?.rules[0]?.id).toBe('rule-b');
  });

  it('parses lowercase patterns: prefix', () => {
    const output = 'Rules\n  my-rule (error)\n    patterns: *.js, *.jsx\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.patterns).toBe('*.js, *.jsx');
  });

  it('parses lowercase categories: and stages: prefixes', () => {
    const output = 'Rules\n  my-rule (error)\n    categories: perf  stages: build\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.categories).toBe('perf');
    expect(result[0]?.rules[0]?.stages).toBe('build');
  });

  it('flushes previous rule when a new rule line is encountered', () => {
    const output = [
      'Rules',
      '  rule-one (error)',
      '    First rule description',
      '  rule-two (warning) [fixable]',
      '    Second rule description',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules).toHaveLength(2);
    expect(result[0]?.rules[0]?.id).toBe('rule-one');
    expect(result[0]?.rules[0]?.description).toBe('First rule description');
    expect(result[0]?.rules[1]?.id).toBe('rule-two');
    expect(result[0]?.rules[1]?.fixable).toBe(true);
    expect(result[0]?.rules[1]?.description).toBe('Second rule description');
  });

  it('handles categories-only line without stages', () => {
    const output = 'Rules\n  my-rule (error)\n    Categories: accessibility\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.categories).toBe('accessibility');
    expect(result[0]?.rules[0]?.stages).toBe('');
  });

  it('handles output with only whitespace lines between rules', () => {
    const output = [
      'Rules',
      '',
      '  rule-a (error)',
      '    Description A',
      '',
      '  rule-b (warning)',
      '    Description B',
      '',
    ].join('\n');
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules).toHaveLength(2);
    expect(result[0]?.rules[0]?.id).toBe('rule-a');
    expect(result[0]?.rules[1]?.id).toBe('rule-b');
  });

  it('defaults empty fields for rule with no detail lines', () => {
    const output = 'Rules\n  bare-rule (info)\n';
    const result: RuleSection[] = parseRulesOutput(output);

    const rule = result[0]?.rules[0];
    expect(rule?.id).toBe('bare-rule');
    expect(rule?.severity).toBe('info');
    expect(rule?.fixable).toBe(false);
    expect(rule?.description).toBe('');
    expect(rule?.patterns).toBe('');
    expect(rule?.categories).toBe('');
    expect(rule?.stages).toBe('');
  });

  it('skips unrecognized parts in combined categories/stages line (line 146-148)', () => {
    // "Extra: stuff" is neither categories: nor stages:, so it is silently skipped
    const output = 'Rules\n  my-rule (error)\n    Categories: perf  Stages: ci  Extra: ignored\n';
    const result: RuleSection[] = parseRulesOutput(output);

    expect(result[0]?.rules[0]?.categories).toBe('perf');
    expect(result[0]?.rules[0]?.stages).toBe('ci');
  });
});
