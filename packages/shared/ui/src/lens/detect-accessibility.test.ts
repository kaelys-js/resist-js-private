/**
 * Accessibility audit regression tests for shared UI components.
 *
 * Runs `auditAccessibility` against ALL component source files (same as the Lens UI)
 * and snapshots which rules fail per component. This ensures:
 * - Regressions are caught when a previously-passing component starts failing
 * - Fixes are tracked when a previously-failing component starts passing
 * - The overall audit score doesn't drop below a baseline
 *
 * When a component's a11y is FIXED, update the snapshot in this file to reflect
 * the improvement. When a component REGRESSES, the test fails — investigate and fix.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  auditAccessibility,
  type A11yAuditResult,
  type A11yRuleResult,
} from './detect-accessibility.js';

/* ------------------------------------------------------------------ */
/*  File discovery — same pattern as lint-lens.test.ts                 */
/* ------------------------------------------------------------------ */

const LENS_DIR: string = dirname(fileURLToPath(import.meta.url));
const UI_SRC: string = join(LENS_DIR, '..');

/** Lens-internal infrastructure dirs — excluded from all scans. */
const INTERNAL_DIRS: ReadonlySet<string> = new Set(['hooks', 'lens', 'lens-card-settings-menu']);

/** All .svelte component files in the shared UI library (excludes examples/). */
const svelteFiles: string[] = readdirSync(UI_SRC, { recursive: true })
  .filter(
    (f): f is string =>
      typeof f === 'string' &&
      f.endsWith('.svelte') &&
      !f.includes('examples/') &&
      ![...INTERNAL_DIRS].some((d: string): boolean => f.startsWith(`${d}/`)),
  )
  .map((f: string): string => join(UI_SRC, f));

/** All .css files in the shared UI library. */
const cssFiles: string[] = readdirSync(UI_SRC, { recursive: true })
  .filter(
    (f): f is string =>
      typeof f === 'string' &&
      f.endsWith('.css') &&
      ![...INTERNAL_DIRS].some((d: string): boolean => f.startsWith(`${d}/`)),
  )
  .map((f: string): string => join(UI_SRC, f));

/** All .ts files in the shared UI library (for type/schema scanning). */
const tsFiles: string[] = readdirSync(UI_SRC, { recursive: true })
  .filter(
    (f): f is string =>
      typeof f === 'string' &&
      f.endsWith('.ts') &&
      !f.endsWith('.test.ts') &&
      !f.endsWith('.d.ts') &&
      ![...INTERNAL_DIRS].some((d: string): boolean => f.startsWith(`${d}/`)),
  )
  .map((f: string): string => join(UI_SRC, f));

/**
 * Build sources record matching how the Lens UI calls auditAccessibility.
 * Keys are workspace-relative paths, values are file contents.
 *
 * @returns Record of path → content for all scannable source files
 */
function buildSources(): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const file of [...svelteFiles, ...cssFiles, ...tsFiles]) {
    const relPath: string = relative(UI_SRC, file);
    sources[relPath] = readFileSync(file, 'utf8');
  }
  return sources;
}

/**
 * Short component name from a file path (e.g. 'avatar/avatar.svelte' → 'avatar').
 *
 * @param filePath - Relative path from UI_SRC
 * @returns Component directory name
 */
function componentName(filePath: string): string {
  const parts: string[] = filePath.split('/');
  return parts[0] ?? filePath;
}

/* ------------------------------------------------------------------ */
/*  Run the audit once for all tests                                   */
/* ------------------------------------------------------------------ */

const sources: Record<string, string> = buildSources();
const audit: A11yAuditResult = auditAccessibility(sources);

/** All failing rules from the audit. */
const failingRules: A11yRuleResult[] = audit.rules.filter(
  (r: A11yRuleResult): boolean => r.status === 'fail',
);

/**
 * Get failing rules for a specific component by checking failingFiles.
 *
 * @param name - Component directory name (e.g. 'avatar', 'kbd')
 * @returns Array of failing A11yRuleResult for this component
 */
function failingRulesForComponent(name: string): A11yRuleResult[] {
  return failingRules.filter((r: A11yRuleResult): boolean =>
    r.failingFiles.some((f: string): boolean => f.includes(`/${name}/`) || f.includes(`/${name}.`)),
  );
}

/* ------------------------------------------------------------------ */
/*  Unique component directories that have .svelte files               */
/* ------------------------------------------------------------------ */

const componentDirs: string[] = [
  ...new Set(svelteFiles.map((f: string): string => componentName(relative(UI_SRC, f)))),
].toSorted();

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('auditAccessibility — global', () => {
  it('runs all 140 rules', () => {
    expect(audit.totalRules).toBe(140);
  });

  it('scans at least one component', () => {
    expect(audit.componentCount).toBeGreaterThan(0);
  });

  it('overall score is a valid percentage', () => {
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
  });

  it('overall score matches snapshot baseline', () => {
    expect(audit.overallScore).toMatchSnapshot();
  });

  it('failing rule count matches snapshot', () => {
    expect(audit.failingRules).toMatchSnapshot();
  });

  it('passing rule count matches snapshot', () => {
    expect(audit.passingRules).toMatchSnapshot();
  });

  it('failing rule IDs match snapshot', () => {
    const failingIds: string[] = failingRules.map((r: A11yRuleResult): string => r.id).toSorted();
    expect(failingIds).toMatchSnapshot();
  });
});

describe('auditAccessibility — per-component regressions', () => {
  /**
   * Build a map of component → sorted failing rule IDs.
   * Only components with at least one failure are included.
   */
  const componentFailures: Map<string, string[]> = new Map();
  for (const dir of componentDirs) {
    const failures: A11yRuleResult[] = failingRulesForComponent(dir);
    if (failures.length > 0) {
      componentFailures.set(dir, failures.map((r: A11yRuleResult): string => r.id).toSorted());
    }
  }

  it('component failure map matches snapshot', () => {
    const snapshot: Record<string, string[]> = Object.fromEntries(componentFailures);
    expect(snapshot).toMatchSnapshot();
  });

  it('components with zero a11y failures stay clean', () => {
    const cleanComponents: string[] = componentDirs.filter(
      (dir: string): boolean => !componentFailures.has(dir),
    );
    expect(cleanComponents.length).toMatchSnapshot();
  });
});
