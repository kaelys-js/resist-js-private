/**
 * Rules Viewer
 *
 * Opens a WebviewPanel showing all lint rules in a beautiful HTML page
 * with search, collapsible sections, severity badges, and theme-aware
 * styling via VS Code CSS variables.
 *
 * @module
 */

import * as vscode from 'vscode';
import { runToolText } from '../shared/runner';
import { getBinaryPath } from '../shared/workspace';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { BINARY_NAME, RULES_SCHEME } from '../shared/brand';

// =============================================================================
// Types
// =============================================================================

/** A single lint rule parsed from CLI output. */
export type RuleEntry = {
  /** Rule identifier (e.g. 'jsdoc/require-param'). */
  readonly id: string;
  /** Severity level (error, warning, info). */
  readonly severity: string;
  /** Whether the rule provides auto-fixes. */
  readonly fixable: boolean;
  /** Human-readable description of the rule. */
  readonly description: string;
  /** File glob patterns this rule applies to. */
  readonly patterns: string;
  /** Rule categories (e.g. 'style', 'best-practices'). */
  readonly categories: string;
  /** Pipeline stages where this rule runs. */
  readonly stages: string;
};

/** A named group of lint rules (e.g. 'TypeScript Rules'). */
export type RuleSection = {
  /** Section heading (e.g. 'TypeScript Rules'). */
  readonly name: string;
  /** Rules belonging to this section. */
  readonly rules: RuleEntry[];
};

// =============================================================================
// Parser
// =============================================================================

/**
 * Parses CLI `--list-rules` text output into structured rule data.
 *
 * The CLI output format is:
 * ```
 * Section Header
 *
 *   rule-id (severity) [fixable]
 *     Description text
 *     Patterns: *.ts, *.tsx
 *     Categories: style  Stages: lint
 * ```
 *
 * @example
 * ```typescript
 * const sections = parseRulesOutput(cliOutput);
 * // sections[0].name === 'TypeScript Rules'
 * // sections[0].rules[0].id === 'no-var'
 * ```
 *
 * @param {string} output - Raw CLI text output from `resist-lint --list-rules`
 * @returns {RuleSection[]} Structured rule sections
 */
export function parseRulesOutput(output: string): RuleSection[] {
  const lines: string[] = output.split('\n');
  const sections: RuleSection[] = [];
  let currentSection: { name: string; rules: RuleEntry[] } | undefined;
  let currentRule:
    | {
        id: string;
        severity: string;
        fixable: boolean;
        description: string;
        patterns: string;
        categories: string;
        stages: string;
      }
    | undefined;

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }

    // Section headers: lines that don't start with whitespace
    if (line.length > 0 && line[0] !== ' ') {
      // Flush current rule into current section
      if (currentRule && currentSection) {
        currentSection.rules.push({ ...currentRule });
        currentRule = undefined;
      }

      currentSection = { name: line.trim().replace(/:$/, ''), rules: [] };
      sections.push(currentSection);
      continue;
    }

    // Rule line: "  rule-id (severity) [fixable]"
    const ruleMatch: RegExpMatchArray | null = line.match(
      /^\s{2}(\S+)\s+\((\w+)\)(\s+\[fixable\])?$/,
    );

    if (ruleMatch) {
      // Flush previous rule
      if (currentRule && currentSection) {
        currentSection.rules.push({ ...currentRule });
      }

      currentRule = {
        id: ruleMatch[1] ?? '',
        severity: ruleMatch[2] ?? '',
        fixable: Boolean(ruleMatch[3]),
        description: '',
        patterns: '',
        categories: '',
        stages: '',
      };
      continue;
    }

    // Indented detail lines (description, patterns, categories, stages)
    if (currentRule) {
      const trimmed: string = line.trim();

      if (trimmed.startsWith('Patterns:') || trimmed.startsWith('patterns:')) {
        currentRule.patterns = trimmed.replace(/^[Pp]atterns:\s*/, '');
      } else if (trimmed.startsWith('Categories:') || trimmed.startsWith('categories:')) {
        // "Categories: style  Stages: lint" — split on double space
        const parts: string[] = trimmed.split(/\s{2,}/);

        for (const part of parts) {
          if (part.toLowerCase().startsWith('categories:')) {
            currentRule.categories = part.replace(/^[Cc]ategories:\s*/, '');
          } else if (part.toLowerCase().startsWith('stages:')) {
            currentRule.stages = part.replace(/^[Ss]tages:\s*/, '');
          }
        }
      } else if (trimmed.length > 0) {
        // Description line — append (rules may have multi-line descriptions)
        currentRule.description = currentRule.description
          ? `${currentRule.description} ${trimmed}`
          : trimmed;
      }
    }
  }

  // Flush final rule
  if (currentRule && currentSection) {
    currentSection.rules.push({ ...currentRule });
  }

  return sections;
}

// =============================================================================
// HTML Renderer
// =============================================================================

/**
 * Escapes HTML special characters to prevent XSS in webview content.
 *
 * @param {string} text - Raw text to escape
 * @returns {string} HTML-safe text
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("xss")</script>');
 * // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Generates a cryptographic nonce for Content Security Policy.
 *
 * @returns {string} A 32-character hex nonce
 *
 * @example
 * ```typescript
 * const nonce = getNonce();
 * // '4a3f2b1c8d9e0f7a6b5c4d3e2f1a0b9c'
 * ```
 */
export function getNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);

  return Array.from(array, (b: number) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Renders structured rule data into a complete HTML document.
 *
 * Uses VS Code CSS variables (`--vscode-*`) for native theme integration.
 * Includes inline CSS and client-side JavaScript for search/filter and
 * collapsible sections.
 *
 * @param {RuleSection[]} sections - Parsed rule sections
 * @param {string} nonce - CSP nonce for inline script/style tags
 * @returns {string} Complete HTML document string
 *
 * @example
 * ```typescript
 * const sections = parseRulesOutput(cliOutput);
 * const html = renderRulesHtml(sections, 'abc123');
 * panel.webview.html = html;
 * ```
 */
export function renderRulesHtml(sections: RuleSection[], nonce: string): string {
  const totalRules: number = sections.reduce((sum, s) => sum + s.rules.length, 0);

  // Collect unique stages and categories for filter dropdown
  const allStages = new Set<string>();
  const allCategories = new Set<string>();

  for (const section of sections) {
    for (const rule of section.rules) {
      if (rule.stages) {
        for (const s of rule.stages.split(/,\s*/)) {
          if (s) allStages.add(s);
        }
      }

      if (rule.categories) {
        for (const c of rule.categories.split(/,\s*/)) {
          if (c) allCategories.add(c);
        }
      }
    }
  }

  const sortedStages: string[] = [...allStages].sort();
  const sortedCategories: string[] = [...allCategories].sort();

  const sectionHtml: string = sections
    .map((section) => {
      const activeCount: number = section.rules.filter((r) => r.severity !== 'off').length;

      const rulesHtml: string = section.rules
        .map((rule) => {
          const severityClass: string = `severity-${escapeHtml(rule.severity)}`;
          const fixableBadge: string = rule.fixable
            ? `<span class="badge badge-fixable">${escapeHtml(en.rulesViewer.fixableLabel)}</span>`
            : '';
          const searchable: string = [
            rule.id,
            rule.severity,
            rule.description,
            rule.patterns,
            rule.categories,
            rule.stages,
          ]
            .join(' ')
            .toLowerCase();

          const metaPills: string[] = [];

          if (rule.patterns) {
            metaPills.push(
              `<span class="meta-pill"><strong>${escapeHtml(en.rulesViewer.patternsLabel)}:</strong> ${escapeHtml(rule.patterns)}</span>`,
            );
          }

          if (rule.categories) {
            metaPills.push(
              `<span class="meta-pill"><strong>${escapeHtml(en.rulesViewer.categoriesLabel)}:</strong> ${escapeHtml(rule.categories)}</span>`,
            );
          }

          if (rule.stages) {
            metaPills.push(
              `<span class="meta-pill"><strong>${escapeHtml(en.rulesViewer.stagesLabel)}:</strong> ${escapeHtml(rule.stages)}</span>`,
            );
          }

          return `<div class="rule-card" data-searchable="${escapeHtml(searchable)}" data-severity="${escapeHtml(rule.severity)}" data-fixable="${rule.fixable ? 'true' : 'false'}" data-stages="${escapeHtml(rule.stages)}" data-categories="${escapeHtml(rule.categories)}">
  <div class="rule-header">
    <code class="rule-id">${escapeHtml(rule.id)}</code>
    <span class="badge ${severityClass}">${escapeHtml(rule.severity)}</span>
    ${fixableBadge}
  </div>
  ${rule.description ? `<p class="rule-description">${escapeHtml(rule.description)}</p>` : ''}
  ${metaPills.length > 0 ? `<div class="rule-meta">${metaPills.join('\n    ')}</div>` : ''}
</div>`;
        })
        .join('\n');

      return `<div class="section" data-section>
  <button class="section-header" aria-expanded="true">
    <span class="section-chevron">&#9660;</span>
    <h2>${escapeHtml(section.name)}</h2>
    <span class="section-count">${activeCount}/${section.rules.length}</span>
  </button>
  <div class="section-body">
    ${rulesHtml}
  </div>
</div>`;
    })
    .join('\n');

  // Build filter dropdown checkbox HTML
  const severityChecks: string = ['error', 'warning', 'off']
    .map(
      (s) =>
        `<label class="filter-option"><input type="checkbox" class="filter-cb" data-filter-type="severity" data-filter-value="${s}" checked /><span class="badge severity-${s}">${s}</span></label>`,
    )
    .join('\n          ');

  const stageChecks: string = sortedStages
    .map(
      (s) =>
        `<label class="filter-option"><input type="checkbox" class="filter-cb" data-filter-type="stage" data-filter-value="${escapeHtml(s)}" checked />${escapeHtml(s)}</label>`,
    )
    .join('\n          ');

  const categoryChecks: string = sortedCategories
    .map(
      (c) =>
        `<label class="filter-option"><input type="checkbox" class="filter-cb" data-filter-type="category" data-filter-value="${escapeHtml(c)}" checked />${escapeHtml(c)}</label>`,
    )
    .join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>${escapeHtml(en.rulesViewer.title)}</title>
  <style nonce="${nonce}">
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.5;
      padding: 0;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border));
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-input {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid var(--vscode-input-border, var(--vscode-editorGroup-border));
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: inherit;
      font-size: inherit;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .toolbar-btn {
      padding: 4px 10px;
      border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-editorGroup-border));
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground, transparent);
      color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }

    .toolbar-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
    }

    .toolbar-btn.active {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-activeSelectionBackground, var(--vscode-button-secondaryHoverBackground));
      color: var(--vscode-list-activeSelectionForeground, var(--vscode-editor-foreground));
    }

    .rules-count {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }

    /* Filter dropdown */
    .filter-wrapper {
      position: relative;
    }

    .filter-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      min-width: 240px;
      max-height: 420px;
      overflow-y: auto;
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border, var(--vscode-editorGroup-border)));
      border-radius: 6px;
      padding: 8px 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 20;
    }

    .filter-dropdown.open {
      display: block;
    }

    .filter-group-label {
      padding: 6px 14px 2px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
    }

    .filter-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 14px;
      cursor: pointer;
      font-size: 12px;
    }

    .filter-option:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .filter-option input[type="checkbox"] {
      accent-color: var(--vscode-focusBorder);
    }

    .filter-divider {
      height: 1px;
      margin: 6px 0;
      background: var(--vscode-panel-border, var(--vscode-editorGroup-border));
    }

    .filter-footer {
      padding: 6px 14px 4px;
    }

    .filter-footer button {
      padding: 3px 10px;
      border: none;
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground, transparent);
      color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
      font-family: inherit;
      font-size: 11px;
      cursor: pointer;
    }

    .filter-footer button:hover {
      background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px 20px 40px;
    }

    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      display: none;
    }

    .section {
      margin-bottom: 8px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: 6px;
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      color: var(--vscode-editor-foreground);
      font-family: inherit;
      font-size: inherit;
      cursor: pointer;
      text-align: left;
    }

    .section-header:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .section-header h2 {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    .section-chevron {
      font-size: 10px;
      transition: transform 0.15s ease;
      color: var(--vscode-descriptionForeground);
    }

    .section-header[aria-expanded="false"] .section-chevron {
      transform: rotate(-90deg);
    }

    .section-count {
      font-size: 11px;
      padding: 1px 8px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    .section-body {
      padding: 4px 0 4px 12px;
    }

    .section-header[aria-expanded="false"] + .section-body {
      display: none;
    }

    .rule-card {
      padding: 12px 16px;
      margin: 4px 0;
      border-radius: 6px;
      border: 1px solid var(--vscode-panel-border, var(--vscode-editorGroup-border, transparent));
      background: var(--vscode-editor-background);
      transition: background 0.1s ease;
    }

    .rule-card:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .rule-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .rule-id {
      font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', monospace);
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }

    .badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .severity-error {
      background: rgba(244, 67, 54, 0.15);
      color: var(--vscode-errorForeground, #f44336);
    }

    .severity-warning {
      background: rgba(255, 152, 0, 0.15);
      color: var(--vscode-editorWarning-foreground, #ff9800);
    }

    .severity-off {
      background: rgba(150, 150, 150, 0.15);
      color: var(--vscode-disabledForeground, #888);
    }

    .severity-info {
      background: rgba(33, 150, 243, 0.15);
      color: var(--vscode-editorInfo-foreground, #2196f3);
    }

    .badge-fixable {
      background: rgba(76, 175, 80, 0.15);
      color: var(--vscode-terminal-ansiGreen, #4caf50);
    }

    .rule-description {
      margin-top: 6px;
      color: var(--vscode-editor-foreground);
      opacity: 0.85;
    }

    .rule-meta {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .meta-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      opacity: 0.8;
    }

    .meta-pill strong {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <input
      type="text"
      class="search-input"
      id="searchInput"
      placeholder="${escapeHtml(en.rulesViewer.searchPlaceholder)}"
      autocomplete="off"
      spellcheck="false"
    />
    <div class="filter-wrapper">
      <button class="toolbar-btn" id="filterBtn">${escapeHtml(en.rulesViewer.filterBtn)}</button>
      <div class="filter-dropdown" id="filterDropdown">
        <div class="filter-group-label">${escapeHtml(en.rulesViewer.severityGroup)}</div>
        ${severityChecks}
        <label class="filter-option"><input type="checkbox" class="filter-cb" data-filter-type="fixable" />${escapeHtml(en.rulesViewer.fixableOnly)}</label>
        ${sortedStages.length > 0 ? `<div class="filter-divider"></div>\n        <div class="filter-group-label">${escapeHtml(en.rulesViewer.stagesGroup)}</div>\n        ${stageChecks}` : ''}
        ${sortedCategories.length > 0 ? `<div class="filter-divider"></div>\n        <div class="filter-group-label">${escapeHtml(en.rulesViewer.categoriesGroup)}</div>\n        ${categoryChecks}` : ''}
        <div class="filter-divider"></div>
        <div class="filter-footer"><button id="clearFiltersBtn">${escapeHtml(en.rulesViewer.clearFilters)}</button></div>
      </div>
    </div>
    <button class="toolbar-btn" id="collapseAllBtn">${escapeHtml(en.rulesViewer.collapseAll)}</button>
    <button class="toolbar-btn" id="expandAllBtn">${escapeHtml(en.rulesViewer.expandAll)}</button>
    <span class="rules-count" id="rulesCount">${format(en.rulesViewer.rulesCount, { count: totalRules })}</span>
  </div>

  <div class="container">
    <div class="no-results" id="noResults">${escapeHtml(en.rulesViewer.noMatchingRules)}</div>
    ${sectionHtml}
  </div>

  <script nonce="${nonce}">
    (function() {
      var searchInput = document.getElementById('searchInput');
      var noResults = document.getElementById('noResults');
      var rulesCount = document.getElementById('rulesCount');
      var filterBtn = document.getElementById('filterBtn');
      var filterDropdown = document.getElementById('filterDropdown');
      var clearFiltersBtn = document.getElementById('clearFiltersBtn');
      var cards = document.querySelectorAll('.rule-card');
      var sectionEls = document.querySelectorAll('[data-section]');
      var totalRules = ${totalRules};

      /* Section collapse via event delegation (CSP-safe) */
      document.addEventListener('click', function(e) {
        var header = e.target.closest('.section-header');
        if (header) {
          var expanded = header.getAttribute('aria-expanded') === 'true';
          header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });

      /* Filter dropdown toggle */
      filterBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = filterDropdown.classList.contains('open');
        filterDropdown.classList.toggle('open');
        filterBtn.classList.toggle('active', !isOpen);
      });

      /* Close dropdown on outside click */
      document.addEventListener('click', function(e) {
        if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
          filterDropdown.classList.remove('open');
          filterBtn.classList.remove('active');
        }
      });

      /* Stop dropdown clicks from closing it */
      filterDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });

      /* Unified filter + search logic */
      function applyFilters() {
        var query = searchInput.value.toLowerCase().trim();

        /* Gather checked severities */
        var sevCbs = filterDropdown.querySelectorAll('[data-filter-type="severity"]');
        var activeSev = [];
        sevCbs.forEach(function(cb) { if (cb.checked) activeSev.push(cb.getAttribute('data-filter-value')); });

        /* Fixable-only toggle */
        var fixableCb = filterDropdown.querySelector('[data-filter-type="fixable"]');
        var fixableOnly = fixableCb && fixableCb.checked;

        /* Gather checked stages */
        var stageCbs = filterDropdown.querySelectorAll('[data-filter-type="stage"]');
        var activeStages = [];
        stageCbs.forEach(function(cb) { if (cb.checked) activeStages.push(cb.getAttribute('data-filter-value')); });

        /* Gather checked categories */
        var catCbs = filterDropdown.querySelectorAll('[data-filter-type="category"]');
        var activeCats = [];
        catCbs.forEach(function(cb) { if (cb.checked) activeCats.push(cb.getAttribute('data-filter-value')); });

        var visibleCount = 0;

        cards.forEach(function(card) {
          var searchable = card.getAttribute('data-searchable') || '';
          var severity = card.getAttribute('data-severity') || '';
          var fixable = card.getAttribute('data-fixable') === 'true';
          var cardStages = card.getAttribute('data-stages') || '';
          var cardCats = card.getAttribute('data-categories') || '';

          /* Text search */
          var matchSearch = !query || searchable.includes(query);

          /* Severity filter */
          var matchSev = activeSev.length === 0 || activeSev.indexOf(severity) !== -1;

          /* Fixable filter */
          var matchFix = !fixableOnly || fixable;

          /* Stage filter — card matches if any of its stages are checked */
          var matchStage = true;
          if (stageCbs.length > 0 && activeStages.length < stageCbs.length) {
            if (!cardStages) {
              matchStage = false;
            } else {
              var cs = cardStages.split(/,\\s*/);
              matchStage = cs.some(function(s) { return activeStages.indexOf(s) !== -1; });
            }
          }

          /* Category filter — card matches if any of its categories are checked */
          var matchCat = true;
          if (catCbs.length > 0 && activeCats.length < catCbs.length) {
            if (!cardCats) {
              matchCat = false;
            } else {
              var cc = cardCats.split(/,\\s*/);
              matchCat = cc.some(function(c) { return activeCats.indexOf(c) !== -1; });
            }
          }

          var visible = matchSearch && matchSev && matchFix && matchStage && matchCat;
          card.style.display = visible ? '' : 'none';
          if (visible) visibleCount++;
        });

        /* Update section visibility */
        sectionEls.forEach(function(section) {
          var sectionCards = section.querySelectorAll('.rule-card');
          var hasVisible = false;
          sectionCards.forEach(function(c) { if (c.style.display !== 'none') hasVisible = true; });
          section.style.display = hasVisible ? '' : 'none';
        });

        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        rulesCount.textContent = visibleCount + ' / ' + totalRules + ' rules';
      }

      searchInput.addEventListener('input', applyFilters);

      /* Checkbox change triggers filter */
      filterDropdown.addEventListener('change', applyFilters);

      /* Clear filters resets all checkboxes */
      clearFiltersBtn.addEventListener('click', function() {
        var allCbs = filterDropdown.querySelectorAll('.filter-cb');
        allCbs.forEach(function(cb) {
          if (cb.getAttribute('data-filter-type') === 'fixable') {
            cb.checked = false;
          } else {
            cb.checked = true;
          }
        });
        applyFilters();
      });

      document.getElementById('collapseAllBtn').addEventListener('click', function() {
        document.querySelectorAll('.section-header').forEach(function(btn) {
          btn.setAttribute('aria-expanded', 'false');
        });
      });

      document.getElementById('expandAllBtn').addEventListener('click', function() {
        document.querySelectorAll('.section-header').forEach(function(btn) {
          btn.setAttribute('aria-expanded', 'true');
        });
      });

      searchInput.focus();
    })();
  </script>
</body>
</html>`;
}

// =============================================================================
// Webview Panel
// =============================================================================

/** Singleton panel reference for reveal-or-create pattern. */
let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Opens the rules viewer as an HTML WebviewPanel.
 *
 * Uses a singleton pattern: if the panel already exists, it is revealed
 * instead of creating a duplicate. The panel is disposed when the user
 * closes it or the extension is deactivated.
 *
 * @example
 * ```typescript
 * await showRulesViewer();
 * ```
 */
export async function showRulesViewer(): Promise<void> {
  // Reveal existing panel if open
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  const folders: readonly vscode.WorkspaceFolder[] | undefined = vscode.workspace.workspaceFolders;
  const [firstFolder] = folders ?? [];

  if (!firstFolder) {
    await vscode.window.showErrorMessage(en.messages.noWorkspaceFolder);
    return;
  }

  const binPath: string | undefined = getBinaryPath(BINARY_NAME, firstFolder.uri);

  if (!binPath) {
    await vscode.window.showErrorMessage(en.messages.binaryNotInNodeModules);
    return;
  }

  const { fsPath: cwd } = firstFolder.uri;

  const result = await runToolText({
    command: binPath,
    args: ['--list-rules'],
    cwd,
  });

  const nonce: string = getNonce();

  if (!result.ok) {
    // Create panel with error content
    currentPanel = vscode.window.createWebviewPanel(
      RULES_SCHEME,
      en.rulesViewer.title,
      vscode.ViewColumn.One,
      { enableScripts: false },
    );

    currentPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style nonce="${nonce}">
    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); padding: 40px; }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <h1>${escapeHtml(en.rulesViewer.title)}</h1>
  <p class="error">${escapeHtml(format(en.rulesViewer.errorFetching, { error: result.error }))}</p>
</body>
</html>`;

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });

    return;
  }

  const sections: RuleSection[] = parseRulesOutput(result.data);

  currentPanel = vscode.window.createWebviewPanel(
    RULES_SCHEME,
    en.rulesViewer.title,
    vscode.ViewColumn.One,
    { enableScripts: true },
  );

  currentPanel.webview.html = renderRulesHtml(sections, nonce);

  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
  });
}

/**
 * Resets the singleton panel reference.
 *
 * Used by tests to clean up state between runs.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   resetPanel();
 * });
 * ```
 */
export function resetPanel(): void {
  currentPanel = undefined;
}
