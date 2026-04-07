# @resist/vscode Phase 89 — Rules Viewer HTML Webview

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-04-02
**Package**: `@resist/vscode` (`packages/shared/config/tooling/vscode/`)
**Goal**: Replace the markdown-based rules viewer with a beautiful HTML WebviewPanel using VS Code's native CSS variables for theme integration.
**Architecture**: Replace `TextDocumentContentProvider` with `WebviewPanel`. Two-stage pipeline: parse CLI output into structured `RuleData[]`, then render to HTML. Singleton panel pattern (reveal-or-create). Pure inline HTML/CSS/JS — no framework, no external assets. Client-side search/filter via `<script>` tag.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- `[ ]` — Not started
- `[x]` — Done (implemented + verified + tests passing)
- `[~]` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 518 total (518 pass) → 540 total (540 pass) |
| Test files | 37 |
| Commands | 25 registered |
| Rules viewer | TextDocumentContentProvider + markdown |

---

## TASK 1 — Restructure parser: CLI text to structured data

**Status**: [x]

**Gap**: Current `parseRulesOutput()` converts CLI text directly to markdown. The HTML renderer needs structured data, not markdown strings.

**Plan**:
- Add types: `RuleEntry` (id, severity, fixable, description, patterns, categories, stages) and `RuleSection` (name, rules array)
- Rewrite `parseRulesOutput()` to return `RuleSection[]` instead of a markdown string
- Export types for use by HTML renderer and tests
- Keep same regex patterns for parsing CLI format

**Files**:
- Edit: `src/lint/rules-viewer.ts` — rewrite parser to return `RuleSection[]`
- Test: `src/lint/rules-viewer.test.ts` — rewrite tests to assert on structured data (rule counts, field values, section names)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes. Parser returns typed objects, not markdown strings.

---

## TASK 2 — Add locale strings for webview UI

**Status**: [x]

**Gap**: New webview needs strings for search placeholder, badges, labels, empty states.

**Plan**:
- Add to `en.rulesViewer`: `searchPlaceholder`, `noRulesFound`, `fixableLabel`, `patternsLabel`, `categoriesLabel`, `stagesLabel`, `rulesCount`, `noMatchingRules`, `collapseAll`, `expandAll`, `severityError`, `severityWarning`, `severityInfo`, `descriptionLabel`
- Add matching fields to `RulesViewerStrings` type

**Files**:
- Edit: `src/locale/en.ts` — add new strings to `rulesViewer`
- Edit: `src/locale/schema.ts` — add new fields to `RulesViewerStrings`
- Test: `src/locale/locale.test.ts`

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes. Locale test validates all new strings exist.

---

## TASK 3 — Build HTML renderer

**Status**: [x]

**Gap**: No HTML generation exists. Need a function that takes `RuleSection[]` and produces a complete HTML document string with inline CSS/JS.

**Plan**:
- Create `renderRulesHtml(sections: RuleSection[], nonce: string): string` in `rules-viewer.ts`
- Add `escapeHtml(text: string): string` utility to prevent XSS
- Add `getNonce(): string` utility for CSP
- CSS design using `--vscode-*` variables:
  - `--vscode-editor-background` / `--vscode-editor-foreground` for base colors
  - `--vscode-badge-background` / `--vscode-badge-foreground` for severity badges
  - `--vscode-textLink-foreground` for links
  - `--vscode-input-background` / `--vscode-input-border` for search input
  - `--vscode-list-hoverBackground` for card hover states
  - `--vscode-focusBorder` for focus rings
- Layout: sticky search bar at top, collapsible sections, rule cards with badges
- Each card: rule ID (monospace), severity badge (colored), fixable badge (green), description, metadata pills (patterns, categories, stages)
- Client-side JS: search input filters cards by `data-searchable` attribute, section collapse/expand toggles, collapse-all/expand-all buttons, rules count display
- Content Security Policy with nonce-based script/style

**Files**:
- Edit: `src/lint/rules-viewer.ts` — add `renderRulesHtml()`, `escapeHtml()`, `getNonce()`
- Test: `src/lint/rules-viewer.test.ts` — test HTML output (contains expected elements, escapes HTML, CSP nonce, search input, severity badges, fixable badge)

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes. HTML contains all expected elements, CSP nonce, escaped content.

---

## TASK 4 — Replace TextDocumentContentProvider with WebviewPanel

**Status**: [x]

**Gap**: `RulesViewerProvider` uses `TextDocumentContentProvider` pattern. Need `WebviewPanel` with singleton reveal-or-create lifecycle.

**Plan**:
- Delete `RulesViewerProvider` class entirely
- Rewrite `showRulesViewer()`:
  - Module-level `currentPanel: vscode.WebviewPanel | undefined` reference
  - If `currentPanel` exists and not disposed, call `currentPanel.reveal()` and return
  - Otherwise: `vscode.window.createWebviewPanel(RULES_SCHEME, title, ViewColumn.One, { enableScripts: true })`
  - Set `panel.onDidDispose(() => { currentPanel = undefined; })`
  - Run CLI, parse output, render HTML, set `panel.webview.html`
  - Handle errors: show error HTML page (not markdown)
- Remove `RulesViewerProvider` export from `src/lint/index.ts`
- Remove `registerTextDocumentContentProvider` from `src/extension.ts` (lines 263-272)
- Add `createWebviewPanel` mock to `src/__mocks__/vscode.ts`
- Add `ViewColumn` enum to mock

**Files**:
- Edit: `src/lint/rules-viewer.ts` — delete class, rewrite `showRulesViewer()`
- Edit: `src/lint/index.ts` — remove `RulesViewerProvider` export (line 23)
- Edit: `src/extension.ts` — remove rules viewer provider registration block (lines 263-272)
- Edit: `src/__mocks__/vscode.ts` — add `createWebviewPanel` mock with webview object, add `ViewColumn` enum
- Test: `src/lint/rules-viewer.test.ts` — add tests for panel creation, reveal-or-create, dispose cleanup

**Verification**: `pnpm --filter @resist/vscode run qa:test` passes. No references to `RulesViewerProvider` or `registerTextDocumentContentProvider` for rules viewer remain.

---

## TASK 5 — Register Rules + Config

**Status**: [x]

**Plan**:
- Verify `showRulesViewer()` is still exported and called by `commands.ts`
- Verify `RULES_SCHEME` constant is still used (now as webview viewType)
- Verify `RulesViewerProvider` export removed from `index.ts`
- Verify `extension.ts` no longer registers the old content provider
- Verify all new locale strings are in `en.ts` and `schema.ts`
- Verify `parseRulesOutput` and `renderRulesHtml` exports are correct

**Files**:
- Edit: `src/lint/index.ts` — verify exports are correct

**Verification**: `grep -c "showRulesViewer" packages/shared/config/tooling/vscode/src/lint/commands.ts` outputs >= 1; `grep -c "parseRulesOutput\|renderRulesHtml" packages/shared/config/tooling/vscode/src/lint/index.ts` confirms exports present

---

## TASK 6 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all declared commands have matching registerCommand calls (25 total — unchanged)
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point (RulesViewerProvider removed, no class replacement needed)
- Verify no unused exports or dead code (created but never imported)
- Grep audit: no references to `RulesViewerProvider` in any non-test file
- Grep audit: `showRulesViewer` is called from commands.ts
- Grep audit: `parseRulesOutput` is tested
- Grep audit: `renderRulesHtml` is tested
- Fix any gaps found before proceeding

**Verification**:
- `grep -c 'registerCommand' src/lint/commands.ts` matches declared command count
- All config settings have corresponding config.get calls
- No orphaned exports (every export is imported somewhere)

---

## TASK 7 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:lint -- packages/shared/config/tooling/vscode/src/`
- Run: `pnpm --filter @resist/vscode run qa:test`
- Verify test count >= 518 (baseline)

**Verification**: All pnpm commands exit 0

---

## TASK 8 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify `RulesViewerProvider` class no longer exists
- Verify `showRulesViewer()` creates a WebviewPanel
- Verify HTML output contains search bar, severity badges, collapsible sections
- Verify test count >= 518
- Commit with descriptive message

**Verification**:
- `rules-viewer.ts` has no `TextDocumentContentProvider`
- `extension.ts` has no rules viewer registration block
- `index.ts` has no `RulesViewerProvider` export
- Test count >= 518
- Integration audit shows zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Restructure parser to structured data | -- |
| 2 | Add locale strings for webview UI | -- |
| 3 | Build HTML renderer | 1, 2 |
| 4 | Replace TextDocumentContentProvider with WebviewPanel | 3 |
| 5 | Register rules + config | 1-4 |
| 6 | Integration verification | 5 |
| 7 | Full QA + Coverage | 6 |
| 8 | Final verification + commit | 7 |
