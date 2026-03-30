# @/lint Phase 31 — SVG Accessibility, Image Quality & Inline SVG Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 16 SVG accessibility, image quality, and inline SVG check functions to TypeScript workspace rules. Most rules scan `.svg` files via `ctx.allFiles()` + `ctx.readFile()`. Some scan source/CSS files for inline SVG or WebP misuse. Also remove all existing `ported::` functions from common.checks.sh.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). No `execSync` needed — pure content scanning.

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
| Tests | 3995 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 174 |
| ported:: count | 57 |

---

## TASK 1 — `workspace/svg-no-hidden-interactive`

**Status**: [x]

**Shell origin**: `check::images_svg_hidden_interactive` (line 7114)
**What**: SVGs must not hide interactive elements (`<a>`, `<button>`) with `display:none` or `opacity:0`
**Branches**:
- SVG has `<a>` or `<button>` with `display:none` or `opacity:0` → error
- SVG without hidden interactive elements → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-hidden-interactive.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for hidden interactive elements

---

## TASK 2 — `workspace/svg-symbol-requires-viewbox`

**Status**: [x]

**Shell origin**: `check::images_svg_symbol_missing_viewbox` (line 7149)
**What**: SVG `<symbol>` elements must include a `viewBox` attribute
**Branches**:
- SVG has `<symbol` without `viewBox=` → error
- SVG has `<symbol` with `viewBox=` → pass
- SVG without `<symbol>` → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-symbol-requires-viewbox.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for symbol without viewBox

---

## TASK 3 — `workspace/svg-opacity-requires-fill`

**Status**: [x]

**Shell origin**: `check::images_svg_opacity_fallback` (line 7303)
**What**: SVGs with `opacity=` must also declare `fill=` for fallback rendering
**Branches**:
- SVG has `opacity=` but no `fill=` → warning
- SVG has both `opacity=` and `fill=` → pass
- SVG without `opacity=` → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-opacity-requires-fill.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for opacity without fill

---

## TASK 4 — `workspace/svg-no-blur-filter`

**Status**: [x]

**Shell origin**: `check::images_svg_blur_filter_detected` (line 7340)
**What**: SVGs should not use `feGaussianBlur` or `blur()` filters (performance)
**Branches**:
- SVG has `feGaussianBlur` or `blur(` → warning
- SVG without blur filters → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-blur-filter.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for blur filters

---

## TASK 5 — `workspace/svg-ids-unique`

**Status**: [x]

**Shell origin**: `check::images_svg_ids_unique` (line 7382)
**What**: SVG `id=` values must be unique across all SVG files in the workspace
**Branches**:
- All IDs unique across files → pass
- Duplicate ID found in different files → error (reports both files)
- Duplicate ID within same file → error
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-ids-unique.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for duplicate IDs across files

---

## TASK 6 — `workspace/svg-requires-aria-role`

**Status**: [x]

**Shell origin**: `check::images_svg_aria_roles_defined` (line 7430)
**What**: SVGs must declare `role="img"`, `role="presentation"`, or `role="graphics-symbol"`
**Branches**:
- SVG has valid ARIA role → pass
- SVG missing ARIA role → warning
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-aria-role.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing ARIA role

---

## TASK 7 — `workspace/svg-no-clipped-text`

**Status**: [x]

**Shell origin**: `check::images_svg_text_overflow_clipped` (line 7467)
**What**: SVG `<text>` elements must not have `overflow`, `clip-path`, or `clip-rule` attributes
**Branches**:
- SVG has `<text` with overflow/clip attributes → warning
- SVG with `<text>` without clipping → pass
- SVG without `<text>` → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-clipped-text.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for clipped text

---

## TASK 8 — `workspace/svg-title-first-child`

**Status**: [x]

**Shell origin**: `check::images_svg_title_first_child` (line 7504)
**What**: SVG `<title>` must appear as the first child element of `<svg>` for accessibility
**Branches**:
- SVG has `<svg>` with `<title>` as first child → pass
- SVG has `<svg>` but no `<title>` → warning
- SVG has `<svg>` with `<title>` not first → warning
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-title-first-child.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing or misplaced title

---

## TASK 9 — `workspace/svg-no-tabindex`

**Status**: [x]

**Shell origin**: `check::images_svg_tabindex_removed` (line 7545)
**What**: SVGs should not use `tabindex=` unless explicitly interactive
**Branches**:
- SVG has `tabindex=` → warning
- SVG without tabindex → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-tabindex.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for tabindex usage

---

## TASK 10 — `workspace/svg-no-mask-fragment`

**Status**: [x]

**Shell origin**: `check::images_svg_mask_url_fragment` (line 7617)
**What**: SVGs should not use `mask="url(#...)"` inline fragment references
**Branches**:
- SVG has `mask="url(#` → warning
- SVG without mask fragments → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-mask-fragment.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for mask fragment references

---

## TASK 11 — `workspace/svg-requires-aria-attrs`

**Status**: [x]

**Shell origin**: `check::images_svg_non_decorative_missing_aria` (line 7764)
**What**: Non-decorative SVGs must declare ARIA role or `aria-*` attributes
**Branches**:
- SVG has `role="img|presentation"` or `aria-` attributes → pass
- SVG without ARIA attrs → warning
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-aria-attrs.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing ARIA attributes

---

## TASK 12 — `workspace/svg-title-desc-requires-lang`

**Status**: [x]

**Shell origin**: `check::images_svg_title_desc_missing_lang` (line 7800)
**What**: SVG `<title>` and `<desc>` elements must include a `lang=` attribute
**Branches**:
- SVG has `<title>` with `lang=` → pass
- SVG has `<title>` without `lang=` → warning
- SVG has `<desc>` with `lang=` → pass
- SVG has `<desc>` without `lang=` → warning
- SVG without title or desc → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-title-desc-requires-lang.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing lang on title/desc

---

## TASK 13 — `workspace/no-webp-icons`

**Status**: [x]

**Shell origin**: `check::images_webp_not_used_for_icons` (line 6321)
**What**: `.webp` files must not be used for favicons or icons (use `.ico` or `.svg`)
**Branches**:
- File matches `*icon*.webp` or `favicon.webp` (case-insensitive) → error
- Non-matching files → pass

**Files**:
- Create: `src/rules/workspace/no-webp-icons.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for .webp icon files

---

## TASK 14 — `workspace/no-inline-svg-in-source`

**Status**: [x]

**Shell origin**: `check::images_inline_svg_ban` (line 6935)
**What**: Source files (`.tsx`, `.jsx`, `.html`, `.md`) must not contain inline `<svg>` markup
**Branches**:
- Source file has `<svg` → error
- Source file without SVG → pass
- Non-source files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/no-inline-svg-in-source.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for inline SVG in source files

---

## TASK 15 — `workspace/no-webp-in-css`

**Status**: [x]

**Shell origin**: `check::images_webp_in_css_url_blocked` (line 7582)
**What**: CSS files must not reference `.webp` in `url()` or background properties
**Branches**:
- CSS file has `url(*.webp` → warning
- CSS file without .webp refs → pass
- Non-CSS files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/no-webp-in-css.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for .webp in CSS url()

---

## TASK 16 — `workspace/no-raw-svg-in-components`

**Status**: [x]

**Shell origin**: `check::images_inlined_should_use_component` (line 7976)
**What**: Svelte/TSX component files must use `<SvgIcon>` wrappers, not raw inline `<svg>` markup
**Branches**:
- Component file has `<svg` → error
- Component file without SVG → pass
- Non-component files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/no-raw-svg-in-components.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for raw SVG in components

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 16 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 2, 5, 13, 14, 16: `"error"`
- Rules 3, 4, 6, 7, 8, 9, 10, 11, 12, 15: `"warn"`
- Rename 16 `check::` → `ported::` in `common.checks.sh`
- Remove ALL existing `ported::` functions from `common.checks.sh`

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 16 rules appear in config, 16 functions renamed, all old ported:: removed

---

## TASK 18 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 19 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 16 rule files exist
- Verify all 16 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count
- Verify all old ported:: functions removed
- Commit with descriptive message

**Verification**:
- All 16 `.ts` files exist in `src/rules/workspace/`
- All 16 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` shows only the 16 newly renamed
- `grep -c '^check::' common.checks.sh` decreased by 16
