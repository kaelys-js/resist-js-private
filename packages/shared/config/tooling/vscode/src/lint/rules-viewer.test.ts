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
});
