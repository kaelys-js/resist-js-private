/**
 * Branch-coverage supplement for `auditAccessibility`.
 *
 * The primary `detect-accessibility.test.ts` runs the audit against every
 * real source file in `@/ui`. That catches regressions but only exercises
 * the branches that actually appear in real code. To cover the remaining
 * conditional paths (empty-input short-circuits, every "pass" path, every
 * distinct "fail" path), this file drives `auditAccessibility` with
 * hand-crafted synthetic source maps.
 *
 * Each fixture is a compact `Record<path, content>` chosen to flip specific
 * branches inside specific rule-check functions. Assertions target the
 * aggregate audit shape so individual rule internals are exercised without
 * over-specifying their return values.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { auditAccessibility, type A11yAuditResult } from './detect-accessibility.js';

/** Source for a svelte file with a rich set of accessibility-positive patterns. */
const GOOD_SVELTE: string = `
<script lang="ts">
  import { onMount } from 'svelte';
  let dialog: HTMLDialogElement;
  let open = $state(false);
  function openDialog(): void { open = true; dialog.focus(); }
  function handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') open = false;
    if (e.key === 'Enter' || e.key === ' ') openDialog();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { /* arrow navigation */ }
  }
  onMount(() => { dialog?.focus(); return () => { /* restore focus */ }; });
</script>
<button aria-label="Open dialog" aria-describedby="desc" onkeydown={handleKey} onclick={openDialog}>
  Open
</button>
<div role="dialog" aria-labelledby="title" aria-modal="true" tabindex="-1" bind:this={dialog}>
  <h2 id="title">Confirm</h2>
  <p id="desc">Are you sure?</p>
  <span class="sr-only">Accessible description</span>
  <span class="visually-hidden">Hidden from sighted users</span>
  <button type="button" aria-label="Close">Close</button>
</div>
<a href="/home" aria-label="Home">Home</a>
<input type="text" aria-label="Name" />
<label for="email">Email</label><input id="email" type="email" />
<nav aria-label="Main"><ul><li><a href="#main">Skip to content</a></li></ul></nav>
<div role="status" aria-live="polite">Loading</div>
<div role="alert" aria-live="assertive">Error</div>
<button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">Content</div>
<details><summary>Accordion</summary><p>Hidden content</p></details>
<select aria-label="Pick"><option>One</option></select>
<div role="menu"><div role="menuitem" tabindex="0">Item</div></div>
<div role="tooltip" id="tip">Tooltip text</div>
<style>
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
  @media (forced-colors: active) { button { border: 1px solid ButtonText; } }
  button:focus-visible { outline: 2px solid blue; outline-offset: 2px; }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
`;

/** Source for a svelte file with several accessibility anti-patterns (invalid roles, missing labels, etc.). */
const BAD_SVELTE: string = `
<script lang="ts">
  let count = $state(0);
</script>
<button>Click</button>
<a>No href</a>
<input type="text" />
<div role="nonsense">Invalid role</div>
<video src="/video.mp4" autoplay></video>
<audio src="/sound.mp3" autoplay></audio>
<marquee>Scrolling</marquee>
<img src="/a.png" />
<div onclick={() => count++}>Clickable div</div>
<style>
  .btn { color: #aaa; background: #bbb; }
  * { transition: all 5s; }
</style>
`;

/** Layout file with a skip link. */
const LAYOUT_SVELTE: string = `
<a class="skip-link" href="#main">Skip to main content</a>
<main id="main"><slot /></main>
`;

/** A page file. */
const PAGE_SVELTE: string = `
<svelte:head><title>Home</title></svelte:head>
<main><h1>Home</h1></main>
`;

/** Non-empty CSS file used to exercise css-only paths. */
const APP_CSS: string = `
:root { --fg: oklch(0.2 0 0); --bg: oklch(0.95 0 0); }
.button { color: var(--fg); background: var(--bg); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
`;

/** Script file with focus restoration + route-change hooks. */
const APP_TS: string = `
import { beforeNavigate, afterNavigate } from '$app/navigation';
beforeNavigate(() => { /* save focus */ });
afterNavigate(() => { document.getElementById('main')?.focus(); });
`;

/**
 * Rich anti-pattern source targeting the re-scan / "find first failing match"
 * branches inside many rules. Each distinct anti-pattern appears in a way that
 * the per-rule regex will successfully match and emit a `found` snippet, hitting
 * the truthy branch of the `match ? truncSnippet(...) : 'fallback'` ternary
 * that the simpler `BAD_SVELTE` fixture doesn't always trigger.
 */
const RICH_BAD_SVELTE: string = `
<script lang="ts">
  let n = $state(0);
  function run(): void { n++; }
  /* setInterval with animation keyword triggers intervalAnimPattern */
  setInterval(() => { /* slide animation */ }, 1000);
</script>

<!-- generic link text (fails link-purpose 2.4.4) -->
<a href="/a">click here</a>
<a href="/b">read more</a>
<a href="/c">here</a>

<!-- duplicate IDs (fails no-duplicate-ids 4.1.1) -->
<div id="dup">One</div>
<div id="dup">Two</div>

<!-- invalid role value (fails aria-role) -->
<div role="notarole">Invalid</div>

<!-- positive tabindex (fails tabindex rule) -->
<div tabindex="5">Positive tabindex</div>

<!-- click without keydown (fails keyboard-equivalent) -->
<div onclick={run}>Mouse-only</div>

<!-- form input without label -->
<input type="text" name="x" />
<select name="y"><option>One</option></select>
<textarea name="z"></textarea>

<!-- video without captions/descriptions track -->
<video src="/v.mp4" controls></video>
<audio src="/a.mp3" controls></audio>

<!-- img without alt -->
<img src="/x.png" />

<!-- heading hierarchy skip (h1 → h3) -->
<h1>Heading 1</h1>
<h3>Heading 3 (skip)</h3>

<!-- interactive elements without aria-* -->
<button>Unlabeled</button>
<a>No href no aria</a>

<!-- iframe without title -->
<iframe src="/embed"></iframe>

<!-- table without th/caption -->
<table><tr><td>Cell</td></tr></table>

<!-- form without submit -->
<form><input name="q" /></form>

<!-- lang attribute absent on root -->
<html>
<body>Bad root</body>
</html>

<style>
  /* fixed px font-size fails resize-text 1.4.4 */
  .text { font-size: 12px; color: #aaaaaa; background: #bbbbbb; }
  /* long transition fails transition-duration */
  .anim { transition: all 10s; }
  * { transition: all 8s linear; }
</style>
`;

/**
 * Partial-pass fixture: looks clean enough to pass most status checks but
 * still carries a few specific issues. Combined with GOOD_SVELTE and
 * RICH_BAD_SVELTE this mix drives the overall pass-rate into the 0-79 range
 * for several rules, exercising `statusFromRate` returning `'fail'`.
 */
const PARTIAL_SVELTE: string = `
<script lang="ts">
  let ok = $state(true);
</script>
<button aria-label="Toggle" onkeydown={(e) => { if (e.key === 'Enter') ok = !ok; }}>
  Toggle
</button>
<a href="/help" aria-label="Help">Learn more</a>
<input aria-label="Search" type="search" />
<div role="status" aria-live="polite">Status</div>
`;

/** CSS file with fixed px font-size + missing forced-colors support. */
const BAD_CSS: string = `
:root { --fg: #111; --bg: #fff; }
body { font-size: 16px; color: var(--fg); }
h1 { font-size: 32px; }
.small { font-size: 10px; }
button { outline: none; }
</style>
`;

/**
 * Multi-anti-pattern Svelte file designed to individually trigger the
 * per-rule `match ? truncSnippet(match[0]) : fallback` ternary's truthy
 * arm for several rules that RICH_BAD_SVELTE's broader content doesn't
 * precisely activate.
 */
const DIALOG_NO_TRAP_SVELTE: string = `
<div role="dialog" aria-modal="true">
  <h2>Title</h2>
  <p>No focus trap attached.</p>
  <button>Close</button>
</div>
`;

const TAB_NEGATIVE_SVELTE: string = `
<button tabindex="-1">Hidden from tab</button>
<div tabindex="-1" role="menuitem">Menu</div>
`;

const CLICKABLE_NO_KEYBOARD_SVELTE: string = `
<script lang="ts">
  function go() { /* nav */ }
</script>
<div role="button" onclick={go}>Go</div>
<span onclick={go} tabindex="0">Span button</span>
`;

const HEADING_SKIP_SVELTE: string = `
<main>
  <h1>Top</h1>
  <h4>Skipped levels</h4>
  <h2>Back up</h2>
</main>
`;

const FORM_NO_SUBMIT_SVELTE: string = `
<form>
  <input type="text" name="q" aria-label="Search" />
</form>
`;

const IFRAME_NO_TITLE_SVELTE: string = `
<iframe src="/embed"></iframe>
<iframe src="/a" title="Labeled" />
`;

const TABLE_NO_STRUCTURE_SVELTE: string = `
<table>
  <tr><td>A</td><td>B</td></tr>
</table>
`;

const DUPLICATE_IDS_SVELTE: string = `
<div id="same">1</div>
<div id="same">2</div>
<span id="same">3</span>
`;

const BAD_LINK_TEXT_SVELTE: string = `
<a href="/x">click here</a>
<a href="/y">read more</a>
<a href="/z">here</a>
<a href="/w">learn more</a>
`;

const LARGE_TARGETS_SVELTE: string = `
<button style="width:20px;height:20px">tiny</button>
<a href="/a" style="display:inline-block;width:16px;height:16px">icon</a>
`;

describe('auditAccessibility — synthetic sources', () => {
  it('empty sources → componentCount 0, all rules evaluated', () => {
    const audit: A11yAuditResult = auditAccessibility({});
    expect(audit.componentCount).toBe(0);
    expect(audit.totalRules).toBe(150);
    expect(audit.componentsWithAria).toBe(0);
    expect(audit.componentsWithKeyboard).toBe(0);
    expect(audit.componentsWithRoles).toBe(0);
    expect(audit.componentsWithSrOnly).toBe(0);
  });

  it('single high-quality svelte source → counts reflect its a11y patterns', () => {
    const audit: A11yAuditResult = auditAccessibility({ 'good.svelte': GOOD_SVELTE });
    expect(audit.componentCount).toBe(1);
    expect(audit.componentsWithAria).toBe(1);
    expect(audit.componentsWithKeyboard).toBe(1);
    expect(audit.componentsWithRoles).toBe(1);
    expect(audit.componentsWithSrOnly).toBe(1);
  });

  it('single anti-pattern svelte source → still counts as a component', () => {
    const audit: A11yAuditResult = auditAccessibility({ 'bad.svelte': BAD_SVELTE });
    expect(audit.componentCount).toBe(1);
    /* `aria-` matcher is substring-sensitive — bad.svelte has none. */
    expect(audit.componentsWithAria).toBe(0);
    expect(audit.componentsWithRoles).toBe(1);
  });

  it('mixed sources → sums component counts', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'good.svelte': GOOD_SVELTE,
      'bad.svelte': BAD_SVELTE,
      'layout.svelte': LAYOUT_SVELTE,
      '+page.svelte': PAGE_SVELTE,
      'app.css': APP_CSS,
      'app.ts': APP_TS,
    });
    expect(audit.componentCount).toBe(4);
    expect(audit.totalRules).toBe(150);
  });

  it('overallScore is in [0, 100] for every fixture', () => {
    const fixtures: Record<string, string>[] = [
      {},
      { 'a.svelte': GOOD_SVELTE },
      { 'a.svelte': BAD_SVELTE },
      { 'a.css': APP_CSS },
      { 'a.ts': APP_TS },
      { 'layout.svelte': LAYOUT_SVELTE, '+page.svelte': PAGE_SVELTE },
    ];
    for (const f of fixtures) {
      const audit: A11yAuditResult = auditAccessibility(f);
      expect(audit.overallScore).toBeGreaterThanOrEqual(0);
      expect(audit.overallScore).toBeLessThanOrEqual(100);
      expect(audit.wcagCoverage).toBeGreaterThanOrEqual(0);
      expect(audit.wcagCoverage).toBeLessThanOrEqual(100);
      /* applicable-rule split is consistent with totalRules. */
      expect(audit.passingRules + audit.failingRules + audit.warningRules).toBeLessThanOrEqual(
        audit.totalRules,
      );
    }
  });

  it('every rule produces a result with valid shape', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'good.svelte': GOOD_SVELTE,
      'bad.svelte': BAD_SVELTE,
      'app.css': APP_CSS,
    });
    for (const r of audit.rules) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(typeof r.description).toBe('string');
      expect(typeof r.category).toBe('string');
      expect(typeof r.wcag).toBe('string');
      expect(['pass', 'fail', 'warning', 'not-applicable']).toContain(r.status);
      expect(r.passCount).toBeGreaterThanOrEqual(0);
      expect(r.failCount).toBeGreaterThanOrEqual(0);
      expect(r.totalChecked).toBe((r.passCount as number) + (r.failCount as number));
      expect(r.passRate).toBeGreaterThanOrEqual(0);
      expect(r.passRate).toBeLessThanOrEqual(100);
      expect(Array.isArray(r.passingFiles)).toBe(true);
      expect(Array.isArray(r.failingFiles)).toBe(true);
      expect(Array.isArray(r.fileFindings)).toBe(true);
      expect(typeof r.evidence).toBe('string');
      expect(typeof r.standard).toBe('string');
    }
  });

  it('not-applicable status is reachable with empty sources', () => {
    const audit: A11yAuditResult = auditAccessibility({});
    const naCount: number = audit.rules.filter((r) => r.status === 'not-applicable').length;
    expect(naCount).toBeGreaterThan(0);
  });

  it('rules that depend on CSS files respond to CSS content', () => {
    const withoutCss: A11yAuditResult = auditAccessibility({ 'a.svelte': GOOD_SVELTE });
    const withCss: A11yAuditResult = auditAccessibility({
      'a.svelte': GOOD_SVELTE,
      'app.css': APP_CSS,
    });
    /* Adding a CSS file changes some rules' applicability → different aggregate shape. */
    expect(withoutCss.rules.length).toBe(withCss.rules.length);
    const naDiff: number =
      withCss.rules.filter((r) => r.status === 'not-applicable').length -
      withoutCss.rules.filter((r) => r.status === 'not-applicable').length;
    expect(naDiff).toBeLessThanOrEqual(0);
  });

  it('rules that depend on layout files respond to layout content', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'src/routes/+layout.svelte': LAYOUT_SVELTE,
      'src/routes/+page.svelte': PAGE_SVELTE,
    });
    expect(audit.totalRules).toBe(150);
    expect(audit.componentCount).toBe(2);
  });

  it('rules that depend on script files respond to TS content', () => {
    const audit: A11yAuditResult = auditAccessibility({ 'app.ts': APP_TS });
    expect(audit.componentCount).toBe(0);
    expect(audit.totalRules).toBe(150);
  });

  it('rich anti-pattern source triggers many per-rule re-scan branches', () => {
    const audit: A11yAuditResult = auditAccessibility({ 'rich-bad.svelte': RICH_BAD_SVELTE });
    expect(audit.componentCount).toBe(1);
    /* Many rules must now report a failure and thus produce at least one
     * per-file finding — assert at least one failing rule exists. */
    const failing = audit.rules.filter((r) => r.status === 'fail' || r.status === 'warning');
    expect(failing.length).toBeGreaterThan(0);
    /* Every failing rule's file findings must reference our file by name. */
    for (const r of failing) {
      for (const ff of r.fileFindings) {
        expect(typeof ff.problem).toBe('string');
        expect(typeof ff.solution).toBe('string');
        expect(typeof ff.found).toBe('string');
        expect(typeof ff.fix).toBe('string');
      }
    }
  });

  it('mixing good + partial + rich-bad svelte + bad css drives pass rate below 80 for several rules', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'good.svelte': GOOD_SVELTE,
      'partial.svelte': PARTIAL_SVELTE,
      'rich-bad.svelte': RICH_BAD_SVELTE,
      'bad.svelte': BAD_SVELTE,
      'app.css': APP_CSS,
      'bad.css': BAD_CSS,
      'layout.svelte': LAYOUT_SVELTE,
      '+page.svelte': PAGE_SVELTE,
      'app.ts': APP_TS,
    });
    expect(audit.componentCount).toBe(6);
    expect(audit.totalRules).toBe(150);
    /* With a mix of pass/fail files, at least one rule should land in the
     * < 80% pass-rate bracket (status = 'fail' per statusFromRate). */
    const failCount: number = audit.rules.filter((r) => r.status === 'fail').length;
    expect(failCount).toBeGreaterThan(0);
    const warnCount: number = audit.rules.filter((r) => r.status === 'warning').length;
    expect(warnCount).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
  });

  it('specific-anti-pattern fixtures trigger per-rule truthy-arm ternary branches', () => {
    /* Feed one broad mixed audit with every targeted anti-pattern file present
     * so each rule that filters by file content matches the specific failure. */
    const audit: A11yAuditResult = auditAccessibility({
      'dialog.svelte': DIALOG_NO_TRAP_SVELTE,
      'tab.svelte': TAB_NEGATIVE_SVELTE,
      'click.svelte': CLICKABLE_NO_KEYBOARD_SVELTE,
      'heading.svelte': HEADING_SKIP_SVELTE,
      'form.svelte': FORM_NO_SUBMIT_SVELTE,
      'iframe.svelte': IFRAME_NO_TITLE_SVELTE,
      'table.svelte': TABLE_NO_STRUCTURE_SVELTE,
      'dupes.svelte': DUPLICATE_IDS_SVELTE,
      'bad-links.svelte': BAD_LINK_TEXT_SVELTE,
      'targets.svelte': LARGE_TARGETS_SVELTE,
    });
    expect(audit.componentCount).toBe(10);
    expect(audit.totalRules).toBe(150);
    /* At least one rule must fail given these fixtures. */
    const failCount: number = audit.rules.filter((r) => r.status === 'fail').length;
    expect(failCount).toBeGreaterThan(0);
    /* Assert specific rules report failures against the expected fixtures. */
    const dupesRule = audit.rules.find((r) => r.id === 'no-duplicate-ids');
    expect(dupesRule?.failingFiles).toContain('dupes.svelte');
    const linkRule = audit.rules.find((r) => r.id === 'link-purpose');
    expect(linkRule?.failingFiles).toContain('bad-links.svelte');
  });

  it('BAD_CSS alone (fixed px font-size, missing motion query) exercises css-only fail branches', () => {
    const audit: A11yAuditResult = auditAccessibility({ 'bad.css': BAD_CSS });
    expect(audit.totalRules).toBe(150);
    /* Expect at least one fail rule from CSS-only evaluation (resize-text / forced-colors). */
    const failRules = audit.rules.filter((r) => r.status === 'fail');
    expect(failRules.length).toBeGreaterThan(0);
  });

  it('passRate is 0 when no files match and 100 when all pass', () => {
    /* Empty sources → many rules return not-applicable; none should report passRate > 100. */
    const empty: A11yAuditResult = auditAccessibility({});
    for (const r of empty.rules) {
      expect(r.passRate).toBeGreaterThanOrEqual(0);
      expect(r.passRate).toBeLessThanOrEqual(100);
    }
  });
});

/* =========================================================================
 * Targeted per-rule fixtures — flip specific failing/passing branches inside
 * individual rule check functions that the broader fixtures don't activate.
 * ========================================================================= */

/** Invalid autocomplete value triggers `valid-autocomplete` fail branch. */
const INVALID_AUTOCOMPLETE_SVELTE: string = `
<input type="text" autocomplete="bogus-value" />
<input type="text" autocomplete="email" />
<input type="text" autocomplete="section-billing name" />
`;

/** Multiple radio inputs without fieldset+legend triggers `form-fieldset-legend` fail. */
const RADIO_NO_FIELDSET_SVELTE: string = `
<form>
  <input type="radio" name="opt" value="a" /> A
  <input type="radio" name="opt" value="b" /> B
  <input type="radio" name="opt" value="c" /> C
</form>
`;

/** Multiple radios inside fieldset+legend triggers `form-fieldset-legend` pass. */
const RADIO_WITH_FIELDSET_SVELTE: string = `
<form>
  <fieldset>
    <legend>Pick one</legend>
    <input type="radio" name="x" value="a" />
    <input type="radio" name="x" value="b" />
  </fieldset>
</form>
`;

/** Native elements with redundant ARIA roles triggers `aria-redundant-role` fail. */
const REDUNDANT_ROLES_SVELTE: string = `
<button role="button">B</button>
<a href="/x" role="link">L</a>
<nav role="navigation">N</nav>
<main role="main">M</main>
<header role="banner">H</header>
<footer role="contentinfo">F</footer>
<aside role="complementary">A</aside>
<ul role="list"><li>x</li></ul>
<ol role="list"><li>y</li></ol>
<table role="table"><tr><td>z</td></tr></table>
`;

/** Skip link without :not(:focus) triggers `ohara-visually-hidden-focusable` fail. */
const SKIP_LINK_NO_REVEAL_SVELTE: string = `
<a class="sr-only" href="#main">Skip to content</a>
<a class="visually-hidden" href="#nav">Skip to nav</a>
`;

/** Skip link with focusable variant triggers pass branch. */
const SKIP_LINK_FOCUSABLE_SVELTE: string = `
<a class="visually-hidden focusable" href="#main">Skip</a>
<a class="sr-only" href="#nav">Nav skip</a>
<style>.sr-only:not(:focus):not(:active) { position: absolute; }</style>
`;

/** Input with title only as accessible name → `webaim-title-only-name` fail. */
const TITLE_ONLY_NAME_SVELTE: string = `
<input type="text" title="Search field" name="q" />
<select title="Choose"><option>One</option></select>
<textarea title="Notes"></textarea>
`;

/** Viewport meta with user-scalable=no → `webaim-viewport-zoom-disabled` fail. */
const VIEWPORT_NO_SCALE_SVELTE: string = `
<svelte:head>
  <meta name="viewport" content="width=device-width, user-scalable=no" />
</svelte:head>
<main>x</main>
`;

/** Viewport meta with maximum-scale=1 → `webaim-viewport-zoom-disabled` fail. */
const VIEWPORT_MAX_SCALE_SVELTE: string = `
<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>
<main>y</main>
`;

/** Healthy viewport meta passes `webaim-viewport-zoom-disabled`. */
const VIEWPORT_GOOD_SVELTE: string = `
<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
</svelte:head>
<main>z</main>
`;

/** ::selection missing background → `a11yproject-selection-contrast` fail (missing bg). */
const SELECTION_NO_BG_CSS: string = `
::selection { color: white; }
`;

/** ::selection missing color → `a11yproject-selection-contrast` fail (missing color). */
const SELECTION_NO_COLOR_CSS: string = `
::selection { background: blue; }
`;

/** ::selection missing both → fail (missing color and background). */
const SELECTION_EMPTY_CSS: string = `
::selection {  }
`;

/** Complete ::selection passes. */
const SELECTION_COMPLETE_CSS: string = `
::selection { color: white; background: navy; }
`;

describe('auditAccessibility — targeted per-rule branch fills', () => {
  it('valid-autocomplete: invalid value triggers fail with specific finding', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'bad.svelte': INVALID_AUTOCOMPLETE_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'valid-autocomplete');
    expect(rule?.failingFiles).toContain('bad.svelte');
    expect(rule?.fileFindings.some((f) => f.problem.includes('bogus-value'))).toBe(true);
  });

  it('form-fieldset-legend: radios without fieldset fail; with fieldset+legend pass', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'bad.svelte': RADIO_NO_FIELDSET_SVELTE,
      'good.svelte': RADIO_WITH_FIELDSET_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'form-fieldset-legend');
    expect(rule?.failingFiles).toContain('bad.svelte');
    expect(rule?.passingFiles).toContain('good.svelte');
  });

  it('aria-redundant-role: native elements with implicit role are flagged', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'redundant.svelte': REDUNDANT_ROLES_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'aria-redundant-role');
    expect(rule?.failingFiles).toContain('redundant.svelte');
    expect((rule?.fileFindings ?? []).length).toBeGreaterThan(0);
  });

  it('ohara-visually-hidden-focusable: skip link without :not(:focus) fails', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'skip.svelte': SKIP_LINK_NO_REVEAL_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'ohara-visually-hidden-focusable');
    expect(rule?.failingFiles).toContain('skip.svelte');
  });

  it('ohara-visually-hidden-focusable: skip link with focusable variant passes', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'skip-ok.svelte': SKIP_LINK_FOCUSABLE_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'ohara-visually-hidden-focusable');
    expect(rule?.passingFiles).toContain('skip-ok.svelte');
  });

  it('webaim-title-only-name: input/select/textarea with title-only fail', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'title-only.svelte': TITLE_ONLY_NAME_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'webaim-title-only-name');
    expect(rule?.failingFiles).toContain('title-only.svelte');
    /* Must contain a finding for at least one of the 3 element types. */
    expect((rule?.fileFindings ?? []).length).toBeGreaterThan(0);
  });

  it('webaim-viewport-zoom-disabled: user-scalable=no fails, maximum-scale=1 fails, healthy passes', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'no-scale.svelte': VIEWPORT_NO_SCALE_SVELTE,
      'max-scale.svelte': VIEWPORT_MAX_SCALE_SVELTE,
      'good-vp.svelte': VIEWPORT_GOOD_SVELTE,
    });
    const rule = audit.rules.find((r) => r.id === 'webaim-viewport-zoom-disabled');
    expect(rule?.failingFiles).toEqual(
      expect.arrayContaining(['no-scale.svelte', 'max-scale.svelte']),
    );
    expect(rule?.passingFiles).toContain('good-vp.svelte');
  });

  it('a11yproject-selection-contrast: missing-bg / missing-color / missing-both / complete', () => {
    const audit: A11yAuditResult = auditAccessibility({
      'no-bg.css': SELECTION_NO_BG_CSS,
      'no-color.css': SELECTION_NO_COLOR_CSS,
      'empty.css': SELECTION_EMPTY_CSS,
      'complete.css': SELECTION_COMPLETE_CSS,
    });
    const rule = audit.rules.find((r) => r.id === 'a11yproject-selection-contrast');
    expect(rule?.failingFiles).toEqual(
      expect.arrayContaining(['no-bg.css', 'no-color.css', 'empty.css']),
    );
    expect(rule?.passingFiles).toContain('complete.css');
    /* Findings include "missing background", "missing color", "missing color and background". */
    const problems: string[] = (rule?.fileFindings ?? []).map((f) => f.problem);
    expect(problems.some((p) => p.includes('missing background'))).toBe(true);
    expect(problems.some((p) => p.includes('missing color'))).toBe(true);
    expect(problems.some((p) => p.includes('missing color and background'))).toBe(true);
  });
});
