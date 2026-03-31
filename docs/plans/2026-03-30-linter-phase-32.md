# @/lint Phase 32 — Image Quality, ICO/WebP Binary Validation Rules

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`
**Goal**: Port 12 image quality check functions (10 new TS rules + 2 duplicates) covering WebP binary validation, ICO header parsing, SVG structure, and file extension verification. Binary formats parsed with `readFileSync` + Buffer offsets.
**Architecture**: All rules are `WorkspaceRule` with `scope: 'workspace'`, async `check(context)`, using `WorkspaceContext` (`rootDir`, `allFiles()`, `readFile()`). ICO/WebP rules use `readFileSync` from `node:fs` for binary Buffer access.

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
| Tests | 4089 pass / 0 fail |
| Type-check | Passes |
| check:: remaining | 158 |
| ported:: count | 0 |

---

## TASK 1 — `workspace/webp-max-size`

**Status**: [x]

**Shell origin**: `check::images_large_webp_warning` (line 4515)
**What**: .webp files must not exceed 250KB (256000 bytes)
**Branches**:
- .webp file > 250KB → warning
- .webp file ≤ 250KB → pass
- Non-.webp files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/webp-max-size.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for oversized .webp files

---

## TASK 2 — `workspace/webp-no-lossless`

**Status**: [x]

**Shell origin**: `check::images_webp_lossless_unused` (line 4559)
**What**: .webp files should use lossy encoding. Checks for VP8L lossless marker in WebP RIFF header (bytes 12-15).
**Branches**:
- .webp with VP8L (lossless) → warning
- .webp with VP8 (lossy) → pass
- .webp too small to read header → skip
- Non-.webp files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/webp-no-lossless.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for lossless .webp files

---

## TASK 3 — `workspace/webp-no-metadata`

**Status**: [x]

**Shell origin**: `check::images_webp_metadata_stripped` (line 4599)
**What**: .webp files must not contain EXIF, XMP, or ICC_PROFILE metadata. Scans raw content for known metadata string markers.
**Branches**:
- .webp with ICC_PROFILE/XMP/Exif strings → warning
- .webp without metadata → pass
- Non-.webp files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/webp-no-metadata.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for metadata in .webp

---

## TASK 4 — `workspace/ico-min-resolution`

**Status**: [x]

**Shell origin**: `check::images_ico_color_depth_warn` (line 4679)
**What**: ICO files should have at least 64x64 resolution. Reads ICO binary header — ICONDIR (6 bytes) + first ICONDIRENTRY (byte 6 = width, byte 7 = height, 0 means 256).
**Branches**:
- .ico with width/height < 64 → warning
- .ico with width/height ≥ 64 → pass
- .ico too small for header → skip
- Non-.ico files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/ico-min-resolution.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for low-res ICO

---

## TASK 5 — `workspace/no-misleading-image-extension`

**Status**: [x]

**Shell origin**: `check::images_misleading_file_extension` (line 4723)
**What**: Image files must match expected magic bytes. .svg must start with `<svg` or `<?xml`, .webp must start with `RIFF....WEBP`, .ico must start with bytes `00 00 01 00`.
**Branches**:
- .svg not starting with `<` or `<?xml` → error
- .webp not starting with RIFF → error
- .ico not starting with 00 00 01 00 → error
- Matching magic bytes → pass
- Non-image files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/no-misleading-image-extension.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for mismatched content

---

## TASK 6 — `workspace/svg-valid-xml`

**Status**: [x]

**Shell origin**: `check::images_svg_invalid_structure` (line 4782)
**What**: SVG files must be well-formed XML. Checks for balanced `<svg>...</svg>` tags and valid XML declaration.
**Branches**:
- SVG with `<svg` but no closing `</svg>` → error
- SVG without `<svg` tag at all → error
- Well-formed SVG → pass
- Non-.svg files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/svg-valid-xml.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for malformed SVG

---

## TASK 7 — `workspace/ico-requires-multiresolution`

**Status**: [x]

**Shell origin**: `check::images_ico_multiresolution` (line 4817)
**What**: ICO files should contain at least 3 resolution variants. Reads ICONDIR header — bytes 4-5 (LE uint16) = image count.
**Branches**:
- .ico with < 3 images → error
- .ico with ≥ 3 images → pass
- .ico too small for header → skip
- Non-.ico files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/ico-requires-multiresolution.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert error for single-resolution ICO

---

## TASK 8 — `workspace/ico-optimal-palette`

**Status**: [x]

**Shell origin**: `check::images_ico_unoptimized_palette` (line 4859)
**What**: ICO files should use ≤256 colors. Reads ICONDIRENTRY byte 2 (color count). 0 means ≥256 colors (32-bit).
**Branches**:
- .ico with colorCount = 0 (32-bit) → warning
- .ico with colorCount > 0 (≤256 colors) → pass
- .ico too small for header → skip
- Non-.ico files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/ico-optimal-palette.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for 32-bit ICO

---

## TASK 9 — `workspace/webp-no-color-profile`

**Status**: [x]

**Shell origin**: `check::images_webp_color_profile_stripped` (line 4942)
**What**: .webp files must not contain embedded ICC or EXIF color profiles. Scans for ICCP and EXIF chunk FourCC identifiers in the RIFF container.
**Branches**:
- .webp with ICCP or EXIF chunk → warning
- .webp without color profiles → pass
- Non-.webp files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/webp-no-color-profile.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for embedded profiles

---

## TASK 10 — `workspace/webp-yuv420-required`

**Status**: [x]

**Shell origin**: `check::images_webp_yuv420_subsampling` (line 4987)
**What**: .webp files must use YUV420 subsampling. VP8 (lossy) = YUV420 by default. VP8L (lossless) = not YUV420. Checks bytes 12-15 for chunk type.
**Branches**:
- .webp with VP8L (lossless, no YUV420) → warning
- .webp with VP8 (lossy, YUV420) → pass
- .webp with VP8X (extended) → pass (extended can be either)
- .webp too small for header → skip
- Non-.webp files → skip
- readFile fails → skip

**Files**:
- Create: `src/rules/workspace/webp-yuv420-required.ts`
- Test: `src/rules/workspace/workspace-rules.test.ts`

**Verification**: Tests assert warning for lossless .webp

---

## TASK 11 — Duplicate Renames (no new TS rules)

**Status**: [x]

These 2 shell functions are duplicates of existing TS rules:
- `check::images_svg_inaccessible_elements` → already covered by `svg-requires-title-or-desc`
- `check::images_svg_with_script_element_blocked` → already covered by `svg-no-script`

**Plan**: Rename both to `ported::` in `common.checks.sh`

---

## TASK 12 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 10 rules to `.resist-lint.jsonc` with appropriate severities
- Rules 5, 6, 7: `"error"`
- Rules 1, 2, 3, 4, 8, 9, 10: `"warn"`
- Rename all 12 `check::` → `ported::` in `common.checks.sh` (10 ported + 2 duplicates)

**Files**:
- Modify: `.resist-lint.jsonc`
- Modify: `_INTEGRATE/linter/_linter-test-to-convert/common.checks.sh`

**Verification**: All 10 rules in config, 12 functions renamed

---

## TASK 13 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm -w run qa:lint --tools`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 14 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 10 rule files exist
- Verify all 10 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Verify shell function rename count (12 renamed)
- Commit with descriptive message

**Verification**:
- All 10 `.ts` files exist in `src/rules/workspace/`
- All 10 entries in `.resist-lint.jsonc`
- Test count ≥ baseline + new tests
- `grep -c '^ported::' common.checks.sh` = 12
- `grep -c '^check::' common.checks.sh` = 146
