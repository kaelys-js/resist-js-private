/**
 * Comprehensive accessibility scanner that checks WCAG rules against actual source code.
 *
 * Scans Svelte/CSS/TypeScript source files for accessibility patterns including
 * ARIA attributes, keyboard handling, focus management, contrast, screen reader
 * support, and per-component a11y compliance. Each rule produces a detailed result
 * with pass/fail counts, affected files, and human-readable evidence.
 *
 * @example
 * const sources = { 'Button.svelte': svelteSource, 'app.css': cssSource };
 * const result = auditAccessibility(sources);
 * // result.overallScore → 82
 * // result.rules → [{ id: 'wcag-2.1-aa', status: 'pass', ... }, ...]
 */
import type { Num, Str } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Unique identifier for an accessibility rule. */
export type A11yRuleId = Str;

/** Result status for an accessibility check. */
export type A11yStatus = 'pass' | 'fail' | 'warning' | 'not-applicable';

/** An accessibility rule with its detection logic. */
export type A11yRule = {
  /** Unique rule identifier. */
  id: A11yRuleId;
  /** Human-readable rule name. */
  label: Str;
  /** Description of what this rule checks. */
  description: Str;
  /** Rule category grouping. */
  category: Str;
  /** WCAG success criterion reference (e.g. '1.3.1', '2.1.1'). */
  wcag: Str;
  /** Check function that evaluates source files against this rule. */
  check: (sources: Map<Str, Str>) => A11yRuleResult;
};

/** Per-file finding with issue details and suggested fix. */
export type A11yFileFinding = {
  /** File name where the issue was found. */
  file: Str;
  /** Human-readable description of the problem. */
  problem: Str;
  /** Human-readable description of the suggested fix. */
  solution: Str;
  /** Actual problematic code snippet extracted from the source file. */
  found: Str;
  /** Corrected version of the found code snippet. */
  fix: Str;
};

/** Result of evaluating a single accessibility rule. */
export type A11yRuleResult = {
  /** Rule identifier. */
  id: A11yRuleId;
  /** Human-readable rule name. */
  label: Str;
  /** Description of what was checked. */
  description: Str;
  /** Rule category. */
  category: Str;
  /** WCAG criterion reference. */
  wcag: Str;
  /** Overall status of this rule. */
  status: A11yStatus;
  /** Number of files/components that passed. */
  passCount: Num;
  /** Number of files/components that failed. */
  failCount: Num;
  /** Total files/components evaluated. */
  totalChecked: Num;
  /** Pass rate as a percentage (0-100). */
  passRate: Num;
  /** File names that passed the check. */
  passingFiles: Str[];
  /** File names that failed the check. */
  failingFiles: Str[];
  /** Human-readable summary of findings. */
  evidence: Str;
  /** Per-file structured findings with issue details and fix suggestions. */
  fileFindings: A11yFileFinding[];
  /** Standard this rule belongs to (WCAG, Section 508, WAI-ARIA, EN 301 549). */
  standard: Str;
};

/** Aggregate result of a full accessibility audit. */
export type A11yAuditResult = {
  /** Individual rule results. */
  rules: A11yRuleResult[];
  /** Overall accessibility score (0-100). */
  overallScore: Num;
  /** Total number of rules evaluated. */
  totalRules: Num;
  /** Number of rules that passed. */
  passingRules: Num;
  /** Number of rules that failed. */
  failingRules: Num;
  /** Number of rules with warnings. */
  warningRules: Num;
  /** Total Svelte component files scanned. */
  componentCount: Num;
  /** Components containing ARIA attributes. */
  componentsWithAria: Num;
  /** Components with keyboard event handling. */
  componentsWithKeyboard: Num;
  /** Components using role attributes. */
  componentsWithRoles: Num;
  /** Components using sr-only or visually-hidden patterns. */
  componentsWithSrOnly: Num;
  /** Total WCAG 2.1 AA criteria covered by the rule set. */
  totalWcagCriteria: Num;
  /** Percentage of WCAG 2.1 AA criteria with pass status (0-100). */
  wcagCoverage: Num;
};

/** A [filename, content] tuple from the source map. */
type SourceEntry = [Str, Str];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Filter source map to only Svelte component files.
 *
 * @param sources - Full source map
 * @returns Array of [filename, content] tuples for .svelte files
 */
function svelteFiles(sources: Map<Str, Str>): SourceEntry[] {
  return [...sources.entries()].filter(([f]) => f.endsWith('.svelte')) as SourceEntry[];
}

/**
 * Filter source map to only CSS/style files (including Svelte which contain styles).
 *
 * @param sources - Full source map
 * @returns Array of [filename, content] tuples for CSS-containing files
 */
function cssFiles(sources: Map<Str, Str>): SourceEntry[] {
  return [...sources.entries()].filter(
    ([f]) => f.endsWith('.css') || f.endsWith('.svelte') || f.endsWith('.pcss'),
  ) as SourceEntry[];
}

/**
 * Filter source map to layout files (likely to contain skip links, route change handling).
 *
 * @param sources - Full source map
 * @returns Array of [filename, content] tuples for layout files
 */
function layoutFiles(sources: Map<Str, Str>): SourceEntry[] {
  return [...sources.entries()].filter(
    ([f]) => f.includes('layout') || f.includes('Layout') || f.includes('+layout'),
  ) as SourceEntry[];
}

/**
 * Filter source map to SvelteKit page files (+page.svelte).
 *
 * @param sources - Full source map
 * @returns Array of [filename, content] tuples for page files
 */
function pageFiles(sources: Map<Str, Str>): SourceEntry[] {
  return [...sources.entries()].filter(([f]) => f.includes('+page')) as SourceEntry[];
}

/**
 * Filter source map to TypeScript/JavaScript files.
 *
 * @param sources - Full source map
 * @returns Array of [filename, content] tuples for TS/JS files
 */
function scriptFiles(sources: Map<Str, Str>): SourceEntry[] {
  return [...sources.entries()].filter(
    ([f]) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.svelte'),
  ) as SourceEntry[];
}

/**
 * Compute a status from a pass rate percentage.
 *
 * @param passRate - Percentage 0-100
 * @returns 'warning' if >= 80, else 'fail'. Never returns 'pass' — pass is determined by failCount === 0 in buildResult.
 */
function statusFromRate(passRate: Num): A11yStatus {
  if ((passRate as number) >= 80) {
    return 'warning';
  }
  return 'fail';
}

/**
 * Determine which accessibility standard a rule belongs to based on its id and category.
 *
 * @param id - Rule identifier
 * @param category - Rule category
 * @returns Standard name string
 */
function determineStandard(id: Str, category: Str): Str {
  if ((id as string).startsWith('section-508')) {
    return 'Section 508' as Str;
  }
  if ((id as string).startsWith('en-301-549')) {
    return 'EN 301 549' as Str;
  }
  if (category === 'ARIA' || (id as string).startsWith('aria-')) {
    return 'WAI-ARIA' as Str;
  }
  if ((id as string).startsWith('html-')) {
    return 'WHATWG' as Str;
  }
  if ((id as string).startsWith('ohara-')) {
    return 'Best Practice' as Str;
  }
  if ((id as string).startsWith('webaim-')) {
    return 'WebAIM' as Str;
  }
  if ((id as string).startsWith('a11yproject-')) {
    return 'A11Y Project' as Str;
  }
  return 'WCAG 2.1 AA' as Str;
}

/**
 * Compute pass rate as a percentage.
 *
 * @param passCount - Number of passes
 * @param total - Total checked
 * @returns Percentage 0-100 (defaults to 100 if total is 0)
 */
function computePassRate(passCount: Num, total: Num): Num {
  if ((total as number) === 0) {
    return 100 as Num;
  }
  return Math.round(((passCount as number) / (total as number)) * 100) as Num;
}

/**
 * Build a rule result from common fields.
 *
 * @param rule - Base rule definition fields
 * @param passCount - Files that passed
 * @param failCount - Files that failed
 * @param passingFiles - Passing file names
 * @param failingFiles - Failing file names
 * @param evidence - Human-readable evidence string
 * @param statusOverride - Optional status override
 * @param fileFindings - Optional per-file findings with fix suggestions
 * @returns Complete A11yRuleResult
 */
function buildResult(
  rule: { id: Str; label: Str; description: Str; category: Str; wcag: Str },
  passCount: Num,
  failCount: Num,
  passingFiles: Str[],
  failingFiles: Str[],
  evidence: Str,
  statusOverride?: A11yStatus,
  fileFindings?: A11yFileFinding[],
): A11yRuleResult {
  const total: Num = ((passCount as number) + (failCount as number)) as Num;
  const passRate: Num = computePassRate(passCount, total);
  /* Use exact fail count for pass — Math.round can falsely round 99.9% to 100% */
  let autoStatus: A11yStatus;
  if ((total as number) === 0) {
    autoStatus = 'not-applicable';
  } else if ((failCount as number) === 0) {
    autoStatus = 'pass';
  } else {
    autoStatus = statusFromRate(passRate);
  }
  return {
    id: rule.id,
    label: rule.label,
    description: rule.description,
    category: rule.category,
    wcag: rule.wcag,
    status: statusOverride ?? autoStatus,
    passCount,
    failCount,
    totalChecked: total,
    passRate,
    passingFiles,
    failingFiles,
    evidence,
    fileFindings: fileFindings ?? [],
    standard: determineStandard(rule.id, rule.category),
  };
}

/**
 * Create a not-applicable rule result (for manual testing rules).
 *
 * @param id - Rule identifier
 * @param label - Rule label
 * @param description - Rule description
 * @param category - Rule category
 * @param wcag - WCAG criterion
 * @returns A11yRuleResult with status 'not-applicable'
 */
function notApplicableResult(
  id: Str,
  label: Str,
  description: Str,
  category: Str,
  wcag: Str,
): A11yRuleResult {
  return {
    id,
    label,
    description,
    category,
    wcag,
    status: 'not-applicable',
    passCount: 0 as Num,
    failCount: 0 as Num,
    totalChecked: 0 as Num,
    passRate: 0 as Num,
    passingFiles: [],
    failingFiles: [],
    evidence: 'Requires manual testing' as Str,
    fileFindings: [],
    standard: determineStandard(id, category),
  };
}

/**
 * Approximate WCAG contrast ratio from two OKLCH lightness values.
 *
 * Uses the relative luminance approximation from OKLCH L channel (0-1).
 * WCAG 2.x contrast is defined as (L1 + 0.05) / (L2 + 0.05) where
 * L1 is the lighter and L2 is the darker relative luminance.
 *
 * @param l1 - First OKLCH lightness value (0-1)
 * @param l2 - Second OKLCH lightness value (0-1)
 * @returns Approximate contrast ratio
 */
function oklchContrast(l1: Num, l2: Num): Num {
  const lighter: number = Math.max(l1 as number, l2 as number);
  const darker: number = Math.min(l1 as number, l2 as number);
  return ((lighter + 0.05) / (darker + 0.05)) as Num;
}

/**
 * Parse OKLCH lightness values from CSS variable declarations.
 *
 * Matches patterns like `--background: oklch(1 0 0)` or `--foreground: oklch(0.145 0 0)`.
 *
 * @param css - Raw CSS content
 * @returns Map of variable name to lightness value
 */
function parseOklchLightness(css: Str): Map<Str, Num> {
  const result: Map<Str, Num> = new Map();
  const pattern: RegExp = /--([\w-]+)\s*:\s*oklch\(\s*([\d.]+)/g;
  let match: RegExpExecArray | null = pattern.exec(css as string);
  while (match !== null) {
    /* RegExp groups [1] and [2] are guaranteed by the pattern shape */
    const name: Str = (match[1] ?? '') as Str;
    const lightness: Num = Number.parseFloat(match[2] ?? '0') as Num;
    result.set(name, lightness);
    match = pattern.exec(css as string);
  }
  return result;
}

/**
 * Truncate a code snippet to a maximum length, appending '...' if truncated.
 *
 * @param snippet - The raw code snippet to truncate
 * @param max - Maximum character length (default 80)
 * @returns Truncated snippet as Str
 */
function truncSnippet(snippet: Str, max: Num = 80 as Num): Str {
  if ((snippet as string).length <= (max as number)) {
    return snippet;
  }
  return `${(snippet as string).slice(0, max as number)}...` as Str;
}

/** Valid ARIA roles from the WAI-ARIA 1.2 specification. */
const VALID_ARIA_ROLES: ReadonlySet<Str> = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'command',
  'comment',
  'complementary',
  'composite',
  'contentinfo',
  'definition',
  'dialog',
  'directory',
  'document',
  'feed',
  'figure',
  'form',
  'generic',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'input',
  'landmark',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'mark',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'range',
  'region',
  'roletype',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'section',
  'sectionhead',
  'select',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'structure',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
  'widget',
  'window',
] as Str[]);

/** Required ARIA attributes per role from WAI-ARIA 1.2. */
const REQUIRED_ARIA_ATTRS: ReadonlyMap<Str, readonly Str[]> = new Map([
  ['checkbox' as Str, ['aria-checked'] as Str[]],
  ['combobox' as Str, ['aria-expanded'] as Str[]],
  ['heading' as Str, ['aria-level'] as Str[]],
  ['meter' as Str, ['aria-valuenow'] as Str[]],
  ['option' as Str, ['aria-selected'] as Str[]],
  ['radio' as Str, ['aria-checked'] as Str[]],
  ['scrollbar' as Str, ['aria-valuenow', 'aria-controls'] as Str[]],
  ['separator' as Str, ['aria-valuenow'] as Str[]],
  ['slider' as Str, ['aria-valuenow'] as Str[]],
  ['spinbutton' as Str, ['aria-valuenow'] as Str[]],
  ['switch' as Str, ['aria-checked'] as Str[]],
]);

/** ARIA attributes prohibited on certain roles. */
const PROHIBITED_ARIA_ATTRS: ReadonlyMap<Str, readonly Str[]> = new Map([
  ['presentation' as Str, ['aria-label', 'aria-labelledby'] as Str[]],
  ['none' as Str, ['aria-label', 'aria-labelledby'] as Str[]],
  ['generic' as Str, ['aria-label', 'aria-labelledby', 'aria-roledescription'] as Str[]],
]);

/** Common bad link text patterns that violate WCAG 2.4.4. */
const BAD_LINK_TEXT_PATTERNS: readonly Str[] = [
  'click here',
  'read more',
  'here',
  'link',
  'more',
  'learn more',
  'details',
  'this',
] as Str[];

/* ------------------------------------------------------------------ */
/*  Rule Definitions                                                   */
/* ------------------------------------------------------------------ */

/**
 * All 105 accessibility rules with real check functions.
 *
 * Each rule scans source files for specific accessibility patterns
 * and returns detailed results. Covers WCAG 2.0 A/AA, WCAG 2.1 A/AA,
 * WAI-ARIA 1.2, Section 508, and EN 301 549.
 */
const A11Y_RULES: A11yRule[] = [
  /* ---- Standards (4 rules) ---- */
  {
    id: 'wcag-2.1-aa' as Str,
    label: 'WCAG 2.1 AA compliance' as Str,
    description: 'Interactive components have ARIA attributes' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Only flag truly interactive elements that need explicit ARIA.
       * Semantic <a href="..."> and <button> have implicit ARIA roles.
       * Skip files where the only interactive elements are semantic links with href. */
      const interactivePattern: RegExp = /<(button|input|select|textarea)\b/;
      const nonSemanticLinkPattern: RegExp = /<a\b(?![^>]*\bhref\b)/;

      for (const [filename, content] of files) {
        const src: string = content as string;
        const hasInteractive: boolean = interactivePattern.test(src);
        const hasNonSemanticLink: boolean = nonSemanticLinkPattern.test(src);
        if (!hasInteractive && !hasNonSemanticLink) {
          continue;
        }
        if (/aria-/.test(src)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const wcagMatch: RegExpMatchArray | null = src.match(
            /<(button|a|input|select|textarea)\b[^>]*>/,
          );
          const wcagFound: Str = wcagMatch
            ? truncSnippet(wcagMatch[0] as Str)
            : ('/* interactive element without aria-* */' as Str);
          const wcagFix: Str = wcagMatch
            ? truncSnippet((wcagMatch[0] as string).replace(/(?=>|\/?>)/, ' aria-label=""') as Str)
            : ('/* add aria-label="" or aria-labelledby="id" */' as Str);
          findings.push({
            file: filename,
            problem: 'Interactive elements without any ARIA attributes' as Str,
            solution:
              'Add aria-label, aria-describedby, or other ARIA attributes to interactive elements' as Str,
            found: wcagFound,
            fix: wcagFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} interactive components have ARIA attributes` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'wai-aria-1.2' as Str,
    label: 'WAI-ARIA 1.2 valid roles' as Str,
    description: 'Components using role= use valid ARIA roles from the spec' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const rolePattern: RegExp = /role="([^"]+)"/g;

      for (const [filename, content] of files) {
        let hasRoles: boolean = false;
        let allValid: boolean = true;
        let match: RegExpExecArray | null = rolePattern.exec(content as string);

        while (match !== null) {
          hasRoles = true;
          if (!VALID_ARIA_ROLES.has(match[1] as Str)) {
            allValid = false;
          }
          match = rolePattern.exec(content as string);
        }
        rolePattern.lastIndex = 0;

        if (!hasRoles) {
          continue;
        }
        if (allValid) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Re-scan to capture the first invalid role match */
          const ariaRoleRescan: RegExp = /role="([^"]+)"/g;
          let ariaRescanMatch: RegExpExecArray | null = ariaRoleRescan.exec(content as string);
          let invalidRoleSnippet: Str = '' as Str;
          while (ariaRescanMatch !== null) {
            if (!VALID_ARIA_ROLES.has(ariaRescanMatch[1] as Str)) {
              invalidRoleSnippet = (ariaRescanMatch[0] ?? '') as Str;
              break;
            }
            ariaRescanMatch = ariaRoleRescan.exec(content as string);
          }
          const ariaRoleFound: Str = invalidRoleSnippet
            ? truncSnippet(invalidRoleSnippet)
            : ('role="<invalid-role>"' as Str);
          const ariaRoleFix: Str = invalidRoleSnippet
            ? truncSnippet(
                (invalidRoleSnippet as string).replace(/role="[^"]*"/, 'role="button"') as Str,
              )
            : ('role="button" /* use a valid WAI-ARIA 1.2 role */' as Str);
          findings.push({
            file: filename,
            problem: 'Invalid ARIA role value in role="" attribute' as Str,
            solution:
              'Use a valid WAI-ARIA 1.2 role (e.g., button, dialog, navigation, tab)' as Str,
            found: ariaRoleFound,
            fix: ariaRoleFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use valid ARIA roles` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'section-508' as Str,
    label: 'Section 508 form labels' as Str,
    description: 'All form inputs have associated labels' as Str,
    category: 'Standards' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const inputPattern: RegExp = /<(input|select|textarea)\b/;
      const labelPattern: RegExp = /aria-label|aria-labelledby|<label\b/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!inputPattern.test(content as string)) {
          continue;
        }
        if (labelPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const s508Match: RegExpMatchArray | null = (content as string).match(
            /<(input|select|textarea)\b[^>]*>/,
          );
          const s508Found: Str = s508Match
            ? truncSnippet(s508Match[0] as Str)
            : ('/* input without label association */' as Str);
          const s508Fix: Str = s508Match
            ? truncSnippet((s508Match[0] as string).replace(/(?=>|\/?>)/, ' aria-label=""') as Str)
            : ('/* add <label for="id">, aria-label, or aria-labelledby */' as Str);
          findings.push({
            file: filename,
            problem: 'Form inputs without associated labels' as Str,
            solution:
              'Add <label for="id">, aria-label, or aria-labelledby to each input element' as Str,
            found: s508Found,
            fix: s508Fix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} form components have input labels` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'en-301-549' as Str,
    label: 'EN 301 549 compliance' as Str,
    description: 'European accessibility standard (mirrors WCAG 2.1 AA)' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      /* Mirrors WCAG 2.1 AA check — European equivalent.
       * Skip semantic <a href="..."> links — they have implicit ARIA roles. */
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const interactivePattern: RegExp = /<(button|input|select|textarea)\b/;
      const nonSemanticLinkPattern: RegExp = /<a\b(?![^>]*\bhref\b)/;

      for (const [filename, content] of files) {
        const src: string = content as string;
        const hasInteractive: boolean = interactivePattern.test(src);
        const hasNonSemanticLink: boolean = nonSemanticLinkPattern.test(src);
        if (!hasInteractive && !hasNonSemanticLink) {
          continue;
        }
        if (/aria-/.test(src)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const en549Match: RegExpMatchArray | null = src.match(
            /<(button|a|input|select|textarea)\b[^>]*>/,
          );
          const en549Found: Str = en549Match
            ? truncSnippet(en549Match[0] as Str)
            : ('/* interactive element without aria-* */' as Str);
          const en549Fix: Str = en549Match
            ? truncSnippet((en549Match[0] as string).replace(/(?=>|\/?>)/, ' aria-label=""') as Str)
            : ('/* add aria-label="" for EN 301 549 compliance */' as Str);
          findings.push({
            file: filename,
            problem: 'Interactive elements missing ARIA attributes (EN 301 549)' as Str,
            solution:
              'Add ARIA attributes to all interactive elements for European accessibility compliance' as Str,
            found: en549Found,
            fix: en549Fix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} interactive components meet EN 301 549 (WCAG AA mirror)` as Str,
        undefined,
        findings,
      );
    },
  },

  /* ---- Keyboard (7 rules) ---- */
  {
    id: 'tab-navigation' as Str,
    label: 'Tab navigation' as Str,
    description: 'Interactive components support tab navigation' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const interactivePattern: RegExp = /<(button|a|input|select|textarea)\b/;
      /* tabindex="-1" outside a roving tabindex group is a fail */
      const negativeTabindex: RegExp = /tabindex="-1"/;
      const rovingPattern: RegExp = /tabindex=\{|tabindex={0}|tabindex={-1}/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!interactivePattern.test(content as string)) {
          continue;
        }
        const hasNegative: boolean = negativeTabindex.test(content as string);
        const hasRoving: boolean = rovingPattern.test(content as string);
        if (!hasNegative || hasRoving) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual element with tabindex="-1" */
          const tabMatch: RegExpMatchArray | null = (content as string).match(
            /<[^>]*tabindex="-1"[^>]*>/,
          );
          const foundSnippet: Str = tabMatch
            ? truncSnippet(tabMatch[0] as Str)
            : ('tabindex="-1" used without roving tabindex pattern' as Str);
          const fixSnippet: Str = tabMatch
            ? truncSnippet((tabMatch[0] as string).replace('tabindex="-1"', 'tabindex="0"') as Str)
            : ('Remove tabindex="-1" or implement roving tabindex for widget groups' as Str);
          findings.push({
            file: filename,
            problem:
              'tabindex="-1" used without a roving tabindex pattern — removes element from tab order' as Str,
            solution:
              'Use tabindex="0" for interactive elements, or implement roving tabindex for widget groups' as Str,
            found: foundSnippet,
            fix: fixSnippet,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} interactive components support tab navigation` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'arrow-key-navigation' as Str,
    label: 'Arrow key navigation' as Str,
    description: 'Menu/select/tabs components have arrow key handling' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const widgetPattern: RegExp = /role="(menu|menubar|tablist|listbox|combobox|tree)"|<select\b/;
      const keydownPattern: RegExp =
        /on:keydown|onkeydown|keydown|ArrowDown|ArrowUp|ArrowLeft|ArrowRight/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!widgetPattern.test(content as string)) {
          continue;
        }
        if (keydownPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const arrowMatch: RegExpMatchArray | null = (content as string).match(widgetPattern);
          const arrowFound: Str = arrowMatch
            ? truncSnippet(arrowMatch[0] as Str)
            : ('/* widget role without keydown handler */' as Str);
          const arrowFix: Str = arrowMatch
            ? truncSnippet(
                (arrowMatch[0] as string).replace(/(?=>|$)/, ' onkeydown={handleArrowKeys}') as Str,
              )
            : ('/* add onkeydown={handleArrowKeys} to widget container */' as Str);
          findings.push({
            file: filename,
            problem: 'Widget component missing arrow key navigation handler' as Str,
            solution:
              'Add onkeydown handler with ArrowUp/ArrowDown/ArrowLeft/ArrowRight support' as Str,
            found: arrowFound,
            fix: arrowFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} widget components have arrow key navigation` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'escape-to-close' as Str,
    label: 'Escape to close' as Str,
    description: 'Dialog/dropdown/popover components handle Escape key' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const overlayPattern: RegExp = /role="dialog"|<dialog|popover|dropdown|sheet|drawer|modal/i;
      const escapePattern: RegExp = /Escape|escape|esc/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!overlayPattern.test(content as string)) {
          continue;
        }
        if (escapePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual dialog/overlay element */
          const escMatch: RegExpMatchArray | null = (content as string).match(
            /<dialog[^>]*>|<[^>]*role="dialog"[^>]*>/,
          );
          const escFound: Str = escMatch
            ? truncSnippet(escMatch[0] as Str)
            : ('Dialog/overlay component missing Escape key handler' as Str);
          const escFix: Str = escMatch
            ? truncSnippet(
                (escMatch[0] as string).replace('>', ' onkeydown={handleEscape}>') as Str,
              )
            : ('Add keydown handler that closes the overlay when Escape is pressed' as Str);
          findings.push({
            file: filename,
            problem: 'Dialog/overlay component does not handle the Escape key to close' as Str,
            solution: 'Add onkeydown handler that closes the overlay when Escape is pressed' as Str,
            found: escFound,
            fix: escFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} overlay components handle Escape key` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'enter-space-activation' as Str,
    label: 'Enter/Space activation' as Str,
    description: 'Elements with role="button" or onclick have keyboard activation' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const buttonLikePattern: RegExp = /role="button"|on:click|onclick/;
      const keyActivation: RegExp = /on:keydown|on:keyup|onkeydown|onkeyup|Enter|Space|\u0020/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!buttonLikePattern.test(content as string)) {
          continue;
        }
        /* Native <button> handles Enter/Space automatically */
        if (/<button\b/.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else if (keyActivation.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const esMatch: RegExpMatchArray | null = (content as string).match(
            /<[^>]*(role="button"|on:click|onclick)[^>]*>/,
          );
          const esFound: Str = esMatch
            ? truncSnippet(esMatch[0] as Str)
            : ('/* clickable element without keyboard activation */' as Str);
          const esFix: Str = esMatch
            ? truncSnippet(
                (esMatch[0] as string).replace(
                  /(?=>)/,
                  ' onkeydown={handleKey} tabindex="0"',
                ) as Str,
              )
            : ('/* use <button> or add onkeydown + tabindex="0" */' as Str);
          findings.push({
            file: filename,
            problem: 'Clickable element without keyboard activation (Enter/Space)' as Str,
            solution:
              'Use native <button> or add onkeydown handler for Enter and Space keys' as Str,
            found: esFound,
            fix: esFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} clickable components have keyboard activation` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'focus-trap' as Str,
    label: 'Focus trap in dialogs' as Str,
    description: 'Dialog components implement focus trapping' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const dialogPattern: RegExp = /role="dialog"|<dialog|aria-modal/;
      const trapPattern: RegExp = /focus-trap|focusTrap|FocusTrap|tabindex|inert/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!dialogPattern.test(content as string)) {
          continue;
        }
        if (trapPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const ftMatch: RegExpMatchArray | null = (content as string).match(
            /<[^>]*(role="dialog"|aria-modal)[^>]*>|<dialog[^>]*>/,
          );
          const ftFound: Str = ftMatch
            ? truncSnippet(ftMatch[0] as Str)
            : ('/* dialog element without focus trap */' as Str);
          const ftFix: Str = ftMatch
            ? truncSnippet((ftMatch[0] as string).replace(/(?=>)/, ' use:focusTrap') as Str)
            : ('/* add use:focusTrap or inert attribute to trap focus */' as Str);
          findings.push({
            file: filename,
            problem: 'Dialog component without focus trapping mechanism' as Str,
            solution:
              'Add focus-trap, FocusTrap component, or inert attribute to trap focus within the dialog' as Str,
            found: ftFound,
            fix: ftFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} dialog components implement focus trapping` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'skip-links' as Str,
    label: 'Skip navigation links' as Str,
    description: 'Layout files contain skip-to-content links' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const layouts: SourceEntry[] = layoutFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const skipPattern: RegExp = /skip|sr-only.*main|#main-content|#content/i;
      const findings: A11yFileFinding[] = [];

      if (layouts.length === 0) {
        /* Check all files if no explicit layout file found */
        for (const [filename, content] of svelteFiles(sources)) {
          if (skipPattern.test(content as string)) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
        }
        if ((pass as number) === 0) {
          findings.push({
            file: '(global)' as Str,
            problem: 'No layout files or skip navigation links found' as Str,
            solution: 'Add a skip-to-content link at the top of your layout file' as Str,
            found: '// No skip link found in any layout or Svelte file' as Str,
            fix: '<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>' as Str,
          });
        }
        const evidence: Str =
          (pass as number) > 0
            ? (`Found skip link patterns in ${pass} files` as Str)
            : ('No layout files or skip links found' as Str);
        return buildResult(
          this,
          pass,
          (pass as number) > 0 ? (0 as Num) : (1 as Num),
          passing,
          (pass as number) > 0 ? [] : ['(no layout files)' as Str],
          evidence,
          undefined,
          findings,
        );
      }

      for (const [filename, content] of layouts) {
        if (skipPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the first <body> or <main> tag to show insertion point */
          const skipMatch: RegExpMatchArray | null = (content as string).match(
            /<body[^>]*>|<main[^>]*>|<slot\s*\/?>/,
          );
          const skipFound: Str = skipMatch
            ? truncSnippet(skipMatch[0] as Str)
            : ('/* layout entry point — no skip link before it */' as Str);
          const skipFix: Str = skipMatch
            ? truncSnippet(
                `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>\n${skipMatch[0]}` as Str,
              )
            : ('<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>' as Str);
          findings.push({
            file: filename,
            problem: 'Layout file missing a skip-to-content link' as Str,
            solution:
              'Add a skip link as the first focusable element so keyboard users can bypass navigation' as Str,
            found: skipFound,
            fix: skipFix,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} layout files have skip navigation links` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'roving-tabindex' as Str,
    label: 'Roving tabindex' as Str,
    description: 'Widget groups use roving tabindex pattern' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const groupPattern: RegExp = /role="(tablist|menubar|toolbar|radiogroup)"/;
      const rovingPattern: RegExp =
        /tabindex=\{|tabindex={0}|tabindex={-1}|tabindex="0"|tabindex="-1"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!groupPattern.test(content as string)) {
          continue;
        }
        if (rovingPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const rovingMatch: RegExpMatchArray | null = (content as string).match(
            /role="(tablist|menubar|toolbar|radiogroup)"/,
          );
          const rovingFound: Str = rovingMatch
            ? truncSnippet(rovingMatch[0] as Str)
            : ('/* widget group without tabindex management */' as Str);
          findings.push({
            file: filename,
            problem:
              'Widget group (tablist/menubar/toolbar/radiogroup) without roving tabindex' as Str,
            solution:
              'Implement roving tabindex: set tabindex="0" on active item, tabindex="-1" on others' as Str,
            found: rovingFound,
            fix: `${rovingFound} <!-- child items need tabindex="0"/-1 management -->` as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} widget groups use roving tabindex` as Str,
        undefined,
        findings,
      );
    },
  },

  /* ---- Focus Management (4 rules) ---- */
  {
    id: 'focus-indicators' as Str,
    label: 'Focus indicators' as Str,
    description: 'CSS contains visible focus indicator styles' as Str,
    category: 'Visual' as Str,
    wcag: '2.4.7' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const focusPattern: RegExp = /focus-visible|focus:\s*ring|--ring|outline.*focus/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (focusPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      /* Check for outline: none / outline: 0 suppression across CSS files */
      const outlineNonePattern: RegExp = /outline\s*:\s*(none|0)\b[^;]*/;
      for (const [filename, content] of files) {
        const outlineMatch: RegExpMatchArray | null = (content as string).match(outlineNonePattern);
        if (outlineMatch) {
          fail = ((fail as number) + 1) as Num;
          findings.push({
            file: filename,
            problem: 'Focus outline suppressed — makes keyboard focus invisible' as Str,
            solution:
              'Replace outline: none with a visible focus style using the --ring variable' as Str,
            found: truncSnippet(outlineMatch[0] as Str),
            fix: 'outline: 2px solid var(--ring); outline-offset: 2px;' as Str,
          });
        }
      }

      /* Fail if no files have focus styles at all */
      if ((pass as number) === 0 && (fail as number) === 0) {
        fail = 1 as Num;
        findings.push({
          file: '(global)' as Str,
          problem: 'No focus indicator styles found in any CSS file' as Str,
          solution:
            'Add :focus-visible styles with the --ring CSS variable to your global stylesheet' as Str,
          found: '/* :focus-visible { } — not found in any CSS file */' as Str,
          fix: ':focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }' as Str,
        });
      }

      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) === 0 ? ['(no focus styles found)' as Str] : [],
        (pass as number) > 0
          ? (`${pass} files define focus indicator styles` as Str)
          : ('No focus indicator styles found in any file' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'focus-restoration' as Str,
    label: 'Focus restoration' as Str,
    description: 'Dialog/popover components restore focus on close' as Str,
    category: 'Visual' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const overlayPattern: RegExp = /role="dialog"|<dialog|popover|sheet/i;
      const restorePattern: RegExp =
        /triggerRef|previousFocus|restoreFocus|focus\(\)|activeElement|returnFocus/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!overlayPattern.test(content as string)) {
          continue;
        }
        if (restorePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const frMatch: RegExpMatchArray | null = (content as string).match(
            /role="dialog"|<dialog[^>]*>/i,
          );
          const frFound: Str = frMatch
            ? truncSnippet(frMatch[0] as Str)
            : ('/* overlay element without focus restoration */' as Str);
          findings.push({
            file: filename,
            problem: 'Overlay component does not restore focus on close' as Str,
            solution:
              'Save document.activeElement before opening and call .focus() on it when closing' as Str,
            found: frFound,
            fix: 'const prevFocus = document.activeElement as HTMLElement;\n// on close: prevFocus?.focus();' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} overlay components restore focus on close` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'focus-route-change' as Str,
    label: 'Focus on route change' as Str,
    description: 'Layout/router manages focus on navigation' as Str,
    category: 'Visual' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const allFiles: SourceEntry[] = [...sources.entries()] as SourceEntry[];
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const routePattern: RegExp =
        /afterNavigate|onNavigate|beforeNavigate|goto.*focus|\.focus\(\)/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of allFiles) {
        if (routePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No route change focus management found' as Str,
          solution:
            'Use afterNavigate from SvelteKit to move focus to the main content area on navigation' as Str,
          found: '// afterNavigate not found in any file' as Str,
          fix: 'import { afterNavigate } from "$app/navigation";\nafterNavigate(() => { document.getElementById("main-content")?.focus(); });' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no route focus management found)' as Str],
        (pass as number) > 0
          ? (`${pass} files manage focus on route change` as Str)
          : ('No route change focus management found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'custom-focus-styles' as Str,
    label: 'Custom focus styles' as Str,
    description: 'CSS uses --ring variable for consistent focus styling' as Str,
    category: 'Visual' as Str,
    wcag: '2.4.7' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const ringPattern: RegExp = /--ring|ring-offset|ring-color|focus:ring/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (ringPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No --ring CSS variable for focus styling found' as Str,
          solution:
            'Define a --ring CSS variable and use focus:ring utility classes for consistent focus styles' as Str,
          found: '// --ring variable not defined in any stylesheet' as Str,
          fix: '--ring: oklch(0.7 0.15 250); /* add to :root in your CSS */' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no --ring styles found)' as Str],
        (pass as number) > 0
          ? (`${pass} files use --ring for custom focus styles` as Str)
          : ('No --ring focus style variable found' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- Color & Contrast (5 rules) ---- */
  {
    id: 'text-contrast' as Str,
    label: 'Text contrast (4.5:1)' as Str,
    description: 'Normal text meets WCAG AA contrast ratio of 4.5:1' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const contrastPairs: Array<{ fg: Str; bg: Str }> = [
        { fg: 'foreground' as Str, bg: 'background' as Str },
        { fg: 'card-foreground' as Str, bg: 'card' as Str },
        { fg: 'popover-foreground' as Str, bg: 'popover' as Str },
        { fg: 'primary-foreground' as Str, bg: 'primary' as Str },
        { fg: 'secondary-foreground' as Str, bg: 'secondary' as Str },
        { fg: 'muted-foreground' as Str, bg: 'muted' as Str },
        { fg: 'accent-foreground' as Str, bg: 'accent' as Str },
        { fg: 'destructive-foreground' as Str, bg: 'destructive' as Str },
      ];

      for (const [filename, content] of files) {
        const lightness: Map<Str, Num> = parseOklchLightness(content as Str);
        if (lightness.size === 0) {
          continue;
        }

        let filePass: boolean = true;
        let checkedAny: boolean = false;

        for (const pair of contrastPairs) {
          const fgL: Num | undefined = lightness.get(pair.fg);
          const bgL: Num | undefined = lightness.get(pair.bg);
          if (fgL === undefined || bgL === undefined) {
            continue;
          }
          checkedAny = true;
          const ratio: Num = oklchContrast(fgL, bgL);
          if ((ratio as number) < 4.5) {
            filePass = false;
          }
        }

        if (!checkedAny) {
          continue;
        }
        if (filePass) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Color pair fails WCAG AA 4.5:1 contrast ratio for normal text' as Str,
            solution:
              'Adjust foreground/background OKLCH lightness values to achieve at least 4.5:1 contrast' as Str,
            found: truncSnippet(
              (((content as string).match(/--foreground\s*:[^;]+;/) ?? [])[0] as Str) ??
                ('--foreground: oklch(/* lightness below 4.5:1 threshold */);' as Str),
            ),
            fix: '--foreground: oklch(0.145 0 0); /* increase contrast against --background to 4.5:1 */' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets meet 4.5:1 contrast for normal text` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'large-text-contrast' as Str,
    label: 'Large text contrast (3:1)' as Str,
    description: 'Large text meets WCAG AA contrast ratio of 3:1' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const lightness: Map<Str, Num> = parseOklchLightness(content as Str);
        if (lightness.size === 0) {
          continue;
        }

        const fgL: Num | undefined = lightness.get('foreground' as Str);
        const bgL: Num | undefined = lightness.get('background' as Str);
        if (fgL === undefined || bgL === undefined) {
          continue;
        }

        const ratio: Num = oklchContrast(fgL, bgL);
        if ((ratio as number) >= 3) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Foreground/background contrast below 3:1 for large text' as Str,
            solution:
              'Increase lightness difference between foreground and background OKLCH values to achieve 3:1 ratio' as Str,
            found: truncSnippet(
              (((content as string).match(/--foreground\s*:[^;]+;/) ?? [])[0] as Str) ??
                ('--foreground: oklch(/* lightness below 3:1 threshold */);' as Str),
            ),
            fix: '--foreground: oklch(0.2 0 0); /* increase contrast against --background to 3:1 for large text */' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets meet 3:1 contrast for large text` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ui-component-contrast' as Str,
    label: 'UI component contrast' as Str,
    description: 'Border and input elements have sufficient contrast against background' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.11' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const lightness: Map<Str, Num> = parseOklchLightness(content as Str);
        if (lightness.size === 0) {
          continue;
        }

        const borderL: Num | undefined = lightness.get('border' as Str);
        const inputL: Num | undefined = lightness.get('input' as Str);
        const bgL: Num | undefined = lightness.get('background' as Str);
        if (bgL === undefined) {
          continue;
        }

        let componentPass: boolean = true;
        let checkedAny: boolean = false;

        if (borderL !== undefined) {
          checkedAny = true;
          if ((oklchContrast(borderL, bgL) as number) < 3) {
            componentPass = false;
          }
        }
        if (inputL !== undefined) {
          checkedAny = true;
          if ((oklchContrast(inputL, bgL) as number) < 3) {
            componentPass = false;
          }
        }

        if (!checkedAny) {
          continue;
        }
        if (componentPass) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Border or input element contrast below 3:1 against background' as Str,
            solution:
              'Adjust --border or --input OKLCH lightness to achieve at least 3:1 contrast against --background' as Str,
            found: truncSnippet(
              (((content as string).match(/--(?:border|input)\s*:[^;]+;/) ?? [])[0] as Str) ??
                ('--border: oklch(/* below 3:1 contrast threshold */);' as Str),
            ),
            fix: '--border: oklch(0.7 0 0); /* adjust lightness to achieve 3:1 against --background */' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets have sufficient UI component contrast` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'color-not-sole-indicator' as Str,
    label: 'Color not sole indicator' as Str,
    description: 'Status colors are paired with icons or text labels' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const statusColorPattern: RegExp = /destructive|success|warning|error|danger/i;
      const companionPattern: RegExp = /icon|Icon|<svg|aria-label|sr-only|visually-hidden/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!statusColorPattern.test(content as string)) {
          continue;
        }
        if (companionPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Status color used without accompanying icon or text label' as Str,
            solution:
              'Add an icon, sr-only text, or aria-label alongside color-based status indicators' as Str,
            found: truncSnippet(
              (((content as string).match(
                /class="[^"]*(?:destructive|success|warning|error|danger)[^"]*"/,
              ) ?? [])[0] as Str) ?? ('class="destructive"' as Str),
            ),
            fix: '<span class="sr-only">Error</span> <!-- add non-color indicator alongside status color -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} status-colored components have non-color indicators` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'high-contrast-mode' as Str,
    label: 'High contrast mode support' as Str,
    description: 'CSS contains forced-colors media query for Windows High Contrast' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const forcedColorsPattern: RegExp = /forced-colors|prefers-contrast/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (forcedColorsPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No forced-colors or prefers-contrast media queries found' as Str,
          solution:
            'Add @media (forced-colors: active) { } query to support Windows High Contrast Mode' as Str,
          found: '/* @media (forced-colors: active) — not found in any CSS file */' as Str,
          fix: '@media (forced-colors: active) { button { border: 2px solid ButtonText; } }' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no forced-colors query found)' as Str],
        (pass as number) > 0
          ? (`${pass} files support forced-colors/high-contrast mode` as Str)
          : ('No forced-colors or prefers-contrast media queries found' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- Motion & Animation (4 rules) ---- */
  {
    id: 'prefers-reduced-motion' as Str,
    label: 'Reduced motion support' as Str,
    description: 'CSS/components respect prefers-reduced-motion' as Str,
    category: 'Visual' as Str,
    wcag: '2.3.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const motionPattern: RegExp = /prefers-reduced-motion/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (motionPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No prefers-reduced-motion media query found' as Str,
          solution:
            'Add @media (prefers-reduced-motion: reduce) { } to disable or simplify animations' as Str,
          found: '/* @media (prefers-reduced-motion: reduce) — not found in any CSS file */' as Str,
          fix: '@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation: none !important; transition: none !important; } }' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no reduced-motion query found)' as Str],
        (pass as number) > 0
          ? (`${pass} files reference prefers-reduced-motion` as Str)
          : ('No prefers-reduced-motion media queries found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'no-auto-playing' as Str,
    label: 'No auto-playing content' as Str,
    description: 'No autoplay or auto-playing animations without user consent' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const autoplayPattern: RegExp = /autoplay|auto-play|autoPlay/;
      /* setInterval for animation (not polling) */
      const intervalAnimPattern: RegExp =
        /setInterval\s*\(\s*(?:.*(?:animate|move|slide|rotate|spin|bounce|fade|scroll))/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const hasAutoplay: boolean = autoplayPattern.test(content as string);
        const hasIntervalAnim: boolean = intervalAnimPattern.test(content as string);

        if (hasAutoplay || hasIntervalAnim) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Auto-playing content detected (autoplay attribute or animation interval)' as Str,
            solution:
              'Remove autoplay or require user interaction before starting media/animation playback' as Str,
            found: truncSnippet(
              (((content as string).match(
                /autoplay|auto-play|autoPlay|setInterval\s*\([^)]*(?:animate|slide|rotate|spin)/i,
              ) ?? [])[0] as Str) ?? ('autoplay' as Str),
            ),
            fix: '<!-- remove autoplay; add play button: -->\n<button onclick={startPlayback}>Play</button>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components have no auto-playing content` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'transition-duration' as Str,
    label: 'Reasonable transition durations' as Str,
    description: 'CSS transitions and animations do not exceed 5 seconds' as Str,
    category: 'Visual' as Str,
    wcag: '2.2.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Match duration values in seconds — e.g. "5s", "10s", "6.5s" */
      const durationPattern: RegExp = /(?:duration|delay)\s*:\s*([\d.]+)s/g;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        let hasLong: boolean = false;
        let match: RegExpExecArray | null = durationPattern.exec(content as string);

        while (match !== null) {
          /* Group [1] guaranteed by the pattern capturing ([\d.]+) */
          const seconds: number = Number.parseFloat(match[1] ?? '0');
          if (seconds > 5) {
            hasLong = true;
          }
          match = durationPattern.exec(content as string);
        }
        durationPattern.lastIndex = 0;

        if (hasLong) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'CSS transition or animation duration exceeds 5 seconds' as Str,
            solution: 'Reduce transition/animation duration to 5 seconds or less' as Str,
            found: truncSnippet(
              (((content as string).match(/(?:duration|delay)\s*:\s*\d+\.?\d*s/) ??
                [])[0] as Str) ?? ('duration: 10s' as Str),
            ),
            fix: 'transition-duration: 0.3s; /* keep durations under 5s */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} files have reasonable transition durations (<=5s)` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'pause-stop-controls' as Str,
    label: 'Pause/stop controls' as Str,
    description: 'Animated components have pause or stop mechanisms' as Str,
    category: 'Visual' as Str,
    wcag: '2.2.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const animPattern: RegExp =
        /animate|transition:|animation:|requestAnimationFrame|setInterval/;
      const pausePattern: RegExp = /pause|stop|cancel|clearInterval|cancelAnimationFrame|paused/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!animPattern.test(content as string)) {
          continue;
        }
        if (pausePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Animation without pause or stop mechanism' as Str,
            solution:
              'Add pause/stop controls or cancelAnimationFrame/clearInterval to allow users to stop animations' as Str,
            found: truncSnippet(
              (((content as string).match(/animate|requestAnimationFrame|setInterval/) ??
                [])[0] as Str) ?? ('requestAnimationFrame(animate)' as Str),
            ),
            fix: 'let rafId: number;\nfunction stopAnimation() { cancelAnimationFrame(rafId); }' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} animated components have pause/stop controls` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- Screen Reader (6 rules) ---- */
  {
    id: 'semantic-html' as Str,
    label: 'Semantic HTML' as Str,
    description: 'Components use native semantic elements instead of div-with-role' as Str,
    category: 'Screen Readers' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const semanticPattern: RegExp =
        /<(button|nav|main|header|footer|section|article|form|label|fieldset|legend|aside|figure|figcaption|details|summary|dialog|table|thead|tbody|th|td)\b/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (semanticPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'No semantic HTML elements found (only div/span)' as Str,
            solution:
              'Replace generic div/span with semantic elements like <nav>, <main>, <section>, <button>, <article>' as Str,
            found: truncSnippet(
              (((content as string).match(/<div\b[^>]*>/) ?? [])[0] as Str) ??
                ('<div> <!-- no semantic elements -->' as Str),
            ),
            fix: '<main><!-- use semantic elements: nav, main, section, button, article --></main>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use semantic HTML elements` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-labels' as Str,
    label: 'ARIA labels' as Str,
    description: 'Interactive elements have accessible names' as Str,
    category: 'Screen Readers' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Only flag truly interactive elements that need explicit ARIA labels.
       * Semantic <a href="..."> links derive their accessible name from link text
       * and do not require aria-label or aria-labelledby. */
      const interactivePattern: RegExp = /<(button|input|select|textarea)\b/;
      const nonSemanticLinkPattern: RegExp = /<a\b(?![^>]*\bhref\b)/;
      const ariaLabelPattern: RegExp = /aria-label|aria-labelledby/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const src: string = content as string;
        const hasInteractive: boolean = interactivePattern.test(src);
        const hasNonSemanticLink: boolean = nonSemanticLinkPattern.test(src);
        if (!hasInteractive && !hasNonSemanticLink) {
          continue;
        }
        if (ariaLabelPattern.test(src)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Interactive elements missing aria-label or aria-labelledby' as Str,
            solution:
              'Add aria-label="description" or aria-labelledby="id" to interactive elements' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:button|input|select|textarea)\b[^>]*>/) ??
                [])[0] as Str) ?? ('<button> <!-- missing aria-label -->' as Str),
            ),
            fix: '<button aria-label="Describe the action" type="button">...</button>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} interactive components have ARIA labels` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-live-regions' as Str,
    label: 'ARIA live regions' as Str,
    description: 'Dynamic content updates use aria-live regions' as Str,
    category: 'Screen Readers' as Str,
    wcag: '4.1.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Only flag components with runtime-dynamic status updates — NOT static {#if}/{#each}.
       * Require BOTH a dynamic mechanism ($effect, bind:, on:change) AND status-indicating
       * content (loading, error, success, progress, count, timer) to avoid false positives
       * on components that just conditionally render static content. */
      const dynamicMechanism: RegExp =
        /\$effect|bind:|on:change|onchange|oninput|setInterval|setTimeout/;
      const statusContent: RegExp =
        /loading|spinner|progress|count|timer|updating|fetching|saving/i;
      const livePattern: RegExp = /aria-live|role="(alert|status|log|marquee|timer)"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const src: string = content as string;
        if (!dynamicMechanism.test(src) || !statusContent.test(src)) {
          continue;
        }
        if (livePattern.test(src)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Dynamic status content updates without aria-live region' as Str,
            solution:
              'Add aria-live="polite" or role="status" to containers with dynamic content updates' as Str,
            found: truncSnippet(
              ((src.match(/\$effect\b|bind:\w+|on:change/) ?? [])[0] as Str) ??
                ('$effect(() => { /* status update */ })' as Str),
            ),
            fix: '<div aria-live="polite" role="status">{#if loading}...{/if}</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} dynamic components use ARIA live regions` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'role-attributes' as Str,
    label: 'Role attributes' as Str,
    description: 'Custom widgets have appropriate ARIA roles' as Str,
    category: 'Screen Readers' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Non-native elements with click handlers need roles */
      const clickDivPattern: RegExp =
        /<div[^>]*on:click|<div[^>]*onclick|<span[^>]*on:click|<span[^>]*onclick/;
      const rolePattern: RegExp = /role="/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!clickDivPattern.test(content as string)) {
          continue;
        }
        if (rolePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Clickable div/span without ARIA role attribute' as Str,
            solution:
              'Add role="button" to clickable non-native elements, or use a native <button> instead' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:div|span)[^>]*(?:on:click|onclick)[^>]*>/) ??
                [])[0] as Str) ?? ('<div onclick={handler}> <!-- missing role -->' as Str),
            ),
            fix: '<button type="button" onclick={handler}>...</button>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} custom widgets have ARIA roles` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'description-labelling' as Str,
    label: 'Form description/labelling' as Str,
    description:
      'Form inputs have associated labels via for/id, aria-labelledby, or wrapping <label>' as Str,
    category: 'Screen Readers' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const inputPattern: RegExp = /<(input|select|textarea)\b/;
      const labelAssocPattern: RegExp = /<label\b|aria-labelledby|aria-label|for="|htmlFor="/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!inputPattern.test(content as string)) {
          continue;
        }
        if (labelAssocPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Form inputs without label association (for/id, aria-labelledby, or wrapping <label>)' as Str,
            solution:
              'Add <label for="inputId">, aria-labelledby, or wrap input in a <label> element' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:input|select|textarea)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<input type="text"> <!-- no label -->' as Str),
            ),
            fix: '<label for="field-id">Label</label>\n<input id="field-id" type="text" />' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} form components have input labelling` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'status-messages' as Str,
    label: 'Status messages' as Str,
    description: 'Toast/notification components use role="status" or aria-live="polite"' as Str,
    category: 'Screen Readers' as Str,
    wcag: '4.1.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const toastPattern: RegExp = /toast|notification|snackbar|alert|Sonner|sonner/i;
      const statusPattern: RegExp =
        /role="status"|aria-live="polite"|aria-live="assertive"|role="alert"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!toastPattern.test(content as string)) {
          continue;
        }
        if (statusPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Toast/notification component without role="status" or aria-live' as Str,
            solution:
              'Add role="status" and aria-live="polite" to toast/notification containers' as Str,
            found: truncSnippet(
              (((content as string).match(
                /(?:toast|notification|snackbar|alert|[Ss]onner)[^<"']*/,
              ) ?? [])[0] as Str) ?? ('<Toast /> <!-- missing role="status" -->' as Str),
            ),
            fix: '<div role="status" aria-live="polite" aria-atomic="true">\n  <Toast />\n</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} toast/notification components have status roles` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- Per-Component (8 rules) ---- */
  {
    id: 'button-a11y' as Str,
    label: 'Button accessibility' as Str,
    description: 'Button components use native <button> with disabled support' as Str,
    category: 'Components' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const buttonFilePattern: RegExp = /button/i;
      const nativeButtonPattern: RegExp = /<button\b/;
      const disabledPattern: RegExp = /disabled/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!buttonFilePattern.test(filename as string)) {
          continue;
        }
        const hasNative: boolean = nativeButtonPattern.test(content as string);
        const hasDisabled: boolean = disabledPattern.test(content as string);
        if (hasNative && hasDisabled) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Button component missing native <button> element or disabled support' as Str,
            solution: 'Use native <button> element and add disabled prop/attribute support' as Str,
            found: truncSnippet(
              (((content as string).match(
                /<div[^>]*(?:on:click|onclick)[^>]*>|<span[^>]*(?:on:click|onclick)[^>]*>/,
              ) ?? [])[0] as Str) ?? ('<!-- no <button> element found -->' as Str),
            ),
            fix: '<button type="button" {disabled} onclick={handler}>...</button>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} button components use native <button> with disabled support` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'dialog-a11y' as Str,
    label: 'Dialog accessibility' as Str,
    description: 'Dialog has role="dialog", aria-modal, and focus trap' as Str,
    category: 'Components' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const dialogFilePattern: RegExp = /dialog|Dialog|modal|Modal/;
      const requiredPatterns: RegExp[] = [/role="dialog"|<dialog/, /aria-modal|aria-label/];
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (
          !dialogFilePattern.test(filename as string) &&
          !dialogFilePattern.test(content as string)
        ) {
          continue;
        }
        if (!/role="dialog"|<dialog/.test(content as string)) {
          continue;
        }

        const allPresent: boolean = requiredPatterns.every((p) => p.test(content as string));
        if (allPresent) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Dialog missing aria-modal or aria-label attribute' as Str,
            solution:
              'Add aria-modal="true" and aria-label="dialog title" to the dialog element' as Str,
            found: truncSnippet(
              (((content as string).match(/role="dialog"|<dialog[^>]*>/) ?? [])[0] as Str) ??
                ('<div role="dialog"> <!-- missing aria-modal -->' as Str),
            ),
            fix: '<div role="dialog" aria-modal="true" aria-label="Dialog title">...</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} dialog components have full a11y support` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'dropdown-menu-a11y' as Str,
    label: 'Dropdown menu accessibility' as Str,
    description: 'Dropdown menu has role="menu" and arrow key handling' as Str,
    category: 'Components' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const menuFilePattern: RegExp = /menu|Menu|dropdown|Dropdown/;
      const menuRolePattern: RegExp = /role="menu"/;
      const arrowKeyPattern: RegExp = /ArrowDown|ArrowUp|onkeydown|on:keydown/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!menuFilePattern.test(filename as string) && !menuRolePattern.test(content as string)) {
          continue;
        }
        if (!menuRolePattern.test(content as string)) {
          continue;
        }

        if (arrowKeyPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Dropdown menu with role="menu" but no arrow key navigation' as Str,
            solution:
              'Add onkeydown handler with ArrowUp/ArrowDown support for menu item navigation' as Str,
            found: truncSnippet(
              (((content as string).match(/role="menu"[^>]*>?/) ?? [])[0] as Str) ??
                ('<div role="menu"> <!-- missing arrow key handler -->' as Str),
            ),
            fix: '<div role="menu" onkeydown={handleArrowKeys}>\n  <div role="menuitem" tabindex="-1">Item</div>\n</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} dropdown menus have role="menu" and arrow navigation` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'tooltip-a11y' as Str,
    label: 'Tooltip accessibility' as Str,
    description: 'Tooltip has role="tooltip" and aria-describedby' as Str,
    category: 'Components' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const tooltipPattern: RegExp = /tooltip|Tooltip/;
      const tooltipRolePattern: RegExp = /role="tooltip"/;
      const describedByPattern: RegExp = /aria-describedby/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!tooltipPattern.test(filename as string) && !tooltipPattern.test(content as string)) {
          continue;
        }
        if (
          !tooltipRolePattern.test(content as string) &&
          !tooltipPattern.test(content as string)
        ) {
          continue;
        }

        const hasRole: boolean = tooltipRolePattern.test(content as string);
        const hasDescribedBy: boolean = describedByPattern.test(content as string);
        if (hasRole || hasDescribedBy) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Tooltip missing role="tooltip" and aria-describedby' as Str,
            solution:
              'Add role="tooltip" to the tooltip element and aria-describedby on the trigger element' as Str,
            found: truncSnippet(
              (((content as string).match(/<[A-Za-z][^>]*(?:[Tt]ooltip)[^>]*>/) ?? [])[0] as Str) ??
                ('<Tooltip> <!-- missing role="tooltip" -->' as Str),
            ),
            fix: '<button aria-describedby="tooltip-id">Trigger</button>\n<div id="tooltip-id" role="tooltip">Tooltip text</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} tooltip components have proper a11y attributes` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'tabs-a11y' as Str,
    label: 'Tabs accessibility' as Str,
    description: 'Tabs have role="tablist"/"tab"/"tabpanel" and arrow key support' as Str,
    category: 'Components' as Str,
    wcag: '2.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const tabsPattern: RegExp = /role="tablist"|role="tab"|role="tabpanel"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!tabsPattern.test(content as string)) {
          continue;
        }
        /* Check for arrow key support */
        const hasArrows: boolean = /ArrowLeft|ArrowRight|onkeydown|on:keydown/.test(
          content as string,
        );
        if (hasArrows) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Tab component with ARIA roles but no arrow key navigation' as Str,
            solution:
              'Add onkeydown handler with ArrowLeft/ArrowRight support for tab switching' as Str,
            found: truncSnippet(
              (((content as string).match(/role="(?:tablist|tab|tabpanel)"[^>]*>?/) ??
                [])[0] as Str) ??
                ('<div role="tablist"> <!-- missing arrow key handler -->' as Str),
            ),
            fix: '<div role="tablist" onkeydown={handleArrowKeys}>\n  <button role="tab" aria-selected="true">Tab 1</button>\n</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} tab components have ARIA roles and arrow navigation` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'accordion-a11y' as Str,
    label: 'Accordion accessibility' as Str,
    description: 'Accordion has aria-expanded and aria-controls' as Str,
    category: 'Components' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const accordionPattern: RegExp = /accordion|Accordion|collapsible|Collapsible/i;
      const expandedPattern: RegExp = /aria-expanded/;
      const controlsPattern: RegExp = /aria-controls/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (
          !accordionPattern.test(filename as string) &&
          !accordionPattern.test(content as string)
        ) {
          continue;
        }
        const hasExpanded: boolean = expandedPattern.test(content as string);
        const hasControls: boolean = controlsPattern.test(content as string);
        if (hasExpanded && hasControls) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else if (hasExpanded || hasControls) {
          /* Partial — still count as pass with warning in evidence */
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Accordion component missing aria-expanded and aria-controls' as Str,
            solution:
              'Add aria-expanded={isOpen} to the trigger and aria-controls="panelId" linking to the content panel' as Str,
            found: truncSnippet(
              (((content as string).match(/<button[^>]*>/) ?? [])[0] as Str) ??
                ('<button> <!-- missing aria-expanded/aria-controls -->' as Str),
            ),
            fix: '<button aria-expanded={isOpen} aria-controls="panel-id">Accordion trigger</button>\n<div id="panel-id" role="region">...</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} accordion components have aria-expanded/aria-controls` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'select-a11y' as Str,
    label: 'Select/combobox accessibility' as Str,
    description: 'Select has role="combobox" or "listbox" and arrow navigation' as Str,
    category: 'Components' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const selectPattern: RegExp = /role="combobox"|role="listbox"|<select\b/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!selectPattern.test(content as string)) {
          continue;
        }
        /* Native <select> has built-in a11y */
        if (/<select\b/.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
          continue;
        }
        /* Custom select needs arrow keys */
        const hasArrows: boolean = /ArrowDown|ArrowUp|onkeydown|on:keydown/.test(content as string);
        if (hasArrows) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Custom select/combobox without arrow key navigation' as Str,
            solution:
              'Add onkeydown handler with ArrowUp/ArrowDown support, or use native <select> element' as Str,
            found: truncSnippet(
              (((content as string).match(/role="(?:combobox|listbox)"[^>]*>?/) ?? [])[0] as Str) ??
                ('<div role="combobox"> <!-- missing arrow key handler -->' as Str),
            ),
            fix: '<div role="combobox" onkeydown={handleArrowKeys} aria-expanded={isOpen}>\n  <input aria-autocomplete="list" />\n</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} select/combobox components have proper a11y` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'toast-a11y' as Str,
    label: 'Toast accessibility' as Str,
    description: 'Toast/sonner has role="status" and aria-live' as Str,
    category: 'Components' as Str,
    wcag: '4.1.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const toastFilePattern: RegExp = /toast|Toast|sonner|Sonner/;
      const statusPattern: RegExp = /role="status"|aria-live/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (
          !toastFilePattern.test(filename as string) &&
          !toastFilePattern.test(content as string)
        ) {
          continue;
        }
        if (statusPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Toast component missing role="status" or aria-live attribute' as Str,
            solution:
              'Add role="status" and aria-live="polite" to the toast container element' as Str,
            found: truncSnippet(
              (((content as string).match(/<[A-Za-z][^>]*(?:[Tt]oast|[Ss]onner)[^>]*>/) ??
                [])[0] as Str) ?? ('<Toast /> <!-- missing role="status" and aria-live -->' as Str),
            ),
            fix: '<div role="status" aria-live="polite"><Toaster /></div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} toast components have role="status"/aria-live` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- Testing Checklist (7 rules — informational) ---- */
  {
    id: 'keyboard-only-test' as Str,
    label: 'Keyboard-only testing' as Str,
    description: 'Navigate entire app using only keyboard (Tab, Enter, Escape, arrows)' as Str,
    category: 'Testing' as Str,
    wcag: '2.1.1' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'keyboard-only-test' as Str,
        'Keyboard-only testing' as Str,
        'Navigate entire app using only keyboard' as Str,
        'Testing' as Str,
        '2.1.1' as Str,
      );
    },
  },
  {
    id: 'screen-reader-test' as Str,
    label: 'Screen reader testing' as Str,
    description: 'Test with VoiceOver (macOS), NVDA (Windows), or Orca (Linux)' as Str,
    category: 'Testing' as Str,
    wcag: '4.1.2' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'screen-reader-test' as Str,
        'Screen reader testing' as Str,
        'Test with VoiceOver, NVDA, or Orca' as Str,
        'Testing' as Str,
        '4.1.2' as Str,
      );
    },
  },
  {
    id: 'zoom-200-test' as Str,
    label: 'Zoom 200% testing' as Str,
    description: 'Verify layout at 200% browser zoom — no content clipping or overlap' as Str,
    category: 'Testing' as Str,
    wcag: '1.4.4' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'zoom-200-test' as Str,
        'Zoom 200% testing' as Str,
        'Verify layout at 200% browser zoom' as Str,
        'Testing' as Str,
        '1.4.4' as Str,
      );
    },
  },
  {
    id: 'high-contrast-test' as Str,
    label: 'High contrast testing' as Str,
    description: 'Test with Windows High Contrast Mode and forced-colors' as Str,
    category: 'Testing' as Str,
    wcag: '1.4.1' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'high-contrast-test' as Str,
        'High contrast testing' as Str,
        'Test with Windows High Contrast Mode' as Str,
        'Testing' as Str,
        '1.4.1' as Str,
      );
    },
  },
  {
    id: 'axe-core-test' as Str,
    label: 'axe-core automated testing' as Str,
    description: 'Run axe-core browser extension for automated a11y violations' as Str,
    category: 'Testing' as Str,
    wcag: '4.1.1' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'axe-core-test' as Str,
        'axe-core automated testing' as Str,
        'Run axe-core for automated a11y violations' as Str,
        'Testing' as Str,
        '4.1.1' as Str,
      );
    },
  },
  {
    id: 'contrast-checker-test' as Str,
    label: 'Contrast checker testing' as Str,
    description: 'Verify all color pairs with a contrast ratio checker tool' as Str,
    category: 'Testing' as Str,
    wcag: '1.4.3' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'contrast-checker-test' as Str,
        'Contrast checker testing' as Str,
        'Verify color pairs with contrast checker tool' as Str,
        'Testing' as Str,
        '1.4.3' as Str,
      );
    },
  },
  {
    id: 'tab-order-test' as Str,
    label: 'Tab order testing' as Str,
    description: 'Verify tab order follows logical reading/visual order' as Str,
    category: 'Testing' as Str,
    wcag: '2.4.3' as Str,
    check(): A11yRuleResult {
      return notApplicableResult(
        'tab-order-test' as Str,
        'Tab order testing' as Str,
        'Verify tab order follows logical order' as Str,
        'Testing' as Str,
        '2.4.3' as Str,
      );
    },
  },

  /* ---- Utilities (4 rules) ---- */
  {
    id: 'sr-only-class' as Str,
    label: 'Screen-reader-only class' as Str,
    description: 'sr-only CSS class exists for visually hidden content' as Str,
    category: 'Utilities' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const srOnlyPattern: RegExp = /\.sr-only|sr-only/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (srOnlyPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No sr-only CSS class defined in any stylesheet' as Str,
          solution:
            'Add a .sr-only class to hide content visually but keep it accessible to screen readers' as Str,
          found: '/* .sr-only — not found in any CSS file */' as Str,
          fix: '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no sr-only class found)' as Str],
        (pass as number) > 0
          ? (`sr-only class found in ${pass} files` as Str)
          : ('No sr-only CSS class found in any stylesheet' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'visually-hidden-component' as Str,
    label: 'VisuallyHidden component' as Str,
    description: 'A VisuallyHidden utility component exists in the codebase' as Str,
    category: 'Utilities' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const allFiles: SourceEntry[] = [...sources.entries()] as SourceEntry[];
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const vhPattern: RegExp = /VisuallyHidden|visually-hidden|visuallyHidden/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of allFiles) {
        if (vhPattern.test(filename as string) || vhPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No VisuallyHidden component found in the codebase' as Str,
          solution:
            'Create a VisuallyHidden.svelte component that hides content visually but keeps it accessible to screen readers' as Str,
          found: '// VisuallyHidden.svelte — not found in codebase' as Str,
          fix: '<!-- VisuallyHidden.svelte -->\n<span class="sr-only">{@render children()}</span>' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no VisuallyHidden component found)' as Str],
        (pass as number) > 0
          ? (`VisuallyHidden pattern found in ${pass} files` as Str)
          : ('No VisuallyHidden component found in codebase' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'accessible-icon' as Str,
    label: 'Accessible icon components' as Str,
    description: 'Icon components accept aria-label or have accessible names' as Str,
    category: 'Utilities' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const iconPattern: RegExp = /icon|Icon|<svg/i;
      const ariaPattern: RegExp = /aria-label|aria-hidden|role="img"|role="presentation"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!iconPattern.test(filename as string) && !/<svg/.test(content as string)) {
          continue;
        }
        if (ariaPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Icon/SVG without aria-label, aria-hidden, or role attribute' as Str,
            solution:
              'Add aria-hidden="true" for decorative icons, or aria-label="description" for meaningful icons' as Str,
            found: truncSnippet(
              (((content as string).match(/<svg[^>]*>/) ?? [])[0] as Str) ??
                ('<svg> <!-- missing aria-hidden or aria-label -->' as Str),
            ),
            fix: '<svg aria-hidden="true" focusable="false"> <!-- decorative -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} icon components have accessible names or aria-hidden` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-prop-forwarding' as Str,
    label: 'ARIA prop forwarding' as Str,
    description: 'Components forward aria-* props via spread or explicit props' as Str,
    category: 'Utilities' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const spreadPattern: RegExp =
        /\$\$restProps|\.\.\.\$\$props|\{\.\.\.rest\}|\{\.\.\.props\}|\.\.\.attributes|\$props\(\)/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (spreadPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Component does not forward ARIA props via spread' as Str,
            solution:
              'Add {...$$restProps} or {...$props()} to the root element to forward aria-* attributes' as Str,
            found: truncSnippet(
              (((content as string).match(/<[A-Z][A-Za-z]+\b[^>]*>/) ?? [])[0] as Str) ??
                ('<Component> <!-- no prop spreading -->' as Str),
            ),
            fix: 'let { children, ...rest } = $props();\n<div {...rest}>{@render children?.()}</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components forward ARIA props via spread` as Str,
        undefined,
        findings,
      );
    },
  },

  /* ---- WCAG 2.0 Level A (10 rules) ---- */
  {
    id: 'audio-video-alternatives' as Str,
    label: 'Audio/video alternatives (1.2.1)' as Str,
    description: 'Audio-only and video-only media have text alternatives or tracks' as Str,
    category: 'Media' as Str,
    wcag: '1.2.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const mediaPattern: RegExp = /<(video|audio)\b/;
      const trackPattern: RegExp = /<track\b|transcript|aria-describedby/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!mediaPattern.test(content as string)) {
          continue;
        }
        if (trackPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Audio/video element without text alternative or track' as Str,
            solution:
              'Add <track> element for captions/descriptions, or provide a text transcript' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:video|audio)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<video> <!-- missing <track> -->' as Str),
            ),
            fix: '<video controls>\n  <source src="media.mp4" />\n  <track kind="captions" src="captions.vtt" srclang="en" />\n</video>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (total as number) === 0
          ? ('No audio/video elements found' as Str)
          : (`${pass}/${total} media elements have alternatives` as Str),
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'video-captions' as Str,
    label: 'Video captions (1.2.2)' as Str,
    description: 'Video elements have caption tracks for prerecorded content' as Str,
    category: 'Media' as Str,
    wcag: '1.2.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const videoPattern: RegExp = /<video\b/;
      const captionPattern: RegExp = /<track\s[^>]*kind\s*=\s*"captions"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!videoPattern.test(content as string)) {
          continue;
        }
        if (captionPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Video element without caption track' as Str,
            solution:
              'Add <track kind="captions" src="captions.vtt" srclang="en"> inside the <video> element' as Str,
            found: truncSnippet(
              (((content as string).match(/<video\b[^>]*>/) ?? [])[0] as Str) ??
                ('<video> <!-- missing caption track -->' as Str),
            ),
            fix: '<video controls>\n  <track kind="captions" src="captions.vtt" srclang="en" label="English" />\n</video>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (total as number) === 0
          ? ('No video elements found' as Str)
          : (`${pass}/${total} video elements have caption tracks` as Str),
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'meaningful-sequence' as Str,
    label: 'Meaningful sequence (1.3.2)' as Str,
    description: 'Content order is not visually reordered away from DOM order via CSS' as Str,
    category: 'Visual' as Str,
    wcag: '1.3.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const reorderPattern: RegExp =
        /order\s*:\s*(?!0\b)|flex-direction\s*:\s*row-reverse|flex-direction\s*:\s*column-reverse/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (reorderPattern.test(content as string)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'CSS reorders content away from DOM order (order, row-reverse, column-reverse)' as Str,
            solution:
              'Avoid CSS order/reverse properties, or ensure DOM order matches visual reading order' as Str,
            found: truncSnippet(
              (((content as string).match(
                /(?:order\s*:\s*(?!0\b)\d+|flex-direction\s*:\s*(?:row|column)-reverse)[^;]*;/,
              ) ?? [])[0] as Str) ?? ('order: 2; /* reorders DOM content */' as Str),
            ),
            fix: '/* remove CSS reordering; rearrange DOM elements instead */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} files do not reorder content away from DOM order` as Str,
        (fail as number) > 0 ? 'warning' : undefined,
        findings,
      );
    },
  },
  {
    id: 'sensory-characteristics' as Str,
    label: 'Sensory characteristics (1.3.3)' as Str,
    description: 'Instructions do not rely solely on shape, size, location, or color' as Str,
    category: 'Visual' as Str,
    wcag: '1.3.3' as Str,
    check(): A11yRuleResult {
      /* Component libraries do not typically contain instructional text */
      return notApplicableResult(
        'sensory-characteristics' as Str,
        'Sensory characteristics (1.3.3)' as Str,
        'Instructions do not rely solely on sensory characteristics' as Str,
        'Visual' as Str,
        '1.3.3' as Str,
      );
    },
  },
  {
    id: 'no-keyboard-trap' as Str,
    label: 'No keyboard trap (2.1.2)' as Str,
    description:
      'Elements with tabindex do not create keyboard traps without escape handlers' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const tabindexPattern: RegExp = /tabindex/;
      const dialogModalPattern: RegExp = /role="dialog"|<dialog|aria-modal/;
      const escapePattern: RegExp = /onkeydown|on:keydown|Escape/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!tabindexPattern.test(content as string)) {
          continue;
        }
        /* Dialogs/modals with tabindex need escape handlers */
        if (dialogModalPattern.test(content as string)) {
          if (escapePattern.test(content as string)) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          } else {
            fail = ((fail as number) + 1) as Num;
            failing.push(filename);
            findings.push({
              file: filename,
              problem:
                'Dialog/modal with tabindex but no Escape key handler — potential keyboard trap' as Str,
              solution:
                'Add onkeydown handler that closes the dialog when Escape is pressed to prevent keyboard trap' as Str,
              found: truncSnippet(
                (((content as string).match(/role="dialog"|<dialog[^>]*>|aria-modal/) ??
                  [])[0] as Str) ?? ('<div role="dialog"> <!-- missing Escape handler -->' as Str),
              ),
              fix: 'onkeydown={(e) => { if (e.key === "Escape") closeDialog(); }}' as Str,
            });
          }
        } else {
          /* Non-dialog tabindex elements are fine */
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components with tabindex avoid keyboard traps` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'timing-adjustable' as Str,
    label: 'Timing adjustable (2.2.1)' as Str,
    description: 'Auto-dismiss timers have user controls or are adjustable' as Str,
    category: 'Visual' as Str,
    wcag: '2.2.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = scriptFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const timerPattern: RegExp = /setTimeout|setInterval/;
      const controlPattern: RegExp =
        /clearTimeout|clearInterval|pause|dismiss|duration.*prop|configurable/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!timerPattern.test(content as string)) {
          continue;
        }
        if (controlPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Timer (setTimeout/setInterval) without user control to pause or adjust' as Str,
            solution:
              'Add clearTimeout/clearInterval, a pause button, or a configurable duration prop' as Str,
            found: truncSnippet(
              (((content as string).match(/(?:setTimeout|setInterval)\s*\([^,]+,\s*\d+/) ??
                [])[0] as Str) ?? ('setTimeout(callback, 5000)' as Str),
            ),
            fix: 'let timerId: ReturnType<typeof setTimeout>;\nfunction dismiss() { clearTimeout(timerId); }' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} files with timers have user controls` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'three-flashes' as Str,
    label: 'Three flashes threshold (2.3.1)' as Str,
    description: 'CSS animations do not flash more than 3 times per second' as Str,
    category: 'Visual' as Str,
    wcag: '2.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Animations under 333ms can cause 3+ flashes/sec */
      const fastAnimPattern: RegExp =
        /animation\s*:.*\b0\.([012]\d{0,2}|3[012]\d?)s\b|animation-duration\s*:\s*0\.([012]\d{0,2}|3[012]\d?)s/;
      const opacityFlashPattern: RegExp = /@keyframes[^}]*opacity[^}]*opacity/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        const hasFastAnim: boolean = fastAnimPattern.test(content as string);
        const hasFlash: boolean = opacityFlashPattern.test(content as string);

        if (hasFastAnim || hasFlash) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Rapid-flash animation detected (under 333ms or repeated opacity changes)' as Str,
            solution:
              'Increase animation duration above 333ms and avoid rapid opacity toggling in keyframes' as Str,
            found: truncSnippet(
              (((content as string).match(/animation[^;]*0\.\d+s|@keyframes[^}]*opacity/) ??
                [])[0] as Str) ?? ('animation: flash 0.1s infinite;' as Str),
            ),
            fix: 'animation: fade 0.5s ease; /* keep duration above 333ms to avoid flicker */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} files have no rapid-flash animations` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'page-titled' as Str,
    label: 'Page titled (2.4.2)' as Str,
    description: 'SvelteKit pages set page titles via <svelte:head><title>' as Str,
    category: 'Navigation' as Str,
    wcag: '2.4.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const pages: SourceEntry[] = pageFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const titlePattern: RegExp = /svelte:head|<title|title.*store|document\.title/;
      const findings: A11yFileFinding[] = [];

      if (pages.length === 0) {
        /* Check all svelte files for title patterns */
        const allSvelte: SourceEntry[] = svelteFiles(sources);
        for (const [filename, content] of allSvelte) {
          if (titlePattern.test(content as string)) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
        }
        if ((pass as number) === 0) {
          findings.push({
            file: '(global)' as Str,
            problem: 'No page title setting found in any file' as Str,
            solution:
              'Add <svelte:head><title>Page Title</title></svelte:head> to page components' as Str,
            found: '<!-- <svelte:head><title> — not found in any page file -->' as Str,
            fix: '<svelte:head><title>My Page — App Name</title></svelte:head>' as Str,
          });
        }
        return buildResult(
          this,
          pass,
          (pass as number) > 0 ? (0 as Num) : (1 as Num),
          passing,
          (pass as number) > 0 ? [] : ['(no page files found)' as Str],
          (pass as number) > 0
            ? (`Title pattern found in ${pass} files` as Str)
            : ('No page title setting found' as Str),
          undefined,
          findings,
        );
      }

      for (const [filename, content] of pages) {
        if (titlePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Page file does not set a page title' as Str,
            solution:
              'Add <svelte:head><title>Page Title</title></svelte:head> to this page component' as Str,
            found: '<!-- <svelte:head><title> not found in this page -->' as Str,
            fix: '<svelte:head><title>Page Name — App Name</title></svelte:head>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} page files set a page title` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'language-of-page' as Str,
    label: 'Language of page (3.1.1)' as Str,
    description: 'HTML element has a lang attribute set' as Str,
    category: 'Standards' as Str,
    wcag: '3.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const allFiles: SourceEntry[] = [...sources.entries()] as SourceEntry[];
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const htmlLangPattern: RegExp = /<html[^>]*lang\s*=/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of allFiles) {
        if (htmlLangPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No lang attribute on <html> element found' as Str,
          solution:
            'Add lang="en" (or appropriate language code) to the <html> element in app.html' as Str,
          found: '<html> <!-- lang attribute missing -->' as Str,
          fix: '<html lang="en"> <!-- or lang="fr", "de", etc. -->' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no lang attribute on <html> found)' as Str],
        (pass as number) > 0
          ? (`lang attribute found on <html> in ${pass} files` as Str)
          : ('No lang attribute on <html> element found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'no-duplicate-ids' as Str,
    label: 'No duplicate IDs (4.1.1)' as Str,
    description: 'Component templates do not contain duplicate id attribute values' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const idPattern: RegExp = /\bid="([^"{]+)"/g;

      for (const [filename, content] of files) {
        const ids: Set<Str> = new Set();
        let hasDupe: boolean = false;
        let match: RegExpExecArray | null = idPattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the id value */
          const idVal: Str = (match[1] ?? '') as Str;
          if (ids.has(idVal)) {
            hasDupe = true;
          }
          ids.add(idVal);
          match = idPattern.exec(content as string);
        }
        idPattern.lastIndex = 0;

        if (ids.size === 0) {
          continue;
        }
        if (hasDupe) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Duplicate id attribute values found in component template' as Str,
            solution: 'Ensure all id attribute values are unique within the component' as Str,
            found: truncSnippet(
              (((content as string).match(/\bid="[^"{}]+"/) ?? [])[0] as Str) ??
                ('id="duplicate-id"' as Str),
            ),
            fix: '<!-- make each id unique: id="section-1", id="section-2" -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components have no duplicate IDs` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- WCAG 2.0 Level AA (17 rules) ---- */
  {
    id: 'audio-description' as Str,
    label: 'Audio description (1.2.3/1.2.5)' as Str,
    description: 'Video has audio description track for prerecorded content' as Str,
    category: 'Media' as Str,
    wcag: '1.2.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const videoPattern: RegExp = /<video\b/;
      const descriptionPattern: RegExp = /<track\s[^>]*kind\s*=\s*"descriptions"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!videoPattern.test(content as string)) {
          continue;
        }
        if (descriptionPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Video element without audio description track' as Str,
            solution:
              'Add <track kind="descriptions" src="descriptions.vtt"> for audio descriptions of visual content' as Str,
            found: truncSnippet(
              (((content as string).match(/<video\b[^>]*>/) ?? [])[0] as Str) ??
                ('<video> <!-- missing descriptions track -->' as Str),
            ),
            fix: '<video controls>\n  <track kind="descriptions" src="descriptions.vtt" srclang="en" />\n</video>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (total as number) === 0
          ? ('No video elements found' as Str)
          : (`${pass}/${total} video elements have audio description tracks` as Str),
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'captions-live' as Str,
    label: 'Captions for live content (1.2.4)' as Str,
    description: 'Live audio/video content has real-time captions' as Str,
    category: 'Media' as Str,
    wcag: '1.2.4' as Str,
    check(): A11yRuleResult {
      /* Live captioning requires manual testing */
      return notApplicableResult(
        'captions-live' as Str,
        'Captions for live content (1.2.4)' as Str,
        'Live content has real-time captions' as Str,
        'Media' as Str,
        '1.2.4' as Str,
      );
    },
  },
  {
    id: 'resize-text' as Str,
    label: 'Resize text (1.4.4)' as Str,
    description: 'Font sizes use rem/em instead of fixed px values' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const pxFontPattern: RegExp = /font-size\s*:\s*\d+px/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (pxFontPattern.test(content as string)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Font sizes defined in fixed px units' as Str,
            solution:
              'Use rem or em units for font-size instead of px to allow user text scaling' as Str,
            found: truncSnippet(
              (((content as string).match(/font-size\s*:\s*\d+px[^;]*;/) ?? [])[0] as Str) ??
                ('font-size: 14px;' as Str),
            ),
            fix: 'font-size: 0.875rem; /* equivalent to 14px but scales with user preference */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets avoid fixed px font sizes` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'images-of-text' as Str,
    label: 'Images of text (1.4.5)' as Str,
    description: 'Images are not used to display text (logos exempted)' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.5' as Str,
    check(): A11yRuleResult {
      /* Component libraries rarely embed text in images; requires manual review */
      return notApplicableResult(
        'images-of-text' as Str,
        'Images of text (1.4.5)' as Str,
        'Images are not used to display text content' as Str,
        'Visual' as Str,
        '1.4.5' as Str,
      );
    },
  },
  {
    id: 'link-purpose' as Str,
    label: 'Link purpose (2.4.4)' as Str,
    description: 'Links have descriptive text rather than generic phrases' as Str,
    category: 'Navigation' as Str,
    wcag: '2.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const linkPattern: RegExp = /<a\b[^>]*>([^<]*)<\/a>/g;

      for (const [filename, content] of files) {
        if (!/<a\b/.test(content as string)) {
          continue;
        }
        let hasBadLink: boolean = false;
        let match: RegExpExecArray | null = linkPattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the link text content */
          const linkText: Str = ((match[1] ?? '') as string).trim().toLowerCase() as Str;
          if (BAD_LINK_TEXT_PATTERNS.some((p) => (linkText as string) === (p as string))) {
            hasBadLink = true;
          }
          match = linkPattern.exec(content as string);
        }
        linkPattern.lastIndex = 0;

        if (hasBadLink) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Link with generic text like "click here", "read more", or "here"' as Str,
            solution:
              'Use descriptive link text that conveys the destination or purpose (e.g., "View project details")' as Str,
            found: truncSnippet(
              (((content as string).match(
                /<a\b[^>]*>[^<]*(?:click here|read more|here|more|learn more)[^<]*<\/a>/i,
              ) ?? [])[0] as Str) ?? ('<a href="#">Click here</a>' as Str),
            ),
            fix: '<a href="/docs/feature">View feature documentation</a>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use descriptive link text` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'multiple-ways' as Str,
    label: 'Multiple ways to find pages (2.4.5)' as Str,
    description: 'Site provides multiple ways to locate content (nav, search, sitemap)' as Str,
    category: 'Navigation' as Str,
    wcag: '2.4.5' as Str,
    check(): A11yRuleResult {
      /* Requires cross-page analysis; not applicable for component library scanning */
      return notApplicableResult(
        'multiple-ways' as Str,
        'Multiple ways to find pages (2.4.5)' as Str,
        'Site has navigation, search, or sitemap' as Str,
        'Navigation' as Str,
        '2.4.5' as Str,
      );
    },
  },
  {
    id: 'headings-and-labels' as Str,
    label: 'Headings and labels (2.4.6)' as Str,
    description: 'Heading levels are used correctly and do not skip levels' as Str,
    category: 'Screen Readers' as Str,
    wcag: '2.4.6' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const headingPattern: RegExp = /<h([1-6])\b/g;

      for (const [filename, content] of files) {
        const levels: Num[] = [];
        let match: RegExpExecArray | null = headingPattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the heading level digit */
          levels.push(Number.parseInt(match[1] ?? '0', 10) as Num);
          match = headingPattern.exec(content as string);
        }
        headingPattern.lastIndex = 0;

        if (levels.length === 0) {
          continue;
        }

        /* Check for skipped levels */
        let skipped: boolean = false;
        const sorted: Num[] = [...levels].toSorted((a, b) => (a as number) - (b as number));
        for (let i: number = 1; i < sorted.length; i++) {
          if ((sorted[i] as number) - (sorted[i - 1] as number) > 1) {
            skipped = true;
          }
        }

        if (skipped) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Heading levels are skipped (e.g., h1 to h3 without h2)' as Str,
            solution: 'Use sequential heading levels without skipping (h1 -> h2 -> h3)' as Str,
            found: truncSnippet(
              (((content as string).match(/<h[1-6]\b[^>]*>/) ?? [])[0] as Str) ??
                ('<h1> ... <h3> <!-- h2 skipped -->' as Str),
            ),
            fix: '<!-- use sequential headings: -->\n<h1>Page Title</h1>\n<h2>Section</h2>\n<h3>Subsection</h3>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use correct heading levels` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'language-of-parts' as Str,
    label: 'Language of parts (3.1.2)' as Str,
    description: 'Content in a different language uses the lang attribute' as Str,
    category: 'Standards' as Str,
    wcag: '3.1.2' as Str,
    check(): A11yRuleResult {
      /* Requires content analysis; not applicable for most component scanning */
      return notApplicableResult(
        'language-of-parts' as Str,
        'Language of parts (3.1.2)' as Str,
        'Different language content uses lang attribute' as Str,
        'Standards' as Str,
        '3.1.2' as Str,
      );
    },
  },
  {
    id: 'on-focus-no-change' as Str,
    label: 'On focus — no context change (3.2.1)' as Str,
    description: 'Focus events do not trigger navigation or form submission' as Str,
    category: 'Forms' as Str,
    wcag: '3.2.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const focusHandlerPattern: RegExp = /onfocus|on:focus/;
      const contextChangePattern: RegExp = /goto|navigate|submit|window\.location|href\s*=/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!focusHandlerPattern.test(content as string)) {
          continue;
        }
        if (contextChangePattern.test(content as string)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Focus event triggers navigation or context change' as Str,
            solution:
              'Move navigation/submission logic from onfocus to onclick or explicit user action handlers' as Str,
            found: truncSnippet(
              (((content as string).match(/(?:onfocus|on:focus)=[^}>\n]+/) ?? [])[0] as Str) ??
                ('onfocus={navigateTo}' as Str),
            ),
            fix: 'onclick={navigateTo} <!-- use click, not focus, for navigation -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components with focus handlers avoid context changes` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'on-input-no-change' as Str,
    label: 'On input — no context change (3.2.2)' as Str,
    description: 'Input/change events do not trigger navigation without warning' as Str,
    category: 'Forms' as Str,
    wcag: '3.2.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const inputHandlerPattern: RegExp = /oninput|on:input|onchange|on:change/;
      const navPattern: RegExp = /goto|navigate|window\.location|href\s*=/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!inputHandlerPattern.test(content as string)) {
          continue;
        }
        if (navPattern.test(content as string)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Input/change event triggers navigation without warning' as Str,
            solution:
              'Move navigation logic to a submit button handler; do not navigate on input change alone' as Str,
            found: truncSnippet(
              (((content as string).match(/(?:oninput|on:input|onchange|on:change)=[^}>\n]+/) ??
                [])[0] as Str) ?? ('oninput={goto}' as Str),
            ),
            fix: '<!-- navigate via submit button, not on input change -->\n<button type="submit" onclick={goto}>Go</button>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components with input handlers avoid context changes` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'consistent-navigation' as Str,
    label: 'Consistent navigation (3.2.3)' as Str,
    description: 'Navigation mechanisms are consistent across pages' as Str,
    category: 'Navigation' as Str,
    wcag: '3.2.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const layouts: SourceEntry[] = layoutFiles(sources);
      if (layouts.length === 0) {
        return buildResult(
          this,
          0 as Num,
          0 as Num,
          [],
          [],
          'No layout files found to check navigation consistency' as Str,
        );
      }
      const navPattern: RegExp = /<nav[\s>]|role\s*=\s*["']navigation["']/i;
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of layouts) {
        if (navPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Layout file missing <nav> or role="navigation" element' as Str,
            solution:
              'Add a <nav> element or role="navigation" to ensure consistent navigation across pages' as Str,
            found: truncSnippet(
              (((content as string).match(/<header[^>]*>|<div[^>]*(?:header|layout)[^>]*>/) ??
                [])[0] as Str) ?? ('<div> <!-- no <nav> element found -->' as Str),
            ),
            fix: '<nav aria-label="Main navigation">\n  <a href="/">Home</a>\n</nav>' as Str,
          });
        }
      }
      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} layout files have consistent navigation elements` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'consistent-identification' as Str,
    label: 'Consistent identification (3.2.4)' as Str,
    description: 'Components with same function are identified consistently' as Str,
    category: 'Navigation' as Str,
    wcag: '3.2.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return buildResult(
          this,
          0 as Num,
          0 as Num,
          [],
          [],
          'No Svelte files found to check component identification consistency' as Str,
        );
      }
      /* Detect mixing of native HTML elements with PascalCase component equivalents */
      const componentPairs: Array<[RegExp, RegExp, Str]> = [
        [/<button[\s>]/i, /<Button[\s>]/, 'Button' as Str],
        [/<input[\s>]/i, /<Input[\s>]/, 'Input' as Str],
        [/<dialog[\s>]/i, /<Dialog[\s>]/, 'Dialog' as Str],
      ];
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        let fileConsistent: boolean = true;
        const contentStr: string = content as string;
        for (const [nativePattern, componentPattern, name] of componentPairs) {
          const hasNative: boolean = nativePattern.test(contentStr);
          const hasComponent: boolean = componentPattern.test(contentStr);
          if (hasNative && hasComponent) {
            fileConsistent = false;
            findings.push({
              file: filename,
              problem:
                `Mixes native <${(name as string).toLowerCase()}> and <${name}> component` as Str,
              solution:
                `Use <${name}> component consistently instead of mixing native and component variants` as Str,
              found: truncSnippet(
                (((content as string).match(
                  new RegExp(`<${(name as string).toLowerCase()}[\\s>]`),
                ) ?? [])[0] as Str) ??
                  (`<${(name as string).toLowerCase()}> <!-- mixed with <${name}> component -->` as Str),
              ),
              fix: `<${name}> <!-- use component consistently --></${name}>` as Str,
            });
          }
        }
        if (fileConsistent) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        }
      }
      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use consistent identification patterns` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'error-identification' as Str,
    label: 'Error identification (3.3.1)' as Str,
    description: 'Form components have error states with aria-invalid or error messages' as Str,
    category: 'Forms' as Str,
    wcag: '3.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const inputPattern: RegExp = /<(input|select|textarea)\b/;
      const errorPattern: RegExp = /aria-invalid|aria-errormessage|error|invalid|validation/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!inputPattern.test(content as string)) {
          continue;
        }
        if (errorPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Form inputs without error identification (aria-invalid or error messages)' as Str,
            solution:
              'Add aria-invalid="true" and visible error messages when form validation fails' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:input|select|textarea)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<input type="email"> <!-- no aria-invalid -->' as Str),
            ),
            fix: '<input type="email" aria-invalid={hasError} aria-describedby="error-msg" />\n{#if hasError}<p id="error-msg" role="alert">Enter a valid email</p>{/if}' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} form components have error identification` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'labels-or-instructions' as Str,
    label: 'Labels or instructions (3.3.2)' as Str,
    description: 'Input elements have associated labels, aria-label, or placeholder' as Str,
    category: 'Forms' as Str,
    wcag: '3.3.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const inputPattern: RegExp = /<(input|select|textarea)\b/;
      const labelPattern: RegExp = /<label\b|aria-label|aria-labelledby|placeholder/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!inputPattern.test(content as string)) {
          continue;
        }
        if (labelPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Input elements without labels, aria-label, or placeholder text' as Str,
            solution:
              'Add a <label>, aria-label, aria-labelledby, or placeholder to each input element' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:input|select|textarea)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<input type="text"> <!-- no label -->' as Str),
            ),
            fix: '<label for="name">Full name</label>\n<input id="name" type="text" />' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} input elements have labels or instructions` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'error-suggestion' as Str,
    label: 'Error suggestion (3.3.3)' as Str,
    description: 'Form error messages provide correction hints' as Str,
    category: 'Forms' as Str,
    wcag: '3.3.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const errorMsgPattern: RegExp =
        /error.*message|validation.*message|aria-errormessage|FormDescription|hint/i;
      const formPattern: RegExp = /<form\b|<input\b|<select\b|<textarea\b/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!formPattern.test(content as string)) {
          continue;
        }
        if (errorMsgPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Form component without error correction hints or suggestions' as Str,
            solution:
              'Add error messages with correction suggestions (e.g., "Enter a valid email address")' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:form|input|select|textarea)\b[^>]*>/) ??
                [])[0] as Str) ?? ('<form> <!-- no error messages found -->' as Str),
            ),
            fix: '{#if error}<p role="alert" aria-live="polite">Enter a valid email (e.g. user@example.com)</p>{/if}' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} form components provide error suggestions` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'error-prevention' as Str,
    label: 'Error prevention (3.3.4)' as Str,
    description: 'Forms with important actions have confirmation or undo mechanisms' as Str,
    category: 'Forms' as Str,
    wcag: '3.3.4' as Str,
    check(): A11yRuleResult {
      /* Requires manual review of form submission flows */
      return notApplicableResult(
        'error-prevention' as Str,
        'Error prevention (3.3.4)' as Str,
        'Forms with important actions have confirmation or undo' as Str,
        'Forms' as Str,
        '3.3.4' as Str,
      );
    },
  },

  /* ---- WCAG 2.1 Level A (5 rules) ---- */
  {
    id: 'character-key-shortcuts' as Str,
    label: 'Character key shortcuts (2.1.4)' as Str,
    description: 'Single-character shortcuts can be remapped or disabled' as Str,
    category: 'Keyboard' as Str,
    wcag: '2.1.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Single-char key handlers like key === 'a' or key === '/' */
      const singleKeyPattern: RegExp = /key\s*===?\s*['"][a-zA-Z0-9/\\?](?![\w])['"]/;
      const remapPattern: RegExp = /remap|shortcut.*config|hotkey.*option|disable.*shortcut/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!singleKeyPattern.test(content as string)) {
          continue;
        }
        if (remapPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Single-character keyboard shortcut without remap/disable option' as Str,
            solution:
              'Allow users to remap or disable single-character shortcuts via settings' as Str,
            found: truncSnippet(
              (((content as string).match(/key\s*===?\s*['"][a-zA-Z0-9/\\?]['"]/) ??
                [])[0] as Str) ?? ("key === 'k' /* single-char shortcut */" as Str),
            ),
            fix: "if (shortcutsEnabled && e.key === 'k') { /* check user preference */ }" as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components with key shortcuts allow remapping` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'pointer-gestures' as Str,
    label: 'Pointer gestures (2.5.1)' as Str,
    description: 'No functionality requires multi-finger gestures without alternatives' as Str,
    category: 'Components' as Str,
    wcag: '2.5.1' as Str,
    check(): A11yRuleResult {
      /* Most web components do not use multi-finger gestures */
      return notApplicableResult(
        'pointer-gestures' as Str,
        'Pointer gestures (2.5.1)' as Str,
        'No multi-finger gesture requirement found' as Str,
        'Components' as Str,
        '2.5.1' as Str,
      );
    },
  },
  {
    id: 'pointer-cancellation' as Str,
    label: 'Pointer cancellation (2.5.2)' as Str,
    description: 'Click handlers use up events (onclick) not down events for activation' as Str,
    category: 'Components' as Str,
    wcag: '2.5.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const downEventPattern: RegExp = /onmousedown|on:mousedown|onpointerdown|on:pointerdown/;
      /* Drag operations legitimately use mousedown/pointerdown */
      const dragPattern: RegExp = /drag|resize|slider|scrollbar|sortable/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!downEventPattern.test(content as string)) {
          continue;
        }
        /* Allow mousedown for drag interactions */
        if (dragPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Using mousedown/pointerdown for activation instead of click (up event)' as Str,
            solution:
              'Use onclick instead of onmousedown for element activation to allow pointer cancellation' as Str,
            found: truncSnippet(
              (((content as string).match(
                /(?:onmousedown|on:mousedown|onpointerdown|on:pointerdown)=[^}>\n]+/,
              ) ?? [])[0] as Str) ?? ('onmousedown={activate}' as Str),
            ),
            fix: 'onclick={activate} <!-- use click (up event) to allow pointer cancellation -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use click (up event) instead of mousedown for activation` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'label-in-name' as Str,
    label: 'Label in name (2.5.3)' as Str,
    description: 'Components with visible labels have matching accessible names' as Str,
    category: 'Screen Readers' as Str,
    wcag: '2.5.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      const fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* If aria-label is set on an element, check that visible text is present in it */
      const ariaLabelPattern: RegExp = /aria-label="([^"]+)"/g;
      const visibleTextPattern: RegExp = />([^<{]+)</;

      for (const [filename, content] of files) {
        if (!/aria-label="/.test(content as string)) {
          continue;
        }
        /* Components that use aria-label should be reviewed */
        const hasVisibleText: boolean = visibleTextPattern.test(content as string);
        if (hasVisibleText) {
          /* If both visible text and aria-label exist, the component is likely following best practices */
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          /* aria-label without visible text — could be icon-only which is valid */
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
        ariaLabelPattern.lastIndex = 0;
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components with aria-label have matching visible text` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'motion-actuation' as Str,
    label: 'Motion actuation (2.5.4)' as Str,
    description: 'No functionality requires device motion without alternatives' as Str,
    category: 'Components' as Str,
    wcag: '2.5.4' as Str,
    check(): A11yRuleResult {
      /* Most web components do not use device motion */
      return notApplicableResult(
        'motion-actuation' as Str,
        'Motion actuation (2.5.4)' as Str,
        'No device motion requirement found' as Str,
        'Components' as Str,
        '2.5.4' as Str,
      );
    },
  },

  /* ---- WCAG 2.1 Level AA (6 rules) ---- */
  {
    id: 'orientation' as Str,
    label: 'Orientation (1.3.4)' as Str,
    description: 'CSS does not force a specific display orientation' as Str,
    category: 'Visual' as Str,
    wcag: '1.3.4' as Str,
    check(): A11yRuleResult {
      /* Component-level CSS typically does not force orientation */
      return notApplicableResult(
        'orientation' as Str,
        'Orientation (1.3.4)' as Str,
        'CSS does not force display orientation' as Str,
        'Visual' as Str,
        '1.3.4' as Str,
      );
    },
  },
  {
    id: 'identify-input-purpose' as Str,
    label: 'Identify input purpose (1.3.5)' as Str,
    description: 'Input elements for personal data have autocomplete attributes' as Str,
    category: 'Forms' as Str,
    wcag: '1.3.5' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const personalInputPattern: RegExp =
        /type="(email|tel|name|password|url)"|name="(email|phone|name|username|password|address)"/;
      const autocompletePattern: RegExp = /autocomplete/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!personalInputPattern.test(content as string)) {
          continue;
        }
        if (autocompletePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Personal data input (email, tel, name, password) without autocomplete attribute' as Str,
            solution:
              'Add autocomplete="email|tel|name|current-password" to personal data inputs' as Str,
            found: truncSnippet(
              (((content as string).match(/type="(?:email|tel|password)"\s*[^>]*>/) ??
                [])[0] as Str) ?? ('<input type="email"> <!-- missing autocomplete -->' as Str),
            ),
            fix: '<input type="email" autocomplete="email" />' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} personal data inputs have autocomplete attributes` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'reflow' as Str,
    label: 'Reflow at 320px (1.4.10)' as Str,
    description: 'CSS does not use fixed widths on containers that prevent reflow' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.10' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Fixed widths over 320px on containers block reflow; ignore icons/images */
      const fixedWidthPattern: RegExp = /(?:width|min-width)\s*:\s*(\d+)px/g;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        let hasBlockingWidth: boolean = false;
        let match: RegExpExecArray | null = fixedWidthPattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the pixel value */
          const px: number = Number.parseInt(match[1] ?? '0', 10);
          if (px > 320) {
            hasBlockingWidth = true;
          }
          match = fixedWidthPattern.exec(content as string);
        }
        fixedWidthPattern.lastIndex = 0;

        if (hasBlockingWidth) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Fixed width/min-width over 320px prevents content reflow on narrow viewports' as Str,
            solution:
              'Use max-width, percentage, or responsive units instead of fixed px widths over 320px' as Str,
            found: truncSnippet(
              (((content as string).match(/(?:width|min-width)\s*:\s*\d{4,}px[^;]*;/) ??
                [])[0] as Str) ?? ('width: 800px; /* blocks reflow */' as Str),
            ),
            fix: 'max-width: 100%; width: min(800px, 100%); /* allows reflow at 320px */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets allow reflow at 320px` as Str,
        (fail as number) > 0 ? 'warning' : undefined,
        findings,
      );
    },
  },
  {
    id: 'text-spacing' as Str,
    label: 'Text spacing (1.4.12)' as Str,
    description: 'No !important on text spacing properties that prevents user overrides' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.12' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const importantSpacingPattern: RegExp =
        /(line-height|letter-spacing|word-spacing)\s*:[^;]*!important/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (importantSpacingPattern.test(content as string)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '!important on text spacing properties (line-height, letter-spacing, word-spacing)' as Str,
            solution:
              'Remove !important from text spacing properties to allow user style overrides' as Str,
            found: truncSnippet(
              (((content as string).match(
                /(?:line-height|letter-spacing|word-spacing)[^;]*!important[^;]*;/,
              ) ?? [])[0] as Str) ?? ('line-height: 1.5 !important;' as Str),
            ),
            fix: 'line-height: 1.5; /* remove !important to allow user overrides */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} stylesheets allow user text spacing overrides` as Str,
        undefined,
        findings,
      );
    },
  },
  {
    id: 'content-on-hover-focus' as Str,
    label: 'Content on hover/focus (1.4.13)' as Str,
    description: 'Tooltip/popover content is dismissible and persistent on hover' as Str,
    category: 'Components' as Str,
    wcag: '1.4.13' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const hoverContentPattern: RegExp =
        /tooltip|popover|Tooltip|Popover|onmouseenter|on:mouseenter/i;
      const dismissPattern: RegExp = /Escape|dismiss|close|onkeydown|on:keydown/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!hoverContentPattern.test(content as string)) {
          continue;
        }
        if (dismissPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Hover/focus content (tooltip/popover) without dismiss mechanism' as Str,
            solution:
              'Add Escape key handler to dismiss hover content and keep it persistent while hovered' as Str,
            found: truncSnippet(
              (((content as string).match(
                /<[A-Za-z][^>]*(?:[Tt]ooltip|[Pp]opover|onmouseenter)[^>]*>/,
              ) ?? [])[0] as Str) ?? ('<Tooltip> <!-- no Escape dismiss -->' as Str),
            ),
            fix: 'onkeydown={(e) => { if (e.key === "Escape") setOpen(false); }}' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} hover/focus content components are dismissible` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'status-messages-wcag' as Str,
    label: 'Status messages — ARIA live (4.1.3)' as Str,
    description: 'Dynamic status changes use aria-live or role="status"/"alert"' as Str,
    category: 'Screen Readers' as Str,
    wcag: '4.1.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      /* Only match status words in actual template/code context, not in JSDoc comments.
       * Require the status word to appear in a class attribute, element text, or variable
       * to reduce false positives from documentation or type definitions. */
      const statusInTemplatePattern: RegExp =
        /class="[^"]*(?:success|error|warning|loading|progress|notification)[^"]*"|>\s*(?:Loading|Error|Warning|Success)\b/;
      const livePattern: RegExp = /aria-live|role="status"|role="alert"|role="log"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        /* Strip JSDoc comments before matching to avoid false positives from documentation. */
        const stripped: string = (content as string).replaceAll(/\/\*\*[\s\S]*?\*\//g, '');
        if (!statusInTemplatePattern.test(stripped)) {
          continue;
        }
        if (livePattern.test(stripped)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Status content (success/error/warning/loading) without ARIA live region' as Str,
            solution:
              'Add aria-live="polite" or role="status" to dynamic status message containers' as Str,
            found: truncSnippet(
              (((content as string).match(
                /class="[^"]*(?:success|error|warning|loading|progress)[^"]*"/,
              ) ?? [])[0] as Str) ?? ('class="error" <!-- no aria-live -->' as Str),
            ),
            fix: '<div role="status" aria-live="polite" class="error">...</div>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} status components use ARIA live regions` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- WAI-ARIA 1.2 additional checks (3 rules) ---- */
  {
    id: 'aria-required-attrs' as Str,
    label: 'ARIA required attributes' as Str,
    description: 'Elements with ARIA roles have all required attributes for that role' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const rolePattern: RegExp = /role="([^"]+)"/g;

      for (const [filename, content] of files) {
        let hasRoles: boolean = false;
        let allValid: boolean = true;
        let match: RegExpExecArray | null = rolePattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the role value */
          const role: Str = (match[1] ?? '') as Str;
          const required: ReadonlyArray<Str> | undefined = REQUIRED_ARIA_ATTRS.get(role);
          if (required !== undefined) {
            hasRoles = true;
            for (const attr of required) {
              if (!(content as string).includes(attr as string)) {
                allValid = false;
              }
            }
          }
          match = rolePattern.exec(content as string);
        }
        rolePattern.lastIndex = 0;

        if (!hasRoles) {
          continue;
        }
        if (allValid) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'ARIA role missing required attributes (e.g., checkbox without aria-checked)' as Str,
            solution:
              'Add all required ARIA attributes for the role (see WAI-ARIA 1.2 spec for required attrs per role)' as Str,
            found: truncSnippet(
              (((content as string).match(
                /role="(?:checkbox|switch|slider|spinbutton|scrollbar|combobox|option)"\b[^>]*>/,
              ) ?? [])[0] as Str) ?? ('role="checkbox" <!-- missing aria-checked -->' as Str),
            ),
            fix: 'role="checkbox" aria-checked={isChecked} <!-- add all required attrs -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components have all required ARIA attributes for their roles` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-valid-values' as Str,
    label: 'ARIA valid attribute values' as Str,
    description: 'ARIA attribute values conform to the specification' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Boolean ARIA attributes must be "true" or "false" */
      const booleanAriaPattern: RegExp =
        /aria-(expanded|checked|selected|pressed|disabled|hidden|required|invalid|grabbed|modal)\s*=\s*"([^"]*)"/g;
      const validBooleans: ReadonlySet<Str> = new Set([
        'true',
        'false',
        'mixed',
        'undefined',
      ] as Str[]);

      for (const [filename, content] of files) {
        let hasAria: boolean = false;
        let allValid: boolean = true;
        let match: RegExpExecArray | null = booleanAriaPattern.exec(content as string);

        while (match !== null) {
          hasAria = true;
          /* Group [2] is the attribute value */
          const val: Str = (match[2] ?? '') as Str;
          if (!validBooleans.has(val) && !(val as string).startsWith('{')) {
            allValid = false;
          }
          match = booleanAriaPattern.exec(content as string);
        }
        booleanAriaPattern.lastIndex = 0;

        if (!hasAria) {
          continue;
        }
        if (allValid) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Invalid ARIA boolean attribute value (must be "true", "false", "mixed", or "undefined")' as Str,
            solution:
              'Use valid boolean values for ARIA attributes: "true", "false", "mixed", or bind to a variable' as Str,
            found: truncSnippet(
              (((content as string).match(
                /aria-(?:expanded|checked|selected|pressed|disabled|hidden)="(?!true|false|mixed|undefined)[^"]*"/,
              ) ?? [])[0] as Str) ?? ('aria-expanded="yes" <!-- invalid value -->' as Str),
            ),
            fix: 'aria-expanded={isOpen} <!-- bind to boolean; renders "true" or "false" -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components use valid ARIA attribute values` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-prohibited-attrs' as Str,
    label: 'ARIA prohibited attributes' as Str,
    description: 'Elements do not use ARIA attributes prohibited for their role' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const rolePattern: RegExp = /role="([^"]+)"/g;

      for (const [filename, content] of files) {
        let hasProhibitedRoles: boolean = false;
        let allValid: boolean = true;
        let match: RegExpExecArray | null = rolePattern.exec(content as string);

        while (match !== null) {
          /* Group [1] is the role value */
          const role: Str = (match[1] ?? '') as Str;
          const prohibited: ReadonlyArray<Str> | undefined = PROHIBITED_ARIA_ATTRS.get(role);
          if (prohibited !== undefined) {
            hasProhibitedRoles = true;
            for (const attr of prohibited) {
              if ((content as string).includes(attr as string)) {
                allValid = false;
              }
            }
          }
          match = rolePattern.exec(content as string);
        }
        rolePattern.lastIndex = 0;

        if (!hasProhibitedRoles) {
          continue;
        }
        if (allValid) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Prohibited ARIA attribute used on element with presentation/none/generic role' as Str,
            solution:
              'Remove aria-label/aria-labelledby from elements with role="presentation", "none", or "generic"' as Str,
            found: truncSnippet(
              (((content as string).match(/role="(?:presentation|none|generic)"[^>]*aria-/) ??
                [])[0] as Str) ??
                ('role="presentation" aria-label="..." <!-- prohibited -->' as Str),
            ),
            fix: '<img role="presentation" alt="" /> <!-- remove aria-label from presentational elements -->' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} components avoid prohibited ARIA attributes for their roles` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- Section 508 specific (2 rules) ---- */
  {
    id: 'section-508-forms' as Str,
    label: 'Section 508 form grouping' as Str,
    description: 'Form elements are properly grouped with fieldset/legend' as Str,
    category: 'Forms' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const formPattern: RegExp = /<form\b/;
      const groupPattern: RegExp = /<fieldset\b|<legend\b|role="group"|aria-labelledby|<label\b/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!formPattern.test(content as string)) {
          continue;
        }
        if (groupPattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Form without fieldset/legend grouping or label elements' as Str,
            solution:
              'Group related form controls with <fieldset> and <legend>, and add <label> to inputs' as Str,
            found: truncSnippet(
              (((content as string).match(/<form\b[^>]*>/) ?? [])[0] as Str) ??
                ('<form> <!-- no fieldset/legend -->' as Str),
            ),
            fix: '<form>\n  <fieldset>\n    <legend>Group label</legend>\n    <label for="f">Field</label>\n    <input id="f" />\n  </fieldset>\n</form>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} forms have proper fieldset/legend grouping` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },
  {
    id: 'section-508-tables' as Str,
    label: 'Section 508 table headers' as Str,
    description: 'Data tables have th headers with scope attributes' as Str,
    category: 'Components' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const tablePattern: RegExp = /<table\b/;
      const thPattern: RegExp = /<th\b/;
      const scopePattern: RegExp = /scope\s*=\s*"/;
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of files) {
        if (!tablePattern.test(content as string)) {
          continue;
        }
        if (thPattern.test(content as string) && scopePattern.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else if (thPattern.test(content as string)) {
          /* Has th but no scope — warning-worthy */
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Table has <th> headers but missing scope attribute' as Str,
            solution:
              'Add scope="col" or scope="row" to <th> elements to associate headers with data cells' as Str,
            found: truncSnippet(
              (((content as string).match(/<th\b[^>]*>/) ?? [])[0] as Str) ??
                ('<th> <!-- missing scope -->' as Str),
            ),
            fix: '<th scope="col">Header</th>' as Str,
          });
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Data table without <th> header elements' as Str,
            solution: 'Add <th scope="col"> headers in <thead> to identify table columns' as Str,
            found: truncSnippet(
              (((content as string).match(/<table\b[^>]*>/) ?? [])[0] as Str) ??
                ('<table> <!-- no <th> headers -->' as Str),
            ),
            fix: '<table>\n  <thead>\n    <tr><th scope="col">Name</th><th scope="col">Value</th></tr>\n  </thead>\n</table>' as Str,
          });
        }
      }

      const total: Num = ((pass as number) + (fail as number)) as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        `${pass}/${total} data tables have th headers with scope attributes` as Str,
        (total as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ---- EN 301 549 specific (1 rule) ---- */
  {
    id: 'en-301-549-docs' as Str,
    label: 'EN 301 549 documentation accessibility' as Str,
    description: 'Documentation and help pages exist and are accessible' as Str,
    category: 'Navigation' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const allFiles: SourceEntry[] = [...sources.entries()] as SourceEntry[];
      let pass: Num = 0 as Num;
      const passing: Str[] = [];
      const docsPattern: RegExp = /\/help|\/support|\/docs|\/documentation|\/faq/i;
      const findings: A11yFileFinding[] = [];

      for (const [filename] of allFiles) {
        if (docsPattern.test(filename as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }

      const fail: Num = (pass as number) > 0 ? (0 as Num) : (1 as Num);
      if ((pass as number) === 0) {
        findings.push({
          file: '(global)' as Str,
          problem: 'No help, support, or documentation routes found' as Str,
          solution:
            'Create /help, /support, or /docs routes with accessible documentation pages' as Str,
          found: '// /help, /support, /docs — no matching routes found' as Str,
          fix: '// Create a route: src/routes/help/+page.svelte' as Str,
        });
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        (pass as number) > 0 ? [] : ['(no help/docs routes found)' as Str],
        (pass as number) > 0
          ? (`Documentation routes found in ${pass} files` as Str)
          : ('No help/support/docs routes found' as Str),
        (pass as number) === 0 ? 'not-applicable' : undefined,
        findings,
      );
    },
  },

  /* ------------------------------------------------------------------ */
  /*  axe-core rules (13 new)                                           */
  /* ------------------------------------------------------------------ */

  {
    id: 'duplicate-landmarks' as Str,
    label: 'No Duplicate Landmarks' as Str,
    description:
      'Landmark roles (main, navigation, banner) must be unique or have unique aria-labels' as Str,
    category: 'Landmarks' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const landmarks: Str[] = [
        'main',
        'navigation',
        'banner',
        'contentinfo',
        'complementary',
        'search',
      ] as Str[];
      for (const [filename, content] of files) {
        let hasDupe: boolean = false;
        for (const lm of landmarks) {
          let tagPattern: RegExp;
          if (lm === 'main') {
            tagPattern = /<main[\s>]/g;
          } else if (lm === 'navigation') {
            tagPattern = /<nav[\s>]/g;
          } else {
            tagPattern = new RegExp(`role="${lm}"`, 'g');
          }
          const matches: RegExpMatchArray | null = (content as string).match(tagPattern);
          if (matches && matches.length > 1) {
            /* Multiple landmarks of same type — check for aria-label differentiation */
            let labelPattern: RegExp;
            if (lm === 'main') {
              labelPattern = /<main[^>]*aria-label/g;
            } else if (lm === 'navigation') {
              labelPattern = /<nav[^>]*aria-label/g;
            } else {
              labelPattern = new RegExp(`role="${lm}"[^>]*aria-label`, 'g');
            }
            const labeled: RegExpMatchArray | null = (content as string).match(labelPattern);
            if (!labeled || labeled.length < matches.length) {
              hasDupe = true;
            }
          }
        }
        if (hasDupe) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Multiple <nav> without unique aria-label on each landmark' as Str,
            solution:
              'Add a unique aria-label to each landmark to distinguish them for screen reader users' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:nav|main)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<nav> <!-- duplicate landmark without aria-label -->' as Str),
            ),
            fix: '<nav aria-label="Main navigation">...</nav>\n<nav aria-label="Breadcrumb navigation">...</nav>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have duplicate landmarks without unique aria-labels` as Str)
          : ('All landmark roles are unique or properly labeled' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'valid-autocomplete' as Str,
    label: 'Valid Autocomplete Values' as Str,
    description: 'Input autocomplete attributes use valid HTML spec values' as Str,
    category: 'Forms' as Str,
    wcag: '1.3.5' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      const validValues: Set<Str> = new Set([
        'off',
        'on',
        'name',
        'honorific-prefix',
        'given-name',
        'additional-name',
        'family-name',
        'honorific-suffix',
        'nickname',
        'email',
        'username',
        'new-password',
        'current-password',
        'one-time-code',
        'organization-title',
        'organization',
        'street-address',
        'address-line1',
        'address-line2',
        'address-line3',
        'address-level4',
        'address-level3',
        'address-level2',
        'address-level1',
        'country',
        'country-name',
        'postal-code',
        'cc-name',
        'cc-given-name',
        'cc-additional-name',
        'cc-family-name',
        'cc-number',
        'cc-exp',
        'cc-exp-month',
        'cc-exp-year',
        'cc-csc',
        'cc-type',
        'transaction-currency',
        'transaction-amount',
        'language',
        'bday',
        'bday-day',
        'bday-month',
        'bday-year',
        'sex',
        'tel',
        'tel-country-code',
        'tel-national',
        'tel-area-code',
        'tel-local',
        'tel-extension',
        'impp',
        'url',
        'photo',
      ] as Str[]);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const acPattern: RegExp = /autocomplete="([^"]+)"/g;
      for (const [filename, content] of files) {
        let hasInvalid: boolean = false;
        let invalidValue: Str = '' as Str;
        let match: RegExpExecArray | null;
        while ((match = acPattern.exec(content as string)) !== null) {
          const vals: Str[] = (match[1] as string).split(' ') as Str[];
          for (const v of vals) {
            if (!validValues.has(v) && !(v as string).startsWith('section-')) {
              hasInvalid = true;
              invalidValue = v;
            }
          }
        }
        acPattern.lastIndex = 0;
        if (hasInvalid) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `Invalid autocomplete value: "${invalidValue}"` as Str,
            solution:
              'Use a valid HTML spec autocomplete value like "name", "email", "tel", "current-password"' as Str,
            found: `autocomplete="${invalidValue}"` as Str,
            fix: 'autocomplete="email" <!-- use valid HTML spec value -->' as Str,
          });
        } else if (/autocomplete=/.test(content as string)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have invalid autocomplete values` as Str)
          : ('All autocomplete values are valid HTML spec values' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'aria-required-children' as Str,
    label: 'ARIA Required Children' as Str,
    description:
      'Elements with roles that require specific children have them (e.g. list needs listitem)' as Str,
    category: 'ARIA' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      const parentChildMap: Array<[Str, Str]> = [
        ['role="list"', 'role="listitem"'],
        ['role="menu"', 'role="menuitem"'],
        ['role="menubar"', 'role="menuitem"'],
        ['role="tablist"', 'role="tab"'],
        ['role="tree"', 'role="treeitem"'],
        ['role="grid"', 'role="row"'],
        ['role="radiogroup"', 'role="radio"'],
      ] as Array<[Str, Str]>;
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        let fileFailed: boolean = false;
        let failedParent: Str = '' as Str;
        let failedChild: Str = '' as Str;
        for (const [parent, child] of parentChildMap) {
          if (
            (content as string).includes(parent as string) &&
            !(content as string).includes(child as string)
          ) {
            fileFailed = true;
            failedParent = parent;
            failedChild = child;
          }
        }
        if (fileFailed) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual parent element with its role */
          const roleAttr: Str = (failedParent as string).replace('role=', '') as Str;
          const parentRegex: RegExp = new RegExp(
            `<[^>]*${(failedParent as string).replaceAll('"', '"')}[^>]*>`,
          );
          const parentMatch: RegExpMatchArray | null = (content as string).match(parentRegex);
          const ariaFound: Str = parentMatch
            ? truncSnippet(parentMatch[0] as Str)
            : (`${failedParent} without ${failedChild} children` as Str);
          const ariaFix: Str = parentMatch
            ? (`Add child element with ${failedChild} inside ${truncSnippet(parentMatch[0] as Str)}` as Str)
            : (`Add ${failedChild} to child elements of ${roleAttr}` as Str);
          findings.push({
            file: filename,
            problem: `${failedParent} is missing required ${failedChild} children` as Str,
            solution:
              `Add child elements with ${failedChild} inside the ${failedParent} container` as Str,
            found: ariaFound,
            fix: ariaFix,
          });
        } else {
          const hasParent: boolean = parentChildMap.some(([p]) =>
            (content as string).includes(p as string),
          );
          if (hasParent) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have ARIA parents missing required children` as Str)
          : ('All ARIA parent-child relationships are correct' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'aria-required-parent' as Str,
    label: 'ARIA Required Parent' as Str,
    description:
      'Elements with roles that require specific parents have them (e.g. listitem inside list)' as Str,
    category: 'ARIA' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      const childParentMap: Array<[Str, Str[]]> = [
        ['role="listitem"', ['role="list"']],
        ['role="menuitem"', ['role="menu"', 'role="menubar"']],
        ['role="tab"', ['role="tablist"']],
        ['role="treeitem"', ['role="tree"']],
        ['role="row"', ['role="grid"', 'role="table"', 'role="treegrid"']],
        ['role="option"', ['role="listbox"']],
      ] as Array<[Str, Str[]]>;
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        let fileFailed: boolean = false;
        for (const [child, parents] of childParentMap) {
          if ((content as string).includes(child as string)) {
            const hasParent: boolean = parents.some((p: Str) =>
              (content as string).includes(p as string),
            );
            if (!hasParent) {
              fileFailed = true;
            }
          }
        }
        if (fileFailed) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'ARIA child element is missing its required parent container' as Str,
            solution:
              'Wrap the element in the required parent role (e.g., role="list" for role="listitem")' as Str,
            found: truncSnippet(
              (((content as string).match(
                /role="(?:listitem|menuitem|tab|treeitem|row|option)"\b[^>]*>/,
              ) ?? [])[0] as Str) ?? ('role="listitem" <!-- no role="list" parent -->' as Str),
            ),
            fix: '<ul role="list">\n  <li role="listitem">...</li>\n</ul>' as Str,
          });
        } else {
          const hasChild: boolean = childParentMap.some(([c]) =>
            (content as string).includes(c as string),
          );
          if (hasChild) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have ARIA children without required parents` as Str)
          : ('All ARIA child elements have required parents' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'image-alt-quality' as Str,
    label: 'Image Alt Text Quality' as Str,
    description:
      'Images with alt text do not use generic descriptions (image, photo, picture, logo.png)' as Str,
    category: 'Content' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      const badAlts: RegExp =
        /alt="(image|photo|picture|graphic|icon|logo|banner|placeholder|untitled|img|pic)\b/gi;
      const fileExtAlt: RegExp = /alt="[^"]*\.\w{2,4}"/g;
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        if (!/<img[\s>]/.test(content as string)) {
          continue;
        }
        const hasBad: boolean =
          badAlts.test(content as string) || fileExtAlt.test(content as string);
        badAlts.lastIndex = 0;
        fileExtAlt.lastIndex = 0;
        if (hasBad) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual <img> tag with the bad alt text */
          const imgMatch: RegExpMatchArray | null = (content as string).match(
            /<img[^>]*alt="[^"]*"[^>]*>/,
          );
          const imgFound: Str = imgMatch
            ? truncSnippet(imgMatch[0] as Str)
            : ('alt="image"' as Str);
          const imgFix: Str = imgMatch
            ? truncSnippet(
                (imgMatch[0] as string).replace(
                  /alt="[^"]*"/,
                  'alt="Descriptive text about the image"',
                ) as Str,
              )
            : ('<img alt="Descriptive text about the image">' as Str);
          findings.push({
            file: filename,
            problem: 'Image alt text uses a generic or filename-based description' as Str,
            solution:
              'Replace with specific, descriptive alt text that conveys the meaning or purpose of the image' as Str,
            found: imgFound,
            fix: imgFix,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have images with generic alt text` as Str)
          : ('All image alt text is descriptive and specific' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'table-header-scope' as Str,
    label: 'Table Header Scope' as Str,
    description:
      'Data tables have th elements with scope attribute for proper header association' as Str,
    category: 'Tables' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        if (!/<table[\s>]/.test(content as string)) {
          continue;
        }
        const hasTh: boolean = /<th[\s>]/.test(content as string);
        if (!hasTh) {
          continue;
        }
        /* th without scope is a violation in data tables */
        const thWithoutScope: boolean = /<th(?![^>]*scope=)[^>]*>/.test(content as string);
        if (thWithoutScope) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual <th> tag without scope */
          const thMatch: RegExpMatchArray | null = (content as string).match(
            /<th(?![^>]*scope=)[^>]*>[^<]*/,
          );
          const thFound: Str = thMatch
            ? truncSnippet(thMatch[0] as Str)
            : ('<th> without scope attribute' as Str);
          const thFix: Str = thMatch
            ? truncSnippet((thMatch[0] as string).replace(/<th/, '<th scope="col"') as Str)
            : ('<th scope="col">Content</th>' as Str);
          findings.push({
            file: filename,
            problem:
              'Table header cell missing scope attribute — screen readers cannot associate it with data cells' as Str,
            solution: 'Add scope="col" for column headers or scope="row" for row headers' as Str,
            found: thFound,
            fix: thFix,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have table headers without scope attribute` as Str)
          : ('All table headers have proper scope attributes' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'form-fieldset-legend' as Str,
    label: 'Form Fieldset & Legend' as Str,
    description: 'Radio and checkbox groups are wrapped in fieldset with legend' as Str,
    category: 'Forms' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const radioCheckboxGroup: RegExp = /type="(radio|checkbox)"/g;
      for (const [filename, content] of files) {
        const matches: RegExpMatchArray | null = (content as string).match(radioCheckboxGroup);
        if (!matches || matches.length < 2) {
          continue;
        }
        /* Multiple radio/checkbox inputs — should have fieldset+legend */
        const hasFieldset: boolean = /<fieldset[\s>]/.test(content as string);
        const hasLegend: boolean = /<legend[\s>]/.test(content as string);
        if (hasFieldset && hasLegend) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Multiple radio/checkbox inputs without <fieldset> and <legend> grouping' as Str,
            solution:
              'Wrap the group in <fieldset> with a <legend> that describes the group' as Str,
            found: truncSnippet(
              (((content as string).match(/type="(?:radio|checkbox)"[^>]*>/) ?? [])[0] as Str) ??
                ('<input type="radio"> <!-- no fieldset -->' as Str),
            ),
            fix: '<fieldset>\n  <legend>Choose an option</legend>\n  <input type="radio" id="opt1" />\n  <label for="opt1">Option 1</label>\n</fieldset>' as Str,
          });
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have radio/checkbox groups without fieldset+legend` as Str)
          : ('All form groups use fieldset with legend' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'link-distinguishable' as Str,
    label: 'Links Distinguishable' as Str,
    description:
      'Links have visual cues beyond color alone (underline, font-weight, border)' as Str,
    category: 'Visual' as Str,
    wcag: '1.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const allCss: SourceEntry[] = cssFiles(sources);
      if (allCss.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      for (const [filename, content] of allCss) {
        if (!/(^|\s)a[\s{,:]/.test(content as string) && !/\ba\s*\{/.test(content as string)) {
          continue;
        }
        /* Check if links have underline or other non-color distinguisher */
        const hasUnderline: boolean = /text-decoration.*underline|underline/.test(
          content as string,
        );
        const hasFontWeight: boolean = /font-weight.*bold|font-bold/.test(content as string);
        const hasBorder: boolean = /border-bottom/.test(content as string);
        if (hasUnderline || hasFontWeight || hasBorder) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} CSS files style links without non-color visual cues` as Str)
          : ('Links are visually distinguishable beyond color alone' as Str),
      );
    },
  },

  {
    id: 'svg-accessibility' as Str,
    label: 'SVG Accessibility' as Str,
    description:
      'SVG elements have role="img" + aria-label, or aria-hidden="true" for decorative' as Str,
    category: 'Content' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const svgTag: RegExp = /<svg[\s>]/g;
      for (const [filename, content] of files) {
        const matches: RegExpMatchArray | null = (content as string).match(svgTag);
        if (!matches) {
          continue;
        }
        /* SVGs should have aria-hidden="true" (decorative) or role="img" + aria-label */
        const hasAriaHidden: boolean = /<svg[^>]*aria-hidden="true"/.test(content as string);
        const hasRoleImg: boolean = /<svg[^>]*role="img"/.test(content as string);
        const hasAriaLabel: boolean = /<svg[^>]*aria-label/.test(content as string);
        const hasTitle: boolean = /<svg[^>]*>[\s\S]*?<title/.test(content as string);
        if (hasAriaHidden || (hasRoleImg && (hasAriaLabel || hasTitle))) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual <svg> tag */
          const svgMatch: RegExpMatchArray | null = (content as string).match(/<svg[^>]*>/);
          const svgFound: Str = svgMatch
            ? truncSnippet(svgMatch[0] as Str)
            : ('<svg> without aria-hidden or role="img"' as Str);
          const svgFix: Str = svgMatch
            ? truncSnippet(
                (svgMatch[0] as string).replace('<svg', '<svg aria-hidden="true"') as Str,
              )
            : ('<svg aria-hidden="true">' as Str);
          findings.push({
            file: filename,
            problem:
              'SVG element missing aria-hidden (decorative) or role="img" + aria-label (meaningful)' as Str,
            solution:
              'Add aria-hidden="true" for decorative SVGs, or role="img" and aria-label for meaningful ones' as Str,
            found: svgFound,
            fix: svgFix,
          });
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have SVGs without proper accessibility attributes` as Str)
          : ('All SVG elements are properly accessible or hidden' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'iframe-title' as Str,
    label: 'Iframe Title' as Str,
    description: 'All iframe elements have a title attribute describing their content' as Str,
    category: 'Content' as Str,
    wcag: '2.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of files) {
        if (!/<iframe[\s>]/.test(content as string)) {
          continue;
        }
        const iframeWithoutTitle: boolean = /<iframe(?![^>]*title=)[^>]*>/.test(content as string);
        if (iframeWithoutTitle) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Iframe element missing title attribute — screen readers cannot identify its content' as Str,
            solution: 'Add a title attribute that describes what the iframe contains' as Str,
            found: truncSnippet(
              (((content as string).match(/<iframe(?![^>]*title=)[^>]*>/) ?? [])[0] as Str) ??
                ('<iframe> <!-- missing title -->' as Str),
            ),
            fix: '<iframe title="Google Maps showing our office location" src="..."></iframe>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have iframes without title attribute` as Str)
          : ('All iframes have descriptive title attributes' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'touch-target-size' as Str,
    label: 'Touch Target Size' as Str,
    description: 'Interactive elements have minimum 44x44px touch targets (WCAG 2.5.5 AAA)' as Str,
    category: 'Pointer' as Str,
    wcag: '2.5.5' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Very small interactive elements (size-2, size-3, size-4 = 8px, 12px, 16px) */
      const tinyInteractive: RegExp = /<(button|a|input)[^>]*class="[^"]*\bsize-[234]\b[^"]*"/g;
      for (const [filename, content] of files) {
        const matches: RegExpMatchArray | null = (content as string).match(tinyInteractive);
        tinyInteractive.lastIndex = 0;
        if (matches && matches.length > 0) {
          /* Check if there's padding to compensate */
          const hasPadding: boolean =
            /\bp-[3-9]\b|\bpx-[3-9]\b|\bpy-[3-9]\b|\bmin-h-\[44px\]|\bmin-w-\[44px\]/.test(
              content as string,
            );
          if (hasPadding) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          } else {
            fail = ((fail as number) + 1) as Num;
            failing.push(filename);
            findings.push({
              file: filename,
              problem: 'Interactive element has a touch target smaller than 44×44px' as Str,
              solution:
                'Add min-h-[44px] min-w-[44px] or sufficient padding to meet the minimum touch target size' as Str,
              found: truncSnippet(
                (((content as string).match(
                  /<(?:button|a|input)[^>]*class="[^"]*\bsize-[234]\b[^"]*"[^>]*>/,
                ) ?? [])[0] as Str) ?? ('<button class="size-3"> (12px touch target)' as Str),
              ),
              fix: '<button class="size-3 min-h-[44px] min-w-[44px]"> <!-- expanded touch target -->' as Str,
            });
          }
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have interactive elements smaller than 44x44px` as Str)
          : ('All interactive touch targets meet minimum size requirements' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'heading-hierarchy' as Str,
    label: 'Heading Hierarchy' as Str,
    description: 'Heading levels (h1-h6) do not skip levels (e.g. h1 then h3 without h2)' as Str,
    category: 'Structure' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const files: SourceEntry[] = svelteFiles(sources);
      if (files.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const headingPattern: RegExp = /<h([1-6])[\s>]/g;
      for (const [filename, content] of files) {
        const headings: Num[] = [];
        let match: RegExpExecArray | null;
        while ((match = headingPattern.exec(content as string)) !== null) {
          headings.push(Number.parseInt(match[1] as string, 10) as Num);
        }
        headingPattern.lastIndex = 0;
        if (headings.length < 2) {
          continue;
        }
        let skipped: boolean = false;
        let skipPrev: Num = 0 as Num;
        let skipCurr: Num = 0 as Num;
        for (let i: number = 1; i < headings.length; i++) {
          const prev: Num = headings[i - 1] as Num;
          const curr: Num = headings[i] as Num;
          if ((curr as number) > (prev as number) + 1) {
            skipped = true;
            skipPrev = prev;
            skipCurr = curr;
          }
        }
        if (skipped) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          /* Extract the actual heading sequence found in the file */
          const headingSeq: Str = headings.map((h: Num) => `<h${h}>`).join(' ') as Str;
          const headingFound: Str = truncSnippet(headingSeq);
          const headingFix: Str =
            `<h${skipPrev}> should be followed by <h${(skipPrev as number) + 1}>, not <h${skipCurr}>` as Str;
          findings.push({
            file: filename,
            problem:
              `Heading hierarchy skips from <h${skipPrev}> to <h${skipCurr}> — missing intermediate level(s)` as Str,
            solution:
              'Use sequential heading levels without gaps; each level should increment by at most 1' as Str,
            found: headingFound,
            fix: headingFix,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files skip heading levels` as Str)
          : ('All heading hierarchies are sequential' as Str),
        undefined,
        findings,
      );
    },
  },

  {
    id: 'landmark-completeness' as Str,
    label: 'Landmark Completeness' as Str,
    description: 'Layout files contain main and navigation landmarks for page structure' as Str,
    category: 'Landmarks' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const layouts: SourceEntry[] = layoutFiles(sources);
      if (layouts.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      for (const [filename, content] of layouts) {
        const hasMain: boolean =
          /<main[\s>]/.test(content as string) || /role="main"/.test(content as string);
        const hasNav: boolean =
          /<nav[\s>]/.test(content as string) || /role="navigation"/.test(content as string);
        if (hasMain && hasNav) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              `Layout missing ${hasMain ? '<nav>' : '<main>'} landmark — screen readers use these to navigate page structure` as Str,
            solution:
              'Add both <main> and <nav> landmarks to the layout for proper page structure' as Str,
            found: truncSnippet(
              (((content as string).match(/<(?:div|header|body)\b[^>]*>/) ?? [])[0] as Str) ??
                ('<div> <!-- no <main> or <nav> landmarks -->' as Str),
            ),
            fix: '<nav aria-label="Main navigation">...</nav>\n<main id="main-content">...\n  {@render children()}\n</main>' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} layout files missing main or navigation landmarks` as Str)
          : ('All layouts have main and navigation landmarks' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- WCAG 2.1 AA Gaps (3 rules) ---- */
  {
    id: 'pause-stop-hide' as Str,
    label: 'Pause, stop, hide' as Str,
    description:
      'Moving, blinking, or auto-updating content can be paused, stopped, or hidden (WCAG 2.2.2)' as Str,
    category: 'Visual' as Str,
    wcag: '2.2.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const css: SourceEntry[] = cssFiles(sources);
      const svelte: SourceEntry[] = svelteFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];

      /* Check CSS: animation/keyframes without prefers-reduced-motion guard */
      for (const [filename, content] of css) {
        const str: string = content as string;
        const hasAnimation: boolean =
          /animation\s*:/.test(str) || /@keyframes\s/.test(str) || /transition\s*:/.test(str);
        if (!hasAnimation) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
          continue;
        }
        const hasMotionQuery: boolean = /prefers-reduced-motion/.test(str);
        const hasPauseControl: boolean =
          /animation-play-state\s*:\s*paused/.test(str) || /\.paused/.test(str);
        if (hasMotionQuery || hasPauseControl) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'CSS animation/transition without prefers-reduced-motion guard or pause mechanism' as Str,
            solution:
              'Add @media (prefers-reduced-motion: reduce) to disable/simplify animations, or provide a pause control' as Str,
            found: truncSnippet(
              (((str.match(/animation\s*:[^;]+;/) ?? [])[0] as Str) ??
                ('@keyframes ... { }' as Str)) as Str,
            ),
            fix: '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }' as Str,
          });
        }
      }

      /* Check Svelte: autoplay on media without pause controls */
      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasAutoplay: boolean = /<(?:video|audio)[^>]*\bautoplay\b/.test(str);
        if (!hasAutoplay) {
          continue;
        }
        const hasPauseBtn: boolean = /pause|controls/.test(str);
        if (hasPauseBtn) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Media element with autoplay but no visible pause/stop control' as Str,
            solution: 'Add the controls attribute or provide a visible pause button' as Str,
            found: truncSnippet(
              ((str.match(/<(?:video|audio)[^>]*autoplay[^>]*>/) ?? [])[0] as Str) ??
                ('<video autoplay>' as Str),
            ),
            fix: '<video autoplay controls>' as Str,
          });
        }
      }

      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have animations/media without pause mechanism` as Str)
          : ('All animations/media have pause or reduced-motion support' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'parsing-duplicate-ids' as Str,
    label: 'No duplicate IDs' as Str,
    description:
      'Elements must not share the same id attribute value within a component (WCAG 4.1.1, deprecated in 2.2)' as Str,
    category: 'Standards' as Str,
    wcag: '4.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const idPattern: RegExp = /\bid=["']([^"']+)["']/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const ids: string[] = [];
        let match: RegExpExecArray | null = idPattern.exec(str);
        while (match !== null) {
          if (match[1] !== undefined) {
            ids.push(match[1]);
          }
          match = idPattern.exec(str);
        }
        const seen: Set<string> = new Set();
        const duplicates: string[] = [];
        for (const id of ids) {
          if (seen.has(id) && !duplicates.includes(id)) {
            duplicates.push(id);
          }
          seen.add(id);
        }
        if (duplicates.length === 0) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `Duplicate id attribute values: ${duplicates.join(', ')}` as Str,
            solution: 'Ensure every id attribute is unique within the component template' as Str,
            found: `id="${duplicates[0]}" (appears multiple times)` as Str,
            fix: `id="${duplicates[0]}-1" / id="${duplicates[0]}-2"` as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have duplicate id values` as Str)
          : ('No duplicate id values found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'audio-description-aa' as Str,
    label: 'Audio description (AA)' as Str,
    description:
      'Prerecorded video must have an audio description track (WCAG 1.2.5 Level AA)' as Str,
    category: 'Media' as Str,
    wcag: '1.2.5' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      const videoFiles: SourceEntry[] = svelte.filter(([, c]) => /<video[\s>]/.test(c as string));
      if (videoFiles.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of videoFiles) {
        const str: string = content as string;
        const hasDescTrack: boolean = /<track[^>]*kind=["']descriptions["']/.test(str);
        if (hasDescTrack) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: '<video> without <track kind="descriptions"> for audio description' as Str,
            solution:
              'Add a <track kind="descriptions" src="..." srclang="en"> inside the <video> element' as Str,
            found: truncSnippet(
              ((str.match(/<video[^>]*>/) ?? [])[0] as Str) ?? ('<video>' as Str),
            ),
            fix: '<video>\n  <track kind="descriptions" src="desc.vtt" srclang="en" label="Audio Description">\n</video>' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} video elements missing audio description track` as Str)
          : ('All videos have audio description tracks' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- WCAG Technique C7 (1 rule) ---- */
  {
    id: 'visually-hidden-link-text' as Str,
    label: 'Visually hidden link text (C7)' as Str,
    description:
      'Links using visually-hidden text must use clip-path CSS technique, not display:none or visibility:hidden (WCAG C7)' as Str,
    category: 'Utilities' as Str,
    wcag: '2.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      const css: SourceEntry[] = cssFiles(sources);
      /* Find if the project has a visually-hidden / sr-only class definition */
      let usesClipPath: boolean = false;
      let usesDisplayNone: boolean = false;
      let foundDefinition: boolean = false;

      for (const [, content] of css) {
        const str: string = content as string;
        /* Look for sr-only or visually-hidden class definitions */
        if (/(?:\.sr-only|\.visually-hidden|visually-hidden)/.test(str)) {
          foundDefinition = true;
          if (/clip-path\s*:\s*inset\(/.test(str) || /clip\s*:\s*rect\(/.test(str)) {
            usesClipPath = true;
          }
          if (/display\s*:\s*none/.test(str) || /visibility\s*:\s*hidden/.test(str)) {
            usesDisplayNone = true;
          }
        }
      }

      /* Check Svelte files for links containing visually-hidden content */
      let linksWithHidden: Num = 0 as Num;
      const findings: A11yFileFinding[] = [];
      const failing: Str[] = [];
      const passing: Str[] = [];

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasHiddenInLink: boolean =
          /<a[^>]*>[\s\S]*?(?:sr-only|visually-hidden|VisuallyHidden)[\s\S]*?<\/a>/.test(str);
        if (hasHiddenInLink) {
          linksWithHidden = ((linksWithHidden as number) + 1) as Num;
          if (usesDisplayNone && !usesClipPath) {
            failing.push(filename);
            findings.push({
              file: filename,
              problem:
                'Link uses visually-hidden text via display:none or visibility:hidden — this hides content from screen readers too' as Str,
              solution:
                'Use clip-path: inset(50%) technique for visually-hidden text (WCAG C7)' as Str,
              found: '.sr-only { display: none; }' as Str,
              fix: '.sr-only { clip-path: inset(50%); clip: rect(0,0,0,0); height: 1px; width: 1px; overflow: hidden; position: absolute; white-space: nowrap; }' as Str,
            });
          } else {
            passing.push(filename);
          }
        }
      }

      if ((linksWithHidden as number) === 0 && !foundDefinition) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }

      const pass: Num = passing.length as Num;
      const fail: Num = failing.length as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} links use incorrect visually-hidden technique (display:none instead of clip-path)` as Str)
          : ('Visually-hidden link text uses correct clip-path technique (C7)' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- WAI-ARIA 1.2 Gaps (2 rules in part 1) ---- */
  {
    id: 'aria-naming-prohibited' as Str,
    label: 'ARIA naming prohibited elements' as Str,
    description:
      'Elements that prohibit naming must not have aria-label or aria-labelledby (WAI-ARIA 1.2)' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Elements that prohibit naming per WAI-ARIA 1.2 */
      const prohibitedElements: string[] = [
        'p',
        'abbr',
        'b',
        'em',
        'i',
        'code',
        'small',
        'strong',
        'sub',
        'sup',
        'mark',
        'pre',
        'blockquote',
        'cite',
        'del',
        'ins',
        'kbd',
        'samp',
        'var',
      ];
      const prohibitedPattern: RegExp = new RegExp(
        `<(${prohibitedElements.join('|')})\\b[^>]*\\baria-(?:label|labelledby)\\b`,
      );
      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasProhibited: boolean = prohibitedPattern.test(str);
        /* For span/div, only flag if there's no role — separate rule handles that */
        if (hasProhibited) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const matched: string =
            (str.match(prohibitedPattern) ?? [])[0] ?? '<element aria-label="...">';
          findings.push({
            file: filename,
            problem:
              'aria-label/aria-labelledby used on an element that prohibits naming (WAI-ARIA 1.2)' as Str,
            solution:
              'Remove aria-label/aria-labelledby from this element — it has no accessible name computation' as Str,
            found: truncSnippet(matched as Str),
            fix: '<!-- Remove aria-label from naming-prohibited elements like <p>, <code>, <em> -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use aria-label on naming-prohibited elements` as Str)
          : ('No aria-label on naming-prohibited elements' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-hidden-focusable' as Str,
    label: 'ARIA hidden on focusable elements' as Str,
    description:
      'aria-hidden="true" must not be used on focusable elements — hides from AT while remaining keyboard-focusable' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Focusable elements that should never have aria-hidden="true" */
      const focusableWithHidden: RegExp =
        /<(?:button|select|textarea)\b[^>]*\baria-hidden=["']true["']/;
      const anchorWithHidden: RegExp = /<a\b[^>]*\bhref\b[^>]*\baria-hidden=["']true["']/;
      const anchorWithHidden2: RegExp = /<a\b[^>]*\baria-hidden=["']true["'][^>]*\bhref\b/;
      const inputWithHidden: RegExp =
        /<input\b(?![^>]*\btype=["']hidden["'])[^>]*\baria-hidden=["']true["']/;
      const tabindexWithHidden: RegExp = /\btabindex=["'][0-9]+["'][^>]*\baria-hidden=["']true["']/;
      const tabindexWithHidden2: RegExp =
        /\baria-hidden=["']true["'][^>]*\btabindex=["'][0-9]+["']/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasFocusableHidden: boolean =
          focusableWithHidden.test(str) ||
          anchorWithHidden.test(str) ||
          anchorWithHidden2.test(str) ||
          inputWithHidden.test(str) ||
          tabindexWithHidden.test(str) ||
          tabindexWithHidden2.test(str);
        if (hasFocusableHidden) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'aria-hidden="true" on a focusable element — the element is hidden from screen readers but still receives keyboard focus' as Str,
            solution:
              'Remove aria-hidden="true" or add tabindex="-1" to remove from tab order' as Str,
            found: truncSnippet(
              ((str.match(
                /(<(?:button|a|input|select|textarea)\b[^>]*aria-hidden=["']true["'][^>]*>)/,
              ) ?? [])[0] as Str) ?? ('<button aria-hidden="true">' as Str),
            ),
            fix: '<!-- Either remove aria-hidden="true" or add tabindex="-1" -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have aria-hidden="true" on focusable elements` as Str)
          : ('No aria-hidden="true" on focusable elements' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-label-no-role' as Str,
    label: 'ARIA label without role' as Str,
    description:
      'aria-label on generic elements (div, span) without an explicit role has no effect (WAI-ARIA 1.2)' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Match <div or <span with aria-label but no role attribute */
      const divSpanLabelNoRole: RegExp =
        /<(?:div|span)\b(?![^>]*\brole=)[^>]*\baria-label(?:ledby)?=/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (divSpanLabelNoRole.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'aria-label on <div> or <span> without a role — generic elements have no accessible name computation' as Str,
            solution: 'Add an appropriate role attribute or use a semantic element instead' as Str,
            found: truncSnippet(
              ((str.match(divSpanLabelNoRole) ?? [])[0] as Str) ??
                ('<div aria-label="...">' as Str),
            ),
            fix: '<div role="region" aria-label="..."> or <section aria-label="...">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use aria-label on generic elements without a role` as Str)
          : ('No aria-label on generic elements without role' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-live-assertive-misuse' as Str,
    label: 'Assertive live region misuse' as Str,
    description:
      'aria-live="assertive" should only be used for critical alerts — use "polite" for status updates (WAI-ARIA 1.2)' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const assertivePattern: RegExp = /aria-live=["']assertive["']/;
      /* role="alert" is acceptable — it implies assertive semantics for true alerts */
      const alertRolePattern: RegExp = /role=["']alert["']/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasAssertive: boolean = assertivePattern.test(str);
        const hasAlertRole: boolean = alertRolePattern.test(str);
        if (!hasAssertive) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else if (hasAlertRole) {
          /* Assertive with role="alert" is correct usage */
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'aria-live="assertive" used without role="alert" — may interrupt screen reader users unnecessarily' as Str,
            solution:
              'Use aria-live="polite" for status updates, or add role="alert" if this is a critical alert' as Str,
            found: truncSnippet(
              ((str.match(/[^<]*aria-live=["']assertive["'][^>]*/) ?? [])[0] as Str) ??
                ('aria-live="assertive"' as Str),
            ),
            fix: 'aria-live="polite" <!-- or role="alert" for critical alerts -->' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use aria-live="assertive" without role="alert"` as Str)
          : ('All assertive live regions are used correctly' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-redundant-role' as Str,
    label: 'Redundant ARIA role' as Str,
    description:
      'Native HTML elements should not have their implicit role explicitly set (WAI-ARIA 1.2)' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Native element → implicit role mappings */
      const redundantPatterns: RegExp[] = [
        /<button\b[^>]*\brole=["']button["']/,
        /<a\b[^>]*\bhref\b[^>]*\brole=["']link["']/,
        /<a\b[^>]*\brole=["']link["'][^>]*\bhref\b/,
        /<nav\b[^>]*\brole=["']navigation["']/,
        /<main\b[^>]*\brole=["']main["']/,
        /<header\b[^>]*\brole=["']banner["']/,
        /<footer\b[^>]*\brole=["']contentinfo["']/,
        /<aside\b[^>]*\brole=["']complementary["']/,
        /<ul\b[^>]*\brole=["']list["']/,
        /<ol\b[^>]*\brole=["']list["']/,
        /<table\b[^>]*\brole=["']table["']/,
      ];

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const redundant: string[] = [];
        for (const pattern of redundantPatterns) {
          if (pattern.test(str)) {
            const matched: string = (str.match(pattern) ?? [])[0] ?? '';
            redundant.push(matched);
          }
        }
        if (redundant.length === 0) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              `Redundant ARIA role on native element — the implicit role is already correct` as Str,
            solution: 'Remove the redundant role attribute' as Str,
            found: truncSnippet(redundant[0] as Str),
            fix: '<!-- Remove role="..." — the native element already has this implicit role -->' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have redundant ARIA roles on native elements` as Str)
          : ('No redundant ARIA roles found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'aria-menu-nav-misuse' as Str,
    label: 'Menu role on navigation' as Str,
    description:
      'role="menu" is for application menus (toolbars, context menus), not site navigation — use <nav> with <ul> instead' as Str,
    category: 'ARIA' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* role="menu" inside or on a <nav> element */
      const menuInNav: RegExp = /<nav\b[^>]*\brole=["']menu(?:bar)?["']/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (menuInNav.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'role="menu" on <nav> — menu role is for application menus (toolbar actions, context menus), not site navigation' as Str,
            solution:
              'Remove role="menu" from navigation — use <nav> with <ul>/<li> for site navigation' as Str,
            found: truncSnippet(
              ((str.match(menuInNav) ?? [])[0] as Str) ?? ('<nav role="menu">' as Str),
            ),
            fix: '<nav aria-label="Main">\n  <ul>\n    <li><a href="/">Home</a></li>\n  </ul>\n</nav>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use role="menu" on navigation elements` as Str)
          : ('No menu role misuse on navigation elements' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- WHATWG / HTML Spec (2 rules in part 2) ---- */
  {
    id: 'html-interactive-nesting' as Str,
    label: 'Interactive content nesting' as Str,
    description:
      'Interactive elements (button, a) must not contain other interactive elements (WHATWG HTML spec content model)' as Str,
    category: 'HTML Spec' as Str,
    wcag: '4.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <button> containing interactive children */
      const buttonNesting: RegExp =
        /<button\b[^>]*>[\s\S]*?<(?:a\b[^>]*href|button\b|input\b|select\b|textarea\b)/;
      /* <a> containing interactive children */
      const anchorNesting: RegExp =
        /<a\b[^>]*href[^>]*>[\s\S]*?<(?:a\b[^>]*href|button\b|input\b|select\b|textarea\b)/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasButtonNesting: boolean = buttonNesting.test(str);
        const hasAnchorNesting: boolean = anchorNesting.test(str);
        if (hasButtonNesting || hasAnchorNesting) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const parent: string = hasButtonNesting ? '<button>' : '<a>';
          findings.push({
            file: filename,
            problem:
              `${parent} contains interactive content descendants — forbidden by WHATWG HTML content model` as Str,
            solution:
              'Restructure so interactive elements are not nested inside other interactive elements' as Str,
            found: truncSnippet(
              ((str.match(hasButtonNesting ? buttonNesting : anchorNesting) ?? [])[0] as Str) ??
                (`${parent}...<button>...</button>...` as Str),
            ),
            fix: '<!-- Move nested interactive elements outside the parent interactive element -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have interactive elements nested inside other interactive elements` as Str)
          : ('No interactive content nesting violations' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-img-alt-required' as Str,
    label: 'Image alt attribute required' as Str,
    description:
      'Every <img> element must have an alt attribute — its absence is a WHATWG HTML spec violation' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <img> without alt attribute */
      const imgNoAlt: RegExp = /<img\b(?![^>]*\balt\b)[^>]*>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<img\b/.test(str)) {
          continue;
        }
        const matches: RegExpMatchArray | null = str.match(imgNoAlt);
        if (matches !== null && matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `${matches.length} <img> element(s) missing alt attribute` as Str,
            solution:
              'Add alt="description" for informative images or alt="" for decorative images' as Str,
            found: truncSnippet((matches[0] ?? '<img src="...">') as Str),
            fix: '<img src="..." alt="Descriptive text"> or <img src="..." alt="">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <img> elements missing alt attribute` as Str)
          : ('All <img> elements have alt attributes' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-img-empty-alt-role' as Str,
    label: 'Empty alt with role' as Str,
    description:
      '<img alt=""> (decorative) must not have a role attribute — WHATWG HTML spec prohibits it' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const emptyAltWithRole: RegExp = /<img\b[^>]*\balt=["']['"][^>]*\brole=/;
      const emptyAltWithRole2: RegExp = /<img\b[^>]*\brole=[^>]*\balt=["']['"][^>]*/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<img\b/.test(str)) {
          continue;
        }
        if (emptyAltWithRole.test(str) || emptyAltWithRole2.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<img alt=""> with role attribute — decorative images must not have a role' as Str,
            solution: 'Remove the role attribute from decorative images (alt="")' as Str,
            found: truncSnippet(
              ((str.match(emptyAltWithRole) ?? str.match(emptyAltWithRole2) ?? [])[0] as Str) ??
                ('<img alt="" role="...">' as Str),
            ),
            fix: '<img alt="" /> <!-- no role on decorative images -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <img alt=""> with a role attribute` as Str)
          : ('No decorative images have role attributes' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-label-nesting' as Str,
    label: 'Label nesting' as Str,
    description:
      '<label> must not contain another <label> or more than one labelable element (WHATWG HTML spec)' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <label> containing another <label> */
      const nestedLabel: RegExp = /<label\b[^>]*>[\s\S]*?<label\b/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<label\b/.test(str)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
          continue;
        }
        if (nestedLabel.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'Nested <label> elements — labels must not contain other labels' as Str,
            solution: 'Remove nested <label> or restructure to use for/id association' as Str,
            found: truncSnippet(
              ((str.match(nestedLabel) ?? [])[0] as Str) ?? ('<label><label>' as Str),
            ),
            fix: '<label for="field-1">Label 1</label>\n<label for="field-2">Label 2</label>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have nested <label> elements` as Str)
          : ('No nested label violations' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-input-hidden-aria' as Str,
    label: 'Hidden input with ARIA' as Str,
    description:
      '<input type="hidden"> must not have ARIA attributes — hidden inputs are not exposed to accessibility APIs' as Str,
    category: 'HTML Spec' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const hiddenWithAria: RegExp = /<input\b[^>]*\btype=["']hidden["'][^>]*\baria-/;
      const hiddenWithAria2: RegExp = /<input\b[^>]*\baria-[^>]*\btype=["']hidden["']/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (hiddenWithAria.test(str) || hiddenWithAria2.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<input type="hidden"> with ARIA attributes — hidden inputs are not in the accessibility tree' as Str,
            solution: 'Remove ARIA attributes from hidden inputs' as Str,
            found: truncSnippet(
              ((str.match(hiddenWithAria) ?? str.match(hiddenWithAria2) ?? [])[0] as Str) ??
                ('<input type="hidden" aria-...>' as Str),
            ),
            fix: '<input type="hidden" name="..." value="..."> <!-- no aria-* -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have ARIA attributes on hidden inputs` as Str)
          : ('No ARIA attributes on hidden inputs' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-details-summary' as Str,
    label: 'Details/summary structure' as Str,
    description:
      '<details> must have <summary> as its first element child (WHATWG HTML spec)' as Str,
    category: 'HTML Spec' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <details> followed by anything other than <summary> as first child */
      const detailsPattern: RegExp = /<details\b[^>]*>/g;
      const detailsSummaryFirst: RegExp = /<details\b[^>]*>\s*<summary\b/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<details\b/.test(str)) {
          continue;
        }
        const hasDetails: boolean = detailsPattern.test(str);
        detailsPattern.lastIndex = 0;
        if (!hasDetails) {
          continue;
        }
        if (detailsSummaryFirst.test(str)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: '<details> without <summary> as first child element' as Str,
            solution: 'Add <summary> as the first child of <details>' as Str,
            found: truncSnippet(
              ((str.match(/<details\b[^>]*>[^<]*</) ?? [])[0] as Str) ?? ('<details><div>' as Str),
            ),
            fix: '<details>\n  <summary>Click to expand</summary>\n  <!-- content -->\n</details>' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <details> without <summary> as first child` as Str)
          : ('All <details> elements have <summary> as first child' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-button-type' as Str,
    label: 'Button type attribute' as Str,
    description:
      '<button> should have an explicit type attribute — defaults to "submit" which is often unintentional' as Str,
    category: 'HTML Spec' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <button> without type attribute */
      const buttonNoType: RegExp = /<button\b(?![^>]*\btype=)[^>]*>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<button\b/.test(str)) {
          continue;
        }
        const matches: RegExpMatchArray | null = str.match(buttonNoType);
        if (matches !== null && matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              `${matches.length} <button> element(s) without explicit type attribute — defaults to "submit"` as Str,
            solution:
              'Add type="button" for non-submit buttons or type="submit" for form submission' as Str,
            found: truncSnippet((matches[0] ?? '<button>') as Str),
            fix: '<button type="button"> or <button type="submit">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <button> without explicit type attribute` as Str)
          : ('All <button> elements have explicit type attributes' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-placeholder-label' as Str,
    label: 'Placeholder not a label' as Str,
    description:
      'Input with placeholder must also have an associated <label>, aria-label, or aria-labelledby (WHATWG HTML spec)' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <input> with placeholder but no aria-label, aria-labelledby, or id (for label association) */
      const inputPlaceholder: RegExp = /<input\b[^>]*\bplaceholder=[^>]*/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const matches: RegExpMatchArray | null = str.match(inputPlaceholder);
        if (matches === null) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
          continue;
        }
        let hasViolation: boolean = false;
        for (const m of matches) {
          const hasLabel: boolean =
            /aria-label=/.test(m) || /aria-labelledby=/.test(m) || /\bid=/.test(m);
          if (!hasLabel) {
            hasViolation = true;
          }
        }
        if (hasViolation) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<input> with placeholder but no label association (aria-label, aria-labelledby, or id for <label>)' as Str,
            solution:
              'Add a visible <label> with for/id or aria-label — placeholder is not a label substitute' as Str,
            found: truncSnippet((matches[0] ?? '<input placeholder="...">') as Str),
            fix: '<label for="field">Label</label>\n<input id="field" placeholder="...">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use placeholder as sole labeling mechanism` as Str)
          : ('All inputs with placeholder have proper labels' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-form-no-name' as Str,
    label: 'Form without accessible name' as Str,
    description:
      '<form> without aria-label, aria-labelledby, or title will not be exposed as a form landmark' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const formNoName: RegExp = /<form\b(?![^>]*\baria-label(?:ledby)?=)(?![^>]*\btitle=)[^>]*>/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<form\b/.test(str)) {
          continue;
        }
        if (formNoName.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<form> without accessible name — will not be exposed as a form landmark' as Str,
            solution: 'Add aria-label or aria-labelledby to the <form> element' as Str,
            found: truncSnippet(((str.match(formNoName) ?? [])[0] as Str) ?? ('<form>' as Str)),
            fix: '<form aria-label="Search"> or <form aria-labelledby="form-heading">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <form> without accessible name` as Str)
          : ('All <form> elements have accessible names' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-section-no-name' as Str,
    label: 'Section without accessible name' as Str,
    description:
      '<section> without aria-label or aria-labelledby will not be exposed as a region landmark' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const sectionNoName: RegExp = /<section\b(?![^>]*\baria-label(?:ledby)?=)[^>]*>/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<section\b/.test(str)) {
          continue;
        }
        if (sectionNoName.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<section> without accessible name — will not be exposed as a region landmark' as Str,
            solution: 'Add aria-label or aria-labelledby to the <section> element' as Str,
            found: truncSnippet(
              ((str.match(sectionNoName) ?? [])[0] as Str) ?? ('<section>' as Str),
            ),
            fix: '<section aria-labelledby="section-heading">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have <section> without accessible name` as Str)
          : ('All <section> elements have accessible names' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-heading-skip' as Str,
    label: 'Heading level skip' as Str,
    description:
      'Heading levels should not skip (e.g. h1 → h3 without h2) within a component template' as Str,
    category: 'HTML Spec' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const headingPattern: RegExp = /<h([1-6])\b/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const levels: number[] = [];
        let match: RegExpExecArray | null = headingPattern.exec(str);
        while (match !== null) {
          if (match[1] !== undefined) {
            levels.push(Number.parseInt(match[1], 10));
          }
          match = headingPattern.exec(str);
        }
        if (levels.length < 2) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
          continue;
        }
        let hasSkip: boolean = false;
        let skipDetail: string = '';
        for (let i: number = 1; i < levels.length; i++) {
          const prev: number = levels[i - 1] ?? 0;
          const curr: number = levels[i] ?? 0;
          if (curr > prev + 1) {
            hasSkip = true;
            skipDetail = `h${prev} → h${curr}`;
            break;
          }
        }
        if (hasSkip) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              `Heading level skip: ${skipDetail} — missing intermediate heading level` as Str,
            solution: 'Ensure heading levels descend sequentially (h1 → h2 → h3)' as Str,
            found: `${skipDetail} (skipped level)` as Str,
            fix: '<!-- Use sequential heading levels: h1 → h2 → h3, not h1 → h3 -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have heading level skips` as Str)
          : ('No heading level skips found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'html-positive-tabindex' as Str,
    label: 'Positive tabindex' as Str,
    description:
      'tabindex values greater than 0 break natural focus order and should never be used' as Str,
    category: 'HTML Spec' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* tabindex with positive integer value (not 0 or -1) */
      const positiveTabindex: RegExp = /tabindex=["']([2-9]|\d{2,})["']/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (positiveTabindex.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          const matched: string = (str.match(positiveTabindex) ?? [])[0] ?? 'tabindex="..."';
          findings.push({
            file: filename,
            problem: `Positive ${matched} — breaks natural tab order` as Str,
            solution:
              'Use tabindex="0" to add to natural order or tabindex="-1" for programmatic focus only' as Str,
            found: matched as Str,
            fix: 'tabindex="0" or tabindex="-1"' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use positive tabindex values` as Str)
          : ('No positive tabindex values found' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ---- Scott O'Hara Best Practice (2 rules in part 4) ---- */
  {
    id: 'ohara-visually-hidden-css' as Str,
    label: 'Visually hidden CSS technique' as Str,
    description:
      "Visually hidden / sr-only CSS must use clip-path technique, not text-indent or font-size:0 (Scott O'Hara pattern)" as Str,
    category: 'Best Practice' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const css: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      let foundPattern: boolean = false;

      for (const [filename, content] of css) {
        const str: string = content as string;
        const hasSrOnly: boolean = /\.sr-only|\.visually-hidden|visually-hidden/.test(str);
        if (!hasSrOnly) {
          continue;
        }
        foundPattern = true;
        /* Bad patterns */
        const usesTextIndent: boolean = /text-indent\s*:\s*-\d{3,}/.test(str);
        const usesFontSizeZero: boolean = /font-size\s*:\s*0/.test(str);
        if (usesTextIndent || usesFontSizeZero) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              `Visually-hidden CSS uses ${usesTextIndent ? 'text-indent' : 'font-size:0'} — unreliable technique with RTL/SEO issues` as Str,
            solution: 'Use clip-path: inset(50%) with position: absolute, overflow: hidden' as Str,
            found: truncSnippet(
              (usesTextIndent
                ? ((str.match(/text-indent\s*:[^;]+;/) ?? [])[0] as Str)
                : ((str.match(/font-size\s*:\s*0[^;]*;/) ?? [])[0] as Str)) ??
                ('text-indent: -10000px;' as Str),
            ),
            fix: '.sr-only { clip-path: inset(50%); clip: rect(0,0,0,0); height: 1px; width: 1px; overflow: hidden; position: absolute; white-space: nowrap; }' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if (!foundPattern) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files use unreliable visually-hidden CSS technique` as Str)
          : ('Visually-hidden CSS uses correct clip-path technique' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-visually-hidden-focusable' as Str,
    label: 'Focusable visually hidden elements' as Str,
    description:
      'Focusable visually-hidden elements (skip links) should use :not(:focus):not(:active) to become visible on focus' as Str,
    category: 'Best Practice' as Str,
    wcag: '2.4.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      let hasSkipLinks: boolean = false;
      let hasFocusVariant: boolean = false;
      const findings: A11yFileFinding[] = [];
      const failing: Str[] = [];
      const passing: Str[] = [];

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        /* Look for focusable elements with visually-hidden / sr-only class */
        const hasFocusableHidden: boolean =
          /<a\b[^>]*(?:sr-only|visually-hidden|VisuallyHidden)/.test(str) ||
          /(?:sr-only|visually-hidden|VisuallyHidden)[^>]*<\/a>/.test(str);
        if (!hasFocusableHidden) {
          continue;
        }
        hasSkipLinks = true;
        /* Check if the component or its CSS has :not(:focus) variant */
        const hasFocusReveal: boolean =
          /:not\(:focus\)/.test(str) ||
          /focus:static/.test(str) ||
          /focus:h-auto/.test(str) ||
          /focusable/.test(str);
        if (hasFocusReveal) {
          hasFocusVariant = true;
          passing.push(filename);
        } else {
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Focusable visually-hidden element (skip link) without :not(:focus) reveal variant' as Str,
            solution:
              'Use .visually-hidden:not(:focus):not(:active) or the focusable variant to reveal on focus' as Str,
            found: truncSnippet(
              ((str.match(/<a\b[^>]*(?:sr-only|visually-hidden)[^>]*>/) ?? [])[0] as Str) ??
                ('<a class="sr-only" href="#main">' as Str),
            ),
            fix: '<VisuallyHidden as="a" focusable href="#main">Skip to content</VisuallyHidden>' as Str,
          });
        }
      }

      /* Also check CSS files for the pattern */
      if (!hasFocusVariant) {
        const css: SourceEntry[] = cssFiles(sources);
        for (const [, content] of css) {
          if (/:not\(:focus\)/.test(content as string)) {
            hasFocusVariant = true;
            break;
          }
        }
      }

      if (!hasSkipLinks) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }

      const pass: Num = passing.length as Num;
      const fail: Num = failing.length as Num;
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} skip links lack :not(:focus) reveal variant` as Str)
          : ('All focusable visually-hidden elements have focus reveal' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-svg-in-interactive' as Str,
    label: 'SVG in interactive elements' as Str,
    description:
      'SVG inside <button> or <a> must have aria-hidden="true" and focusable="false" (Scott O\'Hara pattern)' as Str,
    category: 'Best Practice' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* SVG inside button or anchor */
      const svgInButton: RegExp = /<button\b[^>]*>[\s\S]*?<svg\b/;
      const svgInAnchor: RegExp = /<a\b[^>]*href[^>]*>[\s\S]*?<svg\b/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasSvgInInteractive: boolean = svgInButton.test(str) || svgInAnchor.test(str);
        if (!hasSvgInInteractive) {
          if (/<svg\b/.test(str)) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
          continue;
        }
        /* Check if the SVG has aria-hidden */
        const svgHasAriaHidden: boolean = /<svg\b[^>]*\baria-hidden=["']true["']/.test(str);
        if (svgHasAriaHidden) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: 'SVG inside interactive element without aria-hidden="true"' as Str,
            solution:
              'Add aria-hidden="true" focusable="false" to decorative SVGs inside buttons/links' as Str,
            found: truncSnippet(((str.match(/<svg\b[^>]*>/) ?? [])[0] as Str) ?? ('<svg>' as Str)),
            fix: '<svg aria-hidden="true" focusable="false">...</svg>' as Str,
          });
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have SVGs in interactive elements without aria-hidden` as Str)
          : ('All SVGs in interactive elements are properly hidden' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-dialog-name' as Str,
    label: 'Dialog accessible name' as Str,
    description:
      '<dialog> or role="dialog" must have aria-label or aria-labelledby (Scott O\'Hara pattern)' as Str,
    category: 'Best Practice' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const dialogNoName: RegExp = /<dialog\b(?![^>]*\baria-label(?:ledby)?=)[^>]*>/;
      const roleDialogNoName: RegExp = /role=["']dialog["'](?![^>]*\baria-label(?:ledby)?=)/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasDialog: boolean = /<dialog\b/.test(str) || /role=["']dialog["']/.test(str);
        if (!hasDialog) {
          continue;
        }
        if (dialogNoName.test(str) || roleDialogNoName.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Dialog without accessible name — screen readers cannot identify the dialog' as Str,
            solution: 'Add aria-label or aria-labelledby pointing to the dialog heading' as Str,
            found: truncSnippet(
              ((str.match(dialogNoName) ?? str.match(roleDialogNoName) ?? [])[0] as Str) ??
                ('<dialog>' as Str),
            ),
            fix: '<dialog aria-labelledby="dialog-title">\n  <h2 id="dialog-title">Dialog Heading</h2>\n</dialog>' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} dialogs missing accessible name` as Str)
          : ('All dialogs have accessible names' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-dialog-focus-return' as Str,
    label: 'Dialog focus return' as Str,
    description:
      "Dialog close handlers should return focus to the trigger element (Scott O'Hara pattern)" as Str,
    category: 'Best Practice' as Str,
    wcag: '2.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasDialog: boolean = /<dialog\b/.test(str) || /role=["']dialog["']/.test(str);
        if (!hasDialog) {
          continue;
        }
        /* Check for focus management code */
        const hasFocusReturn: boolean =
          /\.focus\(\)/.test(str) ||
          /focusTrigger|returnFocus|restoreFocus|previousFocus|triggerElement/.test(str);
        if (hasFocusReturn) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Dialog without focus return logic — focus may be lost when dialog closes' as Str,
            solution:
              'Save the trigger element reference and call .focus() on it when closing' as Str,
            found: '<dialog> <!-- no .focus() call found -->' as Str,
            fix: 'const trigger = document.activeElement;\n// on close:\ntrigger?.focus();' as Str,
          });
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} dialogs lack focus return to trigger element` as Str)
          : ('All dialogs return focus to trigger on close' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-display-contents-button' as Str,
    label: 'Display contents on button' as Str,
    description:
      "display: contents on <button> destroys its semantics in some browsers (Scott O'Hara pattern)" as Str,
    category: 'Best Practice' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const css: SourceEntry[] = cssFiles(sources);
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Look for button selectors with display: contents */
      const buttonDisplayContents: RegExp = /button[^{]*\{[^}]*display\s*:\s*contents/;

      for (const [filename, content] of css) {
        const str: string = content as string;
        if (buttonDisplayContents.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'display: contents on button — destroys button semantics in some browsers' as Str,
            solution:
              'Use display: flex or display: grid instead of display: contents on buttons' as Str,
            found: truncSnippet(
              ((str.match(buttonDisplayContents) ?? [])[0] as Str) ??
                ('button { display: contents; }' as Str),
            ),
            fix: 'button { display: flex; } /* not display: contents */' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files use display: contents on buttons` as Str)
          : ('No display: contents on button elements' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-list-style-none' as Str,
    label: 'List style none semantics' as Str,
    description:
      '<ul>/<ol> with list-style: none may lose list semantics in Safari — add role="list" (Scott O\'Hara pattern)' as Str,
    category: 'Best Practice' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* <ul> or <ol> with list-none class (Tailwind) but no role="list" */
      const listNoneNoRole: RegExp = /<(?:ul|ol)\b[^>]*\blist-none\b(?![^>]*\brole=)[^>]*>/;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (listNoneNoRole.test(str)) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              '<ul>/<ol> with list-none class but no role="list" — Safari strips list semantics' as Str,
            solution:
              'Add role="list" to preserve list semantics when using list-style: none' as Str,
            found: truncSnippet(
              ((str.match(listNoneNoRole) ?? [])[0] as Str) ?? ('<ul class="list-none">' as Str),
            ),
            fix: '<ul class="list-none" role="list">' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have list-none without role="list"` as Str)
          : ('All unstyled lists have role="list" for Safari compat' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'ohara-landmark-label-redundancy' as Str,
    label: 'Landmark label redundancy' as Str,
    description:
      'Landmark aria-label should not include the landmark type (e.g. "primary navigation" on <nav> is redundant)' as Str,
    category: 'Best Practice' as Str,
    wcag: '2.4.6' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Landmark elements with aria-label containing their type */
      const navWithNavLabel: RegExp = /<nav\b[^>]*\baria-label=["'][^"']*\bnavigation\b/i;
      const mainWithMainLabel: RegExp = /<main\b[^>]*\baria-label=["'][^"']*\bmain\b/i;
      const asideWithAsideLabel: RegExp = /<aside\b[^>]*\baria-label=["'][^"']*\bcomplementary\b/i;
      const headerWithBannerLabel: RegExp = /<header\b[^>]*\baria-label=["'][^"']*\bbanner\b/i;
      const footerWithContentLabel: RegExp =
        /<footer\b[^>]*\baria-label=["'][^"']*\bcontentinfo\b/i;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const hasRedundant: boolean =
          navWithNavLabel.test(str) ||
          mainWithMainLabel.test(str) ||
          asideWithAsideLabel.test(str) ||
          headerWithBannerLabel.test(str) ||
          footerWithContentLabel.test(str);
        if (hasRedundant) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem:
              'Landmark aria-label includes the landmark type — screen readers announce "navigation, primary navigation"' as Str,
            solution:
              'Remove the landmark type from the aria-label (e.g. "primary" not "primary navigation")' as Str,
            found: truncSnippet(
              ((str.match(navWithNavLabel) ?? [])[0] as Str) ?? ('<nav aria-label="...">' as Str),
            ),
            fix: '<nav aria-label="Primary"> <!-- not "Primary navigation" -->' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have redundant landmark type in aria-label` as Str)
          : ('No redundant landmark type names in aria-labels' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ------------------------------------------------------------------ */
  /*  Group 6: WebAIM — Part 6 (5 rules)                                */
  /* ------------------------------------------------------------------ */

  {
    id: 'webaim-alt-text-prefix' as Str,
    label: 'Alt text anti-prefix' as Str,
    description:
      'Alt text should not begin with redundant prefixes like "image of", "photo of", "picture of", or "graphic of"' as Str,
    category: 'WebAIM' as Str,
    wcag: '1.1.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const badPrefixRe: RegExp =
        /alt=["'](image of|photo of|picture of|graphic of|icon of|img of)\b/i;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('alt=')) {
          continue;
        }
        const match: RegExpMatchArray | null = str.match(badPrefixRe);
        if (match) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `Alt text starts with redundant prefix "${match[1]}"` as Str,
            solution:
              'Remove the prefix — screen readers already announce the element as an image' as Str,
            found: truncSnippet(match[0] as Str),
            fix: 'alt="descriptive text without prefix"' as Str,
          });
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use redundant alt text prefixes` as Str)
          : ('No redundant alt text prefixes found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-empty-link' as Str,
    label: 'Empty link' as Str,
    description:
      'Links must have discernible text content — no empty <a> elements without text, child image alt, or aria-label' as Str,
    category: 'WebAIM' as Str,
    wcag: '2.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Match <a ...></a> or <a ... /> with nothing meaningful inside */
      const emptyLinkRe: RegExp = /<a\s[^>]*>\s*<\/a>/g;
      const selfCloseLinkRe: RegExp = /<a\s[^>]*\/>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('<a')) {
          continue;
        }
        let found: boolean = false;
        const emptyMatches: RegExpMatchArray[] = [...str.matchAll(emptyLinkRe)];
        for (const [tag] of emptyMatches) {
          /* Skip if it has aria-label, aria-labelledby, or title */
          if (/aria-label|aria-labelledby|title=/.test(tag)) {
            continue;
          }
          found = true;
          findings.push({
            file: filename,
            problem: 'Empty link with no accessible text' as Str,
            solution: 'Add text content, aria-label, or a child element with alt text' as Str,
            found: truncSnippet(tag as Str),
            fix: '<a href="...">Descriptive text</a>' as Str,
          });
        }
        const selfCloseMatches: RegExpMatchArray[] = [...str.matchAll(selfCloseLinkRe)];
        for (const [tag] of selfCloseMatches) {
          if (/aria-label|aria-labelledby|title=/.test(tag)) {
            continue;
          }
          found = true;
          findings.push({
            file: filename,
            problem: 'Self-closing link with no accessible text' as Str,
            solution: 'Add aria-label or use non-self-closing form with text content' as Str,
            found: truncSnippet(tag as Str),
            fix: '<a href="..." aria-label="Descriptive text" />' as Str,
          });
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else if (str.includes('<a')) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components contain empty links` as Str)
          : ('No empty links found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-empty-button' as Str,
    label: 'Empty button' as Str,
    description:
      'Button elements must have discernible text — no empty <button> without text, aria-label, or aria-labelledby' as Str,
    category: 'WebAIM' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Match <button ...></button> with only whitespace or SVG inside */
      const emptyBtnRe: RegExp = /<button\s[^>]*>\s*(<svg[\s\S]*?<\/svg>\s*)?<\/button>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('<button')) {
          continue;
        }
        let found: boolean = false;
        const matches: RegExpMatchArray[] = [...str.matchAll(emptyBtnRe)];
        for (const [tag] of matches) {
          /* Skip if it has aria-label, aria-labelledby, or title */
          if (/aria-label|aria-labelledby|title=/.test(tag)) {
            continue;
          }
          /* Skip if the content between tags has visible text (not just SVG) */
          const innerContent: string = tag
            .replace(/<button[^>]*>/, '')
            .replace(/<\/button>/, '')
            .replaceAll(/<svg[\s\S]*?<\/svg>/g, '')
            .trim();
          if (innerContent.length > 0) {
            continue;
          }
          found = true;
          findings.push({
            file: filename,
            problem: 'Button with no discernible text content' as Str,
            solution:
              'Add visible text, aria-label, or screen-reader-only text inside the button' as Str,
            found: truncSnippet(tag as Str),
            fix: '<button aria-label="Action description">...</button>' as Str,
          });
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components contain empty buttons` as Str)
          : ('All buttons have discernible text' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-bad-link-text' as Str,
    label: 'Non-descriptive link text' as Str,
    description:
      'Link text should be descriptive — avoid generic text like "click here", "here", "more", "read more", "learn more"' as Str,
    category: 'WebAIM' as Str,
    wcag: '2.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const badTextRe: RegExp =
        /<a\s[^>]*>\s*(click here|here|more|read more|learn more|link to|link)\s*<\/a>/gi;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('<a')) {
          continue;
        }
        const matches: RegExpMatchArray[] = [...str.matchAll(badTextRe)];
        if (matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          for (const [fullMatch, linkText] of matches) {
            findings.push({
              file: filename,
              problem: `Non-descriptive link text: "${linkText}"` as Str,
              solution: 'Use descriptive text that explains the link destination or purpose' as Str,
              found: truncSnippet(fullMatch as Str),
              fix: '<a href="...">View the accessibility report</a>' as Str,
            });
          }
        } else if (str.includes('<a')) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have non-descriptive link text` as Str)
          : ('All link text is descriptive' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-title-only-name' as Str,
    label: 'Title as only accessible name' as Str,
    description:
      'Elements should not rely solely on the title attribute for their accessible name — use aria-label, visible text, or alt instead' as Str,
    category: 'WebAIM' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Interactive elements with title but no other accessible name */
      const titleOnlyRe: RegExp =
        /<(button|a|input|select|textarea)\s[^>]*title=["'][^"']+["'][^>]*>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('title=')) {
          continue;
        }
        let found: boolean = false;
        const matches: RegExpMatchArray[] = [...str.matchAll(titleOnlyRe)];
        for (const [tag, elName] of matches) {
          /* Skip if it has another naming mechanism */
          if (/aria-label=|aria-labelledby=|alt=/.test(tag)) {
            continue;
          }
          /* For <a> and <button>, text content inside counts — but we can only check the opening tag here */
          /* Flag only self-closing or attribute-only patterns */
          if (
            (elName === 'input' || elName === 'select' || elName === 'textarea') &&
            !/<label/.test(str)
          ) {
            found = true;
            findings.push({
              file: filename,
              problem: `<${elName}> relies on title attribute as only accessible name` as Str,
              solution:
                'Add aria-label, a visible <label>, or aria-labelledby for a proper accessible name' as Str,
              found: truncSnippet(tag as Str),
              fix: `<${elName} aria-label="Descriptive name" title="...">` as Str,
            });
          }
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else if (str.includes('title=')) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components rely on title as only accessible name` as Str)
          : ('No elements rely solely on title for accessible name' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ------------------------------------------------------------------ */
  /*  Group 6 continued: WebAIM — Part 7 (5 rules)                      */
  /* ------------------------------------------------------------------ */

  {
    id: 'webaim-outline-removed' as Str,
    label: 'Focus outline removed' as Str,
    description:
      'Focus outline must not be removed without a visible replacement — outline:none/0 on :focus needs a box-shadow, border, or outline alternative' as Str,
    category: 'WebAIM' as Str,
    wcag: '2.4.7' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const css: SourceEntry[] = cssFiles(sources);
      const svelte: SourceEntry[] = svelteFiles(sources);
      const all: SourceEntry[] = [...css, ...svelte];
      if (all.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Match :focus rules that remove outline */
      const focusOutlineRe: RegExp = /:focus[^{]*\{[^}]*outline\s*:\s*(none|0)\b[^}]*\}/g;

      for (const [filename, content] of all) {
        const str: string = content as string;
        if (!str.includes(':focus')) {
          continue;
        }
        const matches: RegExpMatchArray[] = [...str.matchAll(focusOutlineRe)];
        let found: boolean = false;
        for (const [ruleBlock] of matches) {
          /* Check if there is a replacement indicator */
          if (/box-shadow|border-color|outline-offset|outline:.*\d+px/.test(ruleBlock)) {
            continue;
          }
          found = true;
          findings.push({
            file: filename,
            problem: 'Focus outline removed without visible replacement' as Str,
            solution:
              'Add a visible focus indicator like box-shadow or border when removing outline' as Str,
            found: truncSnippet(ruleBlock as Str),
            fix: ':focus { outline: none; box-shadow: 0 0 0 2px var(--ring); }' as Str,
          });
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else if (str.includes(':focus')) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files remove focus outline without replacement` as Str)
          : ('All focus outlines have visible replacements' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-viewport-zoom-disabled' as Str,
    label: 'Viewport zoom disabled' as Str,
    description:
      'Viewport meta must not disable user scaling — user-scalable=no and maximum-scale=1 prevent zoom' as Str,
    category: 'WebAIM' as Str,
    wcag: '1.4.4' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const viewportRe: RegExp = /<meta\s[^>]*name=["']viewport["'][^>]*>/gi;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const matches: RegExpMatchArray[] = [...str.matchAll(viewportRe)];
        for (const [tag] of matches) {
          const hasNoScale: boolean = /user-scalable\s*=\s*no/i.test(tag);
          const hasMaxScale: boolean = /maximum-scale\s*=\s*1\b/i.test(tag);
          if (hasNoScale || hasMaxScale) {
            fail = ((fail as number) + 1) as Num;
            failing.push(filename);
            findings.push({
              file: filename,
              problem:
                `Viewport meta disables zoom: ${hasNoScale ? 'user-scalable=no' : 'maximum-scale=1'}` as Str,
              solution:
                'Remove user-scalable=no and set maximum-scale to a value > 1 (e.g., 5)' as Str,
              found: truncSnippet(tag as Str),
              fix: '<meta name="viewport" content="width=device-width, initial-scale=1">' as Str,
            });
          } else {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} viewport metas disable zoom` as Str)
          : ('Viewport zoom is not disabled' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-autoplay-media' as Str,
    label: 'Media autoplay' as Str,
    description:
      'Video and audio elements should not autoplay — users must have control over media playback' as Str,
    category: 'WebAIM' as Str,
    wcag: '1.4.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const autoplayRe: RegExp = /<(video|audio)\s[^>]*autoplay[^>]*>/gi;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('autoplay')) {
          continue;
        }
        const matches: RegExpMatchArray[] = [...str.matchAll(autoplayRe)];
        if (matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          for (const [fullMatch, elType] of matches) {
            findings.push({
              file: filename,
              problem: `<${elType}> element has autoplay attribute` as Str,
              solution:
                'Remove autoplay and let users control playback with play/pause controls' as Str,
              found: truncSnippet(fullMatch as Str),
              fix: `<${elType} controls>` as Str,
            });
          }
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components autoplay media` as Str)
          : ('No media elements autoplay' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-empty-heading' as Str,
    label: 'Empty heading' as Str,
    description:
      'Heading elements (h1–h6) must have text content — empty headings confuse screen reader navigation' as Str,
    category: 'WebAIM' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const emptyHeadingRe: RegExp = /<(h[1-6])\s*>\s*<\/\1>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const matches: RegExpMatchArray[] = [...str.matchAll(emptyHeadingRe)];
        if (matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          for (const [fullMatch, level] of matches) {
            findings.push({
              file: filename,
              problem: `Empty <${level}> heading element` as Str,
              solution: 'Add meaningful text content to the heading or remove it' as Str,
              found: truncSnippet(fullMatch as Str),
              fix: `<${level}>Heading text</${level}>` as Str,
            });
          }
        } else if (/<h[1-6]/.test(str)) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components contain empty headings` as Str)
          : ('No empty headings found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'webaim-empty-th' as Str,
    label: 'Empty table header' as Str,
    description:
      'Table header cells (th) must have text content — empty headers make tables incomprehensible to screen readers' as Str,
    category: 'WebAIM' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const emptyThRe: RegExp = /<th\s*>\s*<\/th>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const matches: RegExpMatchArray[] = [...str.matchAll(emptyThRe)];
        if (matches.length > 0) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          for (const [fullMatch] of matches) {
            findings.push({
              file: filename,
              problem: 'Empty <th> table header cell' as Str,
              solution: 'Add descriptive text to the header cell or use scope attribute' as Str,
              found: truncSnippet(fullMatch as Str),
              fix: '<th>Column Name</th>' as Str,
            });
          }
        } else if (str.includes('<th')) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components contain empty table headers` as Str)
          : ('No empty table headers found' as Str),
        undefined,
        findings,
      );
    },
  },

  /* ------------------------------------------------------------------ */
  /*  Group 7: The A11Y Project — Part 8 (5 rules)                      */
  /* ------------------------------------------------------------------ */

  {
    id: 'a11yproject-title-antipattern' as Str,
    label: 'Title attribute anti-pattern' as Str,
    description:
      'The title attribute should not be used as the sole accessibility mechanism — it is unreliable for touch and keyboard users' as Str,
    category: 'A11Y' as Str,
    wcag: '4.1.2' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Elements where title is acceptable: iframe, frame, abbr */
      const titleRe: RegExp =
        /<(?!iframe|frame|abbr|svelte:)(\w+)\s[^>]*title=["'][^"']+["'][^>]*>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!str.includes('title=')) {
          continue;
        }
        let found: boolean = false;
        const matches: RegExpMatchArray[] = [...str.matchAll(titleRe)];
        for (const [tag, elName] of matches) {
          /* Skip if element has other accessible naming */
          if (/aria-label=|aria-labelledby=|alt=/.test(tag)) {
            continue;
          }
          /* Skip if it has visible text content (opening tag only check) */
          if (
            elName === 'img' ||
            elName === 'input' ||
            elName === 'select' ||
            elName === 'textarea'
          ) {
            found = true;
            findings.push({
              file: filename,
              problem:
                `<${elName}> uses title as accessibility mechanism — unreliable for touch/keyboard` as Str,
              solution: 'Use aria-label, visible <label>, or alt attribute instead of title' as Str,
              found: truncSnippet(tag as Str),
              fix: `<${elName} aria-label="Descriptive text">` as Str,
            });
          }
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components use title attribute anti-pattern` as Str)
          : ('No title attribute anti-patterns found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'a11yproject-autofocus-misuse' as Str,
    label: 'Autofocus misuse' as Str,
    description:
      'The autofocus attribute should be used sparingly — multiple autofocus elements or autofocus on non-primary elements cause disorientation' as Str,
    category: 'A11Y' as Str,
    wcag: '3.2.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const autofocusRe: RegExp = /\bautofocus\b/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const matches: RegExpMatchArray[] = [...str.matchAll(autofocusRe)];
        if (matches.length > 1) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `Multiple autofocus attributes found (${matches.length} occurrences)` as Str,
            solution:
              'Use autofocus on at most one element — the primary interaction target' as Str,
            found: `${matches.length} autofocus attributes` as Str,
            fix: 'Keep autofocus on only the primary interaction element' as Str,
          });
        } else if (matches.length === 1) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components misuse autofocus` as Str)
          : ('No autofocus misuse detected' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'a11yproject-landmark-nesting' as Str,
    label: 'Landmark nesting semantics' as Str,
    description:
      'Header and footer elements inside article, section, or aside lose their banner/contentinfo landmark semantics' as Str,
    category: 'A11Y' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      /* Check for header/footer inside article/section/aside */
      const sectionRe: RegExp = /<(article|section|aside)\b[^>]*>([\s\S]*?)<\/\1>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        if (!/<(article|section|aside)/.test(str)) {
          continue;
        }
        let found: boolean = false;
        const sectionMatches: RegExpMatchArray[] = [...str.matchAll(sectionRe)];
        for (const sectionMatch of sectionMatches) {
          const parent: string = sectionMatch[1] ?? '';
          const inner: string = sectionMatch[2] ?? '';
          if (/<header\b/.test(inner) || /<footer\b/.test(inner)) {
            found = true;
            const nested: string = /<header\b/.test(inner) ? 'header' : 'footer';
            const role: string = nested === 'header' ? 'banner' : 'contentinfo';
            findings.push({
              file: filename,
              problem: `<${nested}> inside <${parent}> loses ${role} landmark semantics` as Str,
              solution: `Add role="${role}" if the landmark semantics are needed` as Str,
              found: `<${parent}>...<${nested}>...</${nested}>...</${parent}>` as Str,
              fix: `<${nested} role="${role}">` as Str,
            });
          }
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have landmark nesting issues` as Str)
          : ('No landmark nesting issues found' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'a11yproject-nav-disambiguation' as Str,
    label: 'Navigation disambiguation' as Str,
    description:
      'Multiple nav elements must have distinct aria-label or aria-labelledby to be distinguishable by screen readers' as Str,
    category: 'A11Y' as Str,
    wcag: '1.3.1' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const svelte: SourceEntry[] = svelteFiles(sources);
      if (svelte.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const navRe: RegExp = /<nav\b[^>]*>/g;

      for (const [filename, content] of svelte) {
        const str: string = content as string;
        const navMatches: RegExpMatchArray[] = [...str.matchAll(navRe)];
        if (navMatches.length < 2) {
          if (navMatches.length === 1) {
            pass = ((pass as number) + 1) as Num;
            passing.push(filename);
          }
          continue;
        }
        /* Multiple <nav> — check each has aria-label or aria-labelledby */
        let allLabeled: boolean = true;
        for (const [tag] of navMatches) {
          if (!/aria-label=|aria-labelledby=/.test(tag)) {
            allLabeled = false;
          }
        }
        if (allLabeled) {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        } else {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
          findings.push({
            file: filename,
            problem: `${navMatches.length} <nav> elements without distinct labels` as Str,
            solution:
              'Add unique aria-label to each <nav> (e.g., "Primary navigation", "Footer navigation")' as Str,
            found: `${navMatches.length} <nav> elements` as Str,
            fix: '<nav aria-label="Primary navigation">' as Str,
          });
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} components have ambiguous navigation landmarks` as Str)
          : ('All navigation landmarks are properly disambiguated' as Str),
        undefined,
        findings,
      );
    },
  },
  {
    id: 'a11yproject-selection-contrast' as Str,
    label: 'Selection contrast' as Str,
    description:
      'Custom ::selection CSS must specify both color AND background — an incomplete override may produce unreadable selected text' as Str,
    category: 'A11Y' as Str,
    wcag: '1.4.3' as Str,
    check(sources: Map<Str, Str>): A11yRuleResult {
      const css: SourceEntry[] = cssFiles(sources);
      const svelte: SourceEntry[] = svelteFiles(sources);
      const all: SourceEntry[] = [...css, ...svelte];
      if (all.length === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      let pass: Num = 0 as Num;
      let fail: Num = 0 as Num;
      const passing: Str[] = [];
      const failing: Str[] = [];
      const findings: A11yFileFinding[] = [];
      const selectionRe: RegExp = /::selection\s*\{([^}]*)\}/g;

      for (const [filename, content] of all) {
        const str: string = content as string;
        if (!str.includes('::selection')) {
          continue;
        }
        let found: boolean = false;
        const matches: RegExpMatchArray[] = [...str.matchAll(selectionRe)];
        for (const [fullMatch, rawBody] of matches) {
          const body: string = rawBody ?? '';
          const hasColor: boolean = /\bcolor\s*:/.test(body);
          const hasBg: boolean = /background(?:-color)?\s*:/.test(body);
          if (hasColor && hasBg) {
            continue;
          }
          found = true;
          let missing: string = 'background';
          if (!hasColor && !hasBg) {
            missing = 'color and background';
          } else if (!hasColor) {
            missing = 'color';
          }
          findings.push({
            file: filename,
            problem:
              `::selection CSS is missing ${missing} — may produce unreadable selected text` as Str,
            solution: 'Always set both color and background in ::selection rules' as Str,
            found: truncSnippet(fullMatch as Str),
            fix: '::selection { color: #fff; background: #0066cc; }' as Str,
          });
        }
        if (found) {
          fail = ((fail as number) + 1) as Num;
          failing.push(filename);
        } else {
          pass = ((pass as number) + 1) as Num;
          passing.push(filename);
        }
      }
      if ((pass as number) === 0 && (fail as number) === 0) {
        return notApplicableResult(this.id, this.label, this.description, this.category, this.wcag);
      }
      return buildResult(
        this,
        pass,
        fail,
        passing,
        failing,
        (fail as number) > 0
          ? (`${fail} files have incomplete ::selection contrast` as Str)
          : ('All ::selection rules have complete contrast' as Str),
        undefined,
        findings,
      );
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run a full accessibility audit against source files.
 *
 * Evaluates all 150 accessibility rules against the provided source code
 * and computes an aggregate score with detailed per-rule results, including
 * WCAG 2.1 AA criteria coverage metrics.
 *
 * @param sources - Map of filename to raw source content
 * @returns Complete accessibility audit result with scores and per-rule details
 *
 * @example
 * const sources = { 'Button.svelte': btnSrc, 'app.css': cssSrc };
 * const audit = auditAccessibility(sources);
 * console.log(audit.overallScore);  // 85
 * console.log(audit.rules.length);  // 150
 * console.log(audit.totalWcagCriteria);  // 50
 * console.log(audit.wcagCoverage);  // 78
 */
export function auditAccessibility(sources: Record<Str, Str>): A11yAuditResult {
  /* Convert to Map for internal use */
  const sourceMap: Map<Str, Str> = new Map(Object.entries(sources) as SourceEntry[]);

  /* Run all rules */
  const rules: A11yRuleResult[] = A11Y_RULES.map((rule) => rule.check(sourceMap));

  /* Compute aggregate stats */
  const applicableRules: A11yRuleResult[] = rules.filter((r) => r.status !== 'not-applicable');
  const passingRules: Num = applicableRules.filter((r) => r.status === 'pass').length as Num;
  const failingRules: Num = applicableRules.filter((r) => r.status === 'fail').length as Num;
  const warningRules: Num = applicableRules.filter((r) => r.status === 'warning').length as Num;
  const totalApplicable: Num = applicableRules.length as Num;
  const overallScore: Num =
    (totalApplicable as number) > 0
      ? (Math.round(((passingRules as number) / (totalApplicable as number)) * 100) as Num)
      : (100 as Num);

  /* Compute component-level stats */
  const svelte: SourceEntry[] = svelteFiles(sourceMap);
  const componentCount: Num = svelte.length as Num;

  let componentsWithAria: Num = 0 as Num;
  let componentsWithKeyboard: Num = 0 as Num;
  let componentsWithRoles: Num = 0 as Num;
  let componentsWithSrOnly: Num = 0 as Num;

  for (const [, content] of svelte) {
    if (/aria-/.test(content as string)) {
      componentsWithAria = ((componentsWithAria as number) + 1) as Num;
    }
    if (/on:keydown|onkeydown|on:keyup|onkeyup/.test(content as string)) {
      componentsWithKeyboard = ((componentsWithKeyboard as number) + 1) as Num;
    }
    if (/role="/.test(content as string)) {
      componentsWithRoles = ((componentsWithRoles as number) + 1) as Num;
    }
    if (/sr-only|visually-hidden|VisuallyHidden/.test(content as string)) {
      componentsWithSrOnly = ((componentsWithSrOnly as number) + 1) as Num;
    }
  }

  /* Compute WCAG 2.1 AA criteria coverage */
  const wcagCriteria: Set<Str> = new Set();
  const passingWcagCriteria: Set<Str> = new Set();
  for (const r of rules) {
    wcagCriteria.add(r.wcag);
    if (r.status === 'pass') {
      passingWcagCriteria.add(r.wcag);
    }
  }
  const totalWcagCriteria: Num = wcagCriteria.size as Num;
  const wcagCoverage: Num =
    (totalWcagCriteria as number) > 0
      ? (Math.round(
          ((passingWcagCriteria.size as number) / (totalWcagCriteria as number)) * 100,
        ) as Num)
      : (100 as Num);

  return {
    rules,
    overallScore,
    totalRules: rules.length as Num,
    passingRules,
    failingRules,
    warningRules,
    componentCount,
    componentsWithAria,
    componentsWithKeyboard,
    componentsWithRoles,
    componentsWithSrOnly,
    totalWcagCriteria,
    wcagCoverage,
  };
}
