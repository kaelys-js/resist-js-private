# A11y Rules Expansion — Part 1

**Scope:** `determineStandard()` update + 6 new rules
**File:** `packages/shared/ui/src/lens/detect-accessibility.ts`
**Test file:** `packages/shared/ui/src/lens/detect-accessibility.test.ts`

## Tasks

### Task 1: Update `determineStandard()`

Add 4 new standard prefix mappings before the default `WCAG 2.1 AA` return:
- `html-` → `WHATWG`
- `ohara-` → `Best Practice`
- `webaim-` → `WebAIM`
- `a11yproject-` → `A11Y Project`

### Task 2: Rule `pause-stop-hide` (WCAG 2.2.2)

- Category: `Visual`
- Check CSS files for `animation` properties without corresponding `prefers-reduced-motion` media query
- Check Svelte/HTML for `<video autoplay>` or `<audio autoplay>` without adjacent pause controls
- Check for `@keyframes` definitions without a `prefers-reduced-motion` guard

### Task 3: Rule `parsing-duplicate-ids` (WCAG 4.1.1)

- Category: `Standards`
- Scan each Svelte file for all `id="..."` values
- Flag any file containing duplicate id values
- Note in description that WCAG 2.2 deprecated this but 2.1 AA still requires it

### Task 4: Rule `audio-description-aa` (WCAG 1.2.5)

- Category: `Media`
- Check `<video>` elements for `<track kind="descriptions">`
- Pass if no video elements found (not-applicable)
- This is the Level AA companion to existing 1.2.3

### Task 5: Rule `visually-hidden-link-text` (WCAG C7)

- Category: `Utilities`
- Check links (`<a>`) that contain `.sr-only`, `.visually-hidden`, or `VisuallyHidden`
- Verify the visually-hidden pattern uses clip-path technique
- Flag if using `display:none` or `visibility:hidden` (defeats C7 purpose)

### Task 6: Rule `aria-naming-prohibited` (WAI-ARIA)

- Category: `ARIA`
- Check for `aria-label` or `aria-labelledby` on naming-prohibited elements
- Prohibited elements: `<p>`, `<abbr>`, `<b>`, `<em>`, `<i>`, `<code>`, `<small>`, `<strong>`, `<sub>`, `<sup>`, `<span>` (without role)

### Task 7: Rule `aria-hidden-focusable` (WAI-ARIA)

- Category: `ARIA`
- Check for `aria-hidden="true"` on focusable elements
- Focusable: `<button>`, `<a` (with href), `<input>`, `<select>`, `<textarea>`, any element with `tabindex`
- This is a critical a11y violation — hides content from AT while keeping it keyboard-focusable

### Task 8: Write tests for all 6 new rules

- One passing fixture, one failing fixture per rule
- Run `pnpm qa:test` to verify

### Task 9: Run full QA

- `pnpm -w run qa:lint --tools && pnpm qa:lint && pnpm qa:format`
- Fix any issues

### Task 10: Commit

- Commit message: `feat(lens): a11y rules expansion part 1 — WCAG gaps, C7, ARIA naming/hidden`
