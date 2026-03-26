# Accessibility Rules Expansion — Design Document

**Date:** 2026-03-20
**File:** `packages/shared/ui/src/lens/detect-accessibility.ts`
**Current state:** 105 rules, 4 standards (WCAG 2.1 AA, WAI-ARIA, Section 508, EN 301 549)
**Target state:** 150 rules, 8 standards (+WHATWG, Best Practice, WebAIM, A11Y Project)

## Goal

Achieve maximum practical coverage of six accessibility sources currently missing or partially covered:
1. WCAG 2.1 AA (3 missing criteria)
2. WCAG Technique C7
3. WAI-ARIA 1.2 (naming/misuse gaps)
4. WHATWG HTML Living Standard (content models, implicit roles)
5. Scott O'Hara patterns (best-practice component patterns)
6. WebAIM (high-frequency failures, alt-text, cognitive)
7. The A11Y Project (anti-patterns, practical checks)

## Architecture

### No structural changes required

The existing architecture supports this expansion without modification:
- `A11Y_RULES: A11yRule[]` — append new rules to the array
- `determineStandard()` — add 4 new standard labels
- `buildResult()` / `notApplicableResult()` — reuse existing helpers
- `auditAccessibility()` — automatically picks up new rules via `A11Y_RULES.map()`
- File filter helpers (`svelteFiles`, `cssFiles`, `layoutFiles`, etc.) — reuse as-is

### `determineStandard()` changes

```typescript
function determineStandard(id: Str, category: Str): Str {
  if ((id as string).startsWith('section-508')) return 'Section 508' as Str;
  if ((id as string).startsWith('en-301-549')) return 'EN 301 549' as Str;
  if (category === 'ARIA' || (id as string).startsWith('aria-')) return 'WAI-ARIA' as Str;
  // New standards
  if ((id as string).startsWith('html-')) return 'WHATWG' as Str;
  if ((id as string).startsWith('ohara-')) return 'Best Practice' as Str;
  if ((id as string).startsWith('webaim-')) return 'WebAIM' as Str;
  if ((id as string).startsWith('a11yproject-')) return 'A11Y Project' as Str;
  return 'WCAG 2.1 AA' as Str;
}
```

### JSDoc update

Update `auditAccessibility()` JSDoc to reflect new rule count (150) and standards count (8).

## New Rules — 45 total

### Group 1: WCAG 2.1 AA Gaps (3 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `pause-stop-hide` | Pause, Stop, Hide | 2.2.2 | Visual | Check for `autoplay` on `<video>`/`<audio>`, CSS `animation` without `prefers-reduced-motion`, `@keyframes` without corresponding `prefers-reduced-motion` media query |
| `parsing-duplicate-ids` | No Duplicate IDs | 4.1.1 | Standards | Check for duplicate `id="..."` values within a single Svelte component template |
| `audio-description-aa` | Audio Description (AA) | 1.2.5 | Media | Check `<video>` elements for `<track kind="descriptions">` |

### Group 2: WCAG C7 (1 rule)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `visually-hidden-link-text` | Visually Hidden Link Text (C7) | 2.4.4 | Utilities | Links containing `.sr-only`/`.visually-hidden` spans use clip-path CSS technique, not `display:none`/`visibility:hidden` |

### Group 3: WAI-ARIA 1.2 Gaps (6 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `aria-naming-prohibited` | ARIA naming prohibited | 4.1.2 | ARIA | `aria-label`/`aria-labelledby` on elements that prohibit naming: `<p>`, `<abbr>`, `<b>`, `<em>`, `<i>`, `<code>`, `<small>`, `<strong>`, `<sub>`, `<sup>` |
| `aria-hidden-focusable` | ARIA hidden on focusable | 4.1.2 | ARIA | `aria-hidden="true"` on `<button>`, `<a href>`, `<input>`, `<select>`, `<textarea>`, elements with `tabindex` |
| `aria-label-no-role` | ARIA label without role | 4.1.2 | ARIA | `aria-label` on `<div>` or `<span>` without an explicit `role` attribute |
| `aria-live-assertive-misuse` | Assertive live region misuse | 4.1.3 | ARIA | `aria-live="assertive"` used outside of error/alert context |
| `aria-redundant-role` | Redundant ARIA role | 4.1.2 | ARIA | Native element with its own implicit role: `<button role="button">`, `<a role="link">`, `<nav role="navigation">`, `<main role="main">`, `<header role="banner">`, `<footer role="contentinfo">` |
| `aria-menu-nav-misuse` | Menu role on navigation | 4.1.2 | ARIA | `role="menu"` or `role="menubar"` on `<nav>` elements or navigation `<ul>` lists |

### Group 4: WHATWG/HTML Spec (12 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `html-interactive-nesting` | Interactive content nesting | 4.1.1 | HTML Spec | `<button>` containing `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`; `<a>` containing same plus other `<a>` |
| `html-img-alt-required` | Image alt required | 1.1.1 | HTML Spec | `<img>` without `alt` attribute |
| `html-img-empty-alt-role` | Empty alt with role | 1.1.1 | HTML Spec | `<img alt="">` with any `role` attribute (forbidden) |
| `html-label-nesting` | Label nesting | 1.3.1 | HTML Spec | `<label>` containing another `<label>` or >1 labelable element |
| `html-input-hidden-aria` | Hidden input ARIA | 4.1.2 | HTML Spec | `<input type="hidden">` with any `aria-*` attribute |
| `html-details-summary` | Details/summary structure | 4.1.2 | HTML Spec | `<details>` where first element child is not `<summary>` |
| `html-button-type` | Button type required | 4.1.2 | HTML Spec | `<button>` without explicit `type` attribute |
| `html-placeholder-label` | Placeholder not a label | 1.3.1 | HTML Spec | `<input>` with `placeholder` but no `<label>`, `aria-label`, or `aria-labelledby` |
| `html-form-no-name` | Form without accessible name | 1.3.1 | HTML Spec | `<form>` without `aria-label`, `aria-labelledby`, or `title` |
| `html-section-no-name` | Section without accessible name | 1.3.1 | HTML Spec | `<section>` without `aria-label`, `aria-labelledby`, or `aria-labelledby` to heading |
| `html-heading-skip` | Heading level skip | 1.3.1 | HTML Spec | Heading levels that skip (e.g., `<h1>` followed by `<h3>`) within a component |
| `html-positive-tabindex` | Positive tabindex | 2.4.3 | HTML Spec | Any `tabindex` attribute with value > 0 |

### Group 5: Scott O'Hara Patterns (8 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `ohara-visually-hidden-css` | Visually hidden CSS technique | 1.3.1 | Best Practice | Check that visually-hidden/sr-only CSS uses `clip-path`/`clip` technique, not `text-indent: -10000px` or `font-size: 0` |
| `ohara-visually-hidden-focusable` | Focusable visually hidden | 2.4.1 | Best Practice | Focusable elements with visually-hidden class (skip links) should use `:not(:focus):not(:active)` variant |
| `ohara-svg-in-interactive` | SVG in interactive elements | 4.1.2 | Best Practice | SVG inside `<button>`/`<a>` must have `aria-hidden="true"` and `focusable="false"` |
| `ohara-dialog-name` | Dialog accessible name | 4.1.2 | Best Practice | `<dialog>` or `role="dialog"` must have `aria-label` or `aria-labelledby` |
| `ohara-dialog-focus-return` | Dialog focus return | 2.4.3 | Best Practice | Dialog close handlers should contain focus management code |
| `ohara-display-contents-button` | Display contents on button | 4.1.2 | Best Practice | `display: contents` in CSS applied to `button` selector |
| `ohara-list-style-none` | List style none semantics | 1.3.1 | Best Practice | `<ul>`/`<ol>` with `list-none`/`list-style: none` class without `role="list"` |
| `ohara-landmark-label-redundancy` | Landmark label redundancy | 2.4.6 | Best Practice | `aria-label` on landmark containing the landmark type name (e.g., "primary navigation" on `<nav>`) |

### Group 6: WebAIM (10 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `webaim-alt-text-prefix` | Alt text anti-prefix | 1.1.1 | WebAIM | `alt` attribute starting with "image of", "photo of", "picture of", "graphic of" |
| `webaim-empty-link` | Empty link | 2.4.4 | WebAIM | `<a>` with no text content, no child `<img>` with alt, no `aria-label` |
| `webaim-empty-button` | Empty button | 4.1.2 | WebAIM | `<button>` with no text content, no `aria-label`, no `aria-labelledby` |
| `webaim-bad-link-text` | Non-descriptive link text | 2.4.4 | WebAIM | Link text matching "click here", "here", "more", "read more", "link to", "learn more" |
| `webaim-title-only-name` | Title as only accessible name | 4.1.2 | WebAIM | Element with `title` but no `aria-label`, `aria-labelledby`, visible text, or `alt` |
| `webaim-outline-removed` | Focus outline removed | 2.4.7 | WebAIM | CSS `outline: none`/`outline: 0` on `:focus` without replacement `box-shadow`/`border`/`outline` indicator |
| `webaim-viewport-zoom-disabled` | Viewport zoom disabled | 1.4.4 | WebAIM | `<meta name="viewport">` with `user-scalable=no` or `maximum-scale=1` |
| `webaim-autoplay-media` | Media autoplay | 1.4.2 | WebAIM | `<video>` or `<audio>` with `autoplay` attribute |
| `webaim-empty-heading` | Empty heading | 1.3.1 | WebAIM | Heading elements (`<h1>`–`<h6>`) with no text content |
| `webaim-empty-th` | Empty table header | 1.3.1 | WebAIM | `<th>` elements with no text content |

### Group 7: The A11Y Project (5 rules)

| ID | Label | WCAG | Category | Detection |
|----|-------|------|----------|-----------|
| `a11yproject-title-antipattern` | Title attribute anti-pattern | 4.1.2 | A11Y | `title` attribute used on elements other than `<iframe>`, `<frame>`, `<abbr>` as sole accessibility mechanism |
| `a11yproject-autofocus-misuse` | Autofocus misuse | 3.2.1 | A11Y | `autofocus` attribute on elements that are not the primary interaction target (multiple autofocus, autofocus on non-first elements) |
| `a11yproject-landmark-nesting` | Landmark nesting semantics | 1.3.1 | A11Y | `<header>` or `<footer>` inside `<article>`, `<section>`, or `<aside>` (lose banner/contentinfo semantics) |
| `a11yproject-nav-disambiguation` | Navigation disambiguation | 1.3.1 | A11Y | Multiple `<nav>` elements without distinct `aria-label` or `aria-labelledby` |
| `a11yproject-selection-contrast` | Selection contrast | 1.4.3 | A11Y | Custom `::selection` CSS without explicit `color` AND `background` (incomplete override) |

## Implementation Approach

### Rule pattern

Every rule follows the same pattern (example for a Svelte-scoped check):

```typescript
{
  id: 'webaim-empty-button' as Str,
  label: 'Empty button' as Str,
  description: 'Button elements must have accessible text content' as Str,
  category: 'WebAIM' as Str,
  wcag: '4.1.2' as Str,
  check(sources: Map<Str, Str>): A11yRuleResult {
    const svelte: SourceEntry[] = svelteFiles(sources);
    if (svelte.length === 0)
      return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
    let pass: Num = 0 as Num;
    let fail: Num = 0 as Num;
    const passing: Str[] = [];
    const failing: Str[] = [];
    const findings: A11yFileFinding[] = [];
    for (const [filename, content] of svelte) {
      // ... regex-based detection ...
    }
    return buildResult(this, pass, fail, passing, failing, evidence, undefined, findings);
  },
},
```

### Detection approach

All rules use static regex analysis on source code — no AST parsing, no runtime checks.
This is consistent with all 105 existing rules.

### Test approach

Existing test file: `detect-accessibility.test.ts`. Add test cases for each new rule:
- Passing source (no violations)
- Failing source (violations detected)
- Edge cases (not-applicable when no relevant files)

### Ordering

New rules appended to `A11Y_RULES` array after the existing 105 rules, grouped by standard:
1. WCAG gaps (3)
2. WCAG C7 (1)
3. WAI-ARIA gaps (6)
4. WHATWG/HTML (12)
5. Scott O'Hara (8)
6. WebAIM (10)
7. A11Y Project (5)

## Implementation Plans

Split into 8 plans of 5–6 rules each to stay within context limits:

| Plan | Rules | Count |
|------|-------|-------|
| Part 1 | `determineStandard()` update + WCAG gaps (3) + C7 (1) + `aria-naming-prohibited` + `aria-hidden-focusable` | 6 |
| Part 2 | `aria-label-no-role` + `aria-live-assertive-misuse` + `aria-redundant-role` + `aria-menu-nav-misuse` + `html-interactive-nesting` + `html-img-alt-required` | 6 |
| Part 3 | `html-img-empty-alt-role` + `html-label-nesting` + `html-input-hidden-aria` + `html-details-summary` + `html-button-type` + `html-placeholder-label` | 6 |
| Part 4 | `html-form-no-name` + `html-section-no-name` + `html-heading-skip` + `html-positive-tabindex` + `ohara-visually-hidden-css` + `ohara-visually-hidden-focusable` | 6 |
| Part 5 | `ohara-svg-in-interactive` + `ohara-dialog-name` + `ohara-dialog-focus-return` + `ohara-display-contents-button` + `ohara-list-style-none` + `ohara-landmark-label-redundancy` | 6 |
| Part 6 | `webaim-alt-text-prefix` + `webaim-empty-link` + `webaim-empty-button` + `webaim-bad-link-text` + `webaim-title-only-name` | 5 |
| Part 7 | `webaim-outline-removed` + `webaim-viewport-zoom-disabled` + `webaim-autoplay-media` + `webaim-empty-heading` + `webaim-empty-th` | 5 |
| Part 8 | `a11yproject-title-antipattern` + `a11yproject-autofocus-misuse` + `a11yproject-landmark-nesting` + `a11yproject-nav-disambiguation` + `a11yproject-selection-contrast` + JSDoc/count updates | 6 |

Each plan: implement rules → add tests → run QA → commit.
