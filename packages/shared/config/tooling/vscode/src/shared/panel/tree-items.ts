/**
 * Tree Item Classes
 *
 * Typed tree item models for the sidebar panel. Each class extends
 * `vscode.TreeItem` and sets the correct icon, label, and context value
 * for its role in the tree hierarchy.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

import * as vscode from 'vscode';
import type { ToolState } from '../state';
import type { DiagnosticData } from '../../lint/provider';
import { cleanExample } from '../../lint/hover';
import { en } from '../../locale/en';
import { format } from '../../locale/schema';
import { COMMANDS } from '../brand';

// =============================================================================
// Types
// =============================================================================

/** Discriminant for tree item kinds. */
export type TreeItemKind =
  | 'section'
  | 'tool-status'
  | 'file-diagnostic'
  | 'rule-group'
  | 'diagnostic-detail'
  | 'placeholder';

/** Tool key for panel sections. */
export type ToolKey = 'lint' | 'format' | 'test' | 'benchmark' | 'e2e';

// =============================================================================
// Constants
// =============================================================================

/** Codicon IDs for each section. */
const SECTION_ICONS: Record<ToolKey, string> = {
  lint: 'checklist',
  format: 'symbol-color',
  test: 'beaker',
  benchmark: 'rocket',
  e2e: 'globe',
};

/** Codicon IDs for each tool state. */
const STATE_ICONS: Record<ToolState, string> = {
  ready: 'pass-filled',
  running: 'sync~spin',
  error: 'error',
  disabled: 'circle-slash',
  'not-installed': 'circle-slash',
};

/** Labels for each tool state from locale. */
const STATE_LABELS: Record<ToolState, string> = {
  ready: en.panel.stateReady,
  running: en.panel.stateRunning,
  error: en.panel.stateError,
  disabled: en.panel.stateDisabled,
  'not-installed': en.panel.stateNotInstalled,
};

// =============================================================================
// Section Item
// =============================================================================

/**
 * Collapsible section header in the panel tree.
 *
 * Represents a tool category (Linting, Formatting, Testing).
 */
export class SectionItem extends vscode.TreeItem {
  /** Tool key for matching children in the data provider. */
  public readonly toolKey: ToolKey;

  constructor(label: string, toolKey: ToolKey) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.toolKey = toolKey;
    this.contextValue = 'resist.section';
    this.iconPath = new vscode.ThemeIcon(SECTION_ICONS[toolKey]);
  }
}

// =============================================================================
// Tool Status Item
// =============================================================================

/**
 * Displays the current state of a tool (ready, running, error, etc.).
 *
 * When in error state, clicking triggers a restart command.
 */
// oxlint-disable-next-line max-classes-per-file
export class ToolStatusItem extends vscode.TreeItem {
  constructor(state: ToolState) {
    super(STATE_LABELS[state], vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(STATE_ICONS[state]);

    if (state === 'error') {
      this.contextValue = 'resist.toolError';
      this.command = {
        title: en.panel.restartAction,
        command: COMMANDS.restart,
      };
    } else {
      this.contextValue = 'resist.toolStatus';
    }
  }
}

// =============================================================================
// File Diagnostic Item
// =============================================================================

/**
 * A file with diagnostic issues.
 *
 * Shows filename, error/warning counts. Expandable to show individual
 * diagnostics as children. Clicking opens the file in the editor.
 */
// oxlint-disable-next-line max-classes-per-file
export class FileDiagnosticItem extends vscode.TreeItem {
  /** The file URI for this diagnostic group. */
  public readonly fileUri: vscode.Uri;

  /** Individual diagnostics for this file (used by provider for children). */
  public readonly diagnostics: readonly vscode.Diagnostic[];

  constructor(
    uri: vscode.Uri,
    errors: number,
    warnings: number,
    diagnostics: readonly vscode.Diagnostic[],
  ) {
    const basename: string = uri.fsPath.split('/').pop() ?? uri.fsPath;
    super(basename, vscode.TreeItemCollapsibleState.Collapsed);

    this.fileUri = uri;
    this.diagnostics = diagnostics;
    this.description = format(en.panel.fileIssueCount, { errors, warnings });
    this.resourceUri = uri;
    this.contextValue = 'resist.fileDiagnostic';
    this.command = {
      title: en.panel.openFileAction,
      command: 'vscode.open',
      arguments: [uri],
    };
  }
}

// =============================================================================
// Rule Group Item
// =============================================================================

/**
 * Groups diagnostics by rule ID under a file node.
 *
 * Label shows the rule ID, description shows the issue count,
 * and icon reflects the highest severity in the group.
 */
// oxlint-disable-next-line max-classes-per-file
export class RuleGroupItem extends vscode.TreeItem {
  /** The file URI containing these diagnostics. */
  public readonly fileUri: vscode.Uri;

  /** Diagnostics grouped under this rule. */
  public readonly diagnostics: readonly vscode.Diagnostic[];

  /** The rule ID for this group. */
  public readonly ruleId: string;

  constructor(ruleId: string, fileUri: vscode.Uri, diagnostics: readonly vscode.Diagnostic[]) {
    super(ruleId, vscode.TreeItemCollapsibleState.Collapsed);
    this.ruleId = ruleId;
    this.fileUri = fileUri;
    this.diagnostics = diagnostics;
    this.description = format(en.panel.ruleGroupCount, { count: diagnostics.length });
    this.contextValue = 'resist.ruleGroup';

    // Icon: error if any errors, otherwise warning
    const hasError = diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error);
    this.iconPath = new vscode.ThemeIcon(hasError ? 'error' : 'warning');
  }
}

// =============================================================================
// Diagnostic Detail Item
// =============================================================================

/** Codicon IDs for diagnostic severity (indexed by DiagnosticSeverity). */
const SEVERITY_ICONS: readonly string[] = [
  'error', // DiagnosticSeverity.Error
  'warning', // DiagnosticSeverity.Warning
  'info', // DiagnosticSeverity.Information
  'info', // DiagnosticSeverity.Hint
];

/**
 * An individual diagnostic within a file.
 *
 * Shows the diagnostic message, line number, severity icon, and
 * navigates to the exact location on click.
 */
// oxlint-disable-next-line max-classes-per-file
export class DiagnosticDetailItem extends vscode.TreeItem {
  /** The file URI containing this diagnostic. */
  public readonly fileUri: vscode.Uri;

  /** The diagnostic this item represents. */
  public readonly diagnostic: vscode.Diagnostic;

  constructor(diagnostic: vscode.Diagnostic, fileUri: vscode.Uri) {
    // Extract rule ID from diagnostic code
    const { code } = diagnostic;

    let ruleId: string;

    if (typeof code === 'string') {
      ruleId = code;
    } else if (typeof code === 'number') {
      ruleId = String(code);
    } else if (code && typeof code === 'object' && 'value' in code) {
      ruleId = String(code.value);
    } else {
      ruleId = '';
    }

    // Label: position + rule (short, always visible — never truncated)
    const line = diagnostic.range.start.line + 1;
    const col = diagnostic.range.start.character + 1;
    const label: string = ruleId
      ? format(en.panel.diagnosticLineWithRule, { line, col, rule: ruleId })
      : format(en.panel.diagnosticLine, { line, col });
    super(label, vscode.TreeItemCollapsibleState.None);

    this.fileUri = fileUri;
    this.diagnostic = diagnostic;

    // Description: full message (VS Code truncates with ellipsis, visible in tooltip)
    this.description = diagnostic.message;

    this.iconPath = new vscode.ThemeIcon(SEVERITY_ICONS[diagnostic.severity] ?? 'info');
    this.contextValue = 'resist.diagnosticDetail';
    this.command = {
      title: en.panel.goToLineAction,
      command: 'vscode.open',
      arguments: [fileUri, { selection: diagnostic.range }],
    };

    // Rich tooltip: matches hover popup UX
    this.tooltip = buildDiagnosticTooltip(diagnostic, ruleId);
  }
}

// =============================================================================
// Tooltip Builder
// =============================================================================

/**
 * Builds a rich MarkdownString tooltip for a diagnostic detail item.
 *
 * Shows the full message, rule ID, and supplemental data (tip, example,
 * fix indicator, docs link) matching the hover popup UX.
 *
 * @param diagnostic - The diagnostic to build a tooltip for
 * @param ruleId - The extracted rule ID string
 * @returns A MarkdownString tooltip with supplemental data
 */
function buildDiagnosticTooltip(
  diagnostic: vscode.Diagnostic,
  ruleId: string,
): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = true;
  md.supportThemeIcons = true;

  // Full message (sidebar tooltip is the only place to see this for long messages)
  const sections: string[] = [`**Message:** ${diagnostic.message}`];

  // Rule ID
  if (ruleId) {
    sections.push(`**Rule:** \`${ruleId}\``);
  }

  // Supplemental data from diagnostic
  const { data }: { data?: DiagnosticData } = diagnostic as vscode.Diagnostic & {
    data?: DiagnosticData;
  };

  if (data) {
    // Rule description
    if (data.description) {
      sections.push(`**${en.hover.descriptionLabel}:** ${data.description}`);
    }

    // Tip
    if (data.tip) {
      sections.push(`$(lightbulb) **${en.hover.tipPrefix}:** ${data.tip}`);
    }

    // Example as fenced code block (4-backtick fence so inner ``` can't break it)
    if (data.example) {
      const cleaned: string = cleanExample(data.example);

      sections.push(
        `$(code) **${en.hover.exampleLabel}:**\n\n\`\`\`\`typescript\n${cleaned}\n\`\`\`\``,
      );
    }

    // Fix available indicator
    if (data.fix && !(data.fix.range.start === data.fix.range.end && data.fix.text === '')) {
      sections.push(`$(tools) *${en.hover.fixAvailable}*`);
    }

    // Documentation link
    if (data.url) {
      sections.push(`[$(link-external) ${en.hover.viewDocs}](${data.url})`);
    }
  }

  md.appendMarkdown(sections.join('\n\n---\n\n'));
  return md;
}

// =============================================================================
// Placeholder Item
// =============================================================================

/**
 * Informational placeholder (no issues, not configured, etc.).
 */
// oxlint-disable-next-line max-classes-per-file
export class PlaceholderItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon('info');
  }
}
