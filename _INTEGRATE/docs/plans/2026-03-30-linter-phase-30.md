# @/lint Phase 30 — SVG Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 16 SVG image validation check functions to TypeScript workspace rules. All rules scan `.svg` files via `ctx.allFiles()` + `ctx.readFile()`, grep content for violations.
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
| Tests | 3924 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 190 |
| ported:: count | 41 |

---

## TASK 1 — `workspace/svg-requires-title-or-desc`

**Status**: [x]

**Shell origin**: `check::images_svg_has_title_or_desc` (line 6281)
**What**: SVG files must contain `<title>` or `<desc>` for accessibility
**Branches**:
- SVG has `<title>` → pass
- SVG has `<desc>` → pass
- SVG has neither → error
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-title-or-desc.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing title/desc, pass for present

---

## TASK 2 — `workspace/svg-no-inline-style`

**Status**: [x]

**Shell origin**: `check::images_svg_inline_style_blocked` (line 6444)
**What**: SVGs must not contain `style="..."` attributes
**Branches**:
- SVG has `style="..."` → error
- SVG without inline styles → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-inline-style.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for inline styles

---

## TASK 3 — `workspace/svg-requires-viewbox`

**Status**: [x]

**Shell origin**: `check::images_svg_viewbox_required` (line 6484)
**What**: SVGs must declare a `viewBox` attribute
**Branches**:
- SVG has `viewBox=` → pass
- SVG missing viewBox → error
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-viewbox.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing viewBox

---

## TASK 4 — `workspace/svg-requires-dimensions`

**Status**: [x]

**Shell origin**: `check::images_svg_dimensions_static` (line 6524)
**What**: SVGs must have `width` and `height` attributes
**Branches**:
- SVG has both `width=` and `height=` → pass
- SVG missing width or height → warning
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-dimensions.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for missing dimensions

---

## TASK 5 — `workspace/svg-no-black-fill`

**Status**: [x]

**Shell origin**: `check::images_svg_fill_not_black` (line 6564)
**What**: SVGs should not use `fill="black"` (use `currentColor` instead)
**Branches**:
- SVG has `fill="black"` (case-insensitive) → warning
- SVG without black fill → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-black-fill.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for black fill

---

## TASK 6 — `workspace/svg-no-embedded-font`

**Status**: [x]

**Shell origin**: `check::images_svg_font_embedding_blocked` (line 6644)
**What**: SVGs must not embed fonts (base64/WOFF/TTF)
**Branches**:
- SVG has `data:font/` or `.woff` or `.ttf` or `<font` → error
- SVG without embedded fonts → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-embedded-font.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for embedded fonts

---

## TASK 7 — `workspace/svg-no-script`

**Status**: [x]

**Shell origin**: `check::images_svg_script_block` (line 6827)
**What**: SVGs must not contain `<script>` elements (XSS prevention)
**Branches**:
- SVG has `<script` (case-insensitive) → error
- SVG without scripts → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-script.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for script elements

---

## TASK 8 — `workspace/svg-no-external-url`

**Status**: [x]

**Shell origin**: `check::images_svg_css_href_exploit` (line 6863)
**What**: SVGs must not contain `url(http...)` CSS references
**Branches**:
- SVG has `url(` with `http://` or `https://` → error
- SVG without external URLs → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-external-url.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for external CSS URLs

---

## TASK 9 — `workspace/svg-no-raster-image`

**Status**: [x]

**Shell origin**: `check::images_raster_in_svg` (line 6899)
**What**: SVGs must not embed raster images (base64 PNG/JPG/GIF)
**Branches**:
- SVG has `data:image/(png|jpeg|gif);base64,` → error
- SVG without raster embeds → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-raster-image.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for embedded raster images

---

## TASK 10 — `workspace/svg-no-external-font-url`

**Status**: [x]

**Shell origin**: `check::images_svg_external_font_url` (line 6970)
**What**: SVGs must not reference external font URLs
**Branches**:
- SVG has `url(` pointing to remote `.woff`/`.woff2`/`.ttf` → error
- SVG without external font refs → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-external-font-url.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for external font URLs

---

## TASK 11 — `workspace/svg-no-text-element`

**Status**: [x]

**Shell origin**: `check::images_svg_text_not_converted` (line 7006)
**What**: SVGs should not contain raw `<text>` elements
**Branches**:
- SVG has `<text` → warning
- SVG without text elements → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-text-element.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for text elements

---

## TASK 12 — `workspace/svg-no-xlink-http`

**Status**: [x]

**Shell origin**: `check::images_svg_xlink_href_http` (line 7042)
**What**: SVGs must not use insecure `xlink:href="http://..."`
**Branches**:
- SVG has `xlink:href="http://` → error
- SVG without insecure xlink → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-xlink-http.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for insecure xlink

---

## TASK 13 — `workspace/svg-requires-namespace`

**Status**: [x]

**Shell origin**: `check::images_svg_namespace_missing` (line 7078)
**What**: SVGs must declare `xmlns="http://www.w3.org/2000/svg"`
**Branches**:
- SVG has xmlns declaration → pass
- SVG missing xmlns → error
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-requires-namespace.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for missing namespace

---

## TASK 14 — `workspace/svg-no-event-handler`

**Status**: [x]

**Shell origin**: `check::images_svg_event_handlers_blocked` (line 7692)
**What**: SVGs must not contain inline `on*` event handlers
**Branches**:
- SVG has `onclick=`, `onload=`, `onmouseover=`, etc. → error
- SVG without event handlers → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-event-handler.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for event handlers

---

## TASK 15 — `workspace/svg-no-remote-href`

**Status**: [x]

**Shell origin**: `check::images_svg_remote_href_any` (line 7654)
**What**: SVGs must not contain `href`/`xlink:href` to remote HTTP(S) URLs
**Branches**:
- SVG has `href="http` or `xlink:href="http` → error
- SVG without remote hrefs → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-remote-href.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for remote hrefs

---

## TASK 16 — `workspace/svg-no-embedded-media`

**Status**: [x]

**Shell origin**: `check::images_svg_embedded_media_blocked` (line 7844)
**What**: SVGs must not contain `<image>`, `<video>`, `<audio>` elements
**Branches**:
- SVG has `<image`, `<video`, or `<audio` → error
- SVG without embedded media → pass
- Non-SVG files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-no-embedded-media.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for embedded media

---

## TASK 17 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add all 16 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 1, 2, 3, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16: `"error"`
- Rules 4, 5, 11: `"warn"`
- Rename 16 `check::` → `ported::` in `common.checks.sh`

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 16 rules appear in config, 16 functions renamed

---

## TASK 18 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
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
- Commit with descriptive message

**Verification**:
- All 16 `.ts` files exist in `src/rules/workspace/`
- All 16 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` increased by 16
- `grep -c '^check::' common.checks.sh` decreased by 16
