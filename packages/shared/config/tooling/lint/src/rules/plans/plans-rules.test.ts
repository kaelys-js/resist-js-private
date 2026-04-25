import { describe, expect, it } from 'vitest';

import type { WorkspaceContext } from '../../framework/rule-context.ts';
import type { LintResult } from '../../framework/types.ts';
import { discoverPlanFiles, parsePlan, parsePlanDate } from './plan-parser.ts';
import noTemplatePlaceholders from './no-template-placeholders.ts';
import noIncompleteTasks from './no-incomplete-tasks.ts';
import statusDependencyOrder from './status-dependency-order.ts';
import filesExist from './files-exist.ts';
import requireConcreteVerification from './require-concrete-verification.ts';
import noEmptyPlanSections from './no-empty-plan-sections.ts';
import requireTestFiles from './require-test-files.ts';
import requirePlanStructure from './require-plan-structure.ts';

// =============================================================================
// Test Helpers
// =============================================================================

/** Build a mock WorkspaceContext from a file map. */
function createMockContext(
  files: Record<string, string>,
  ruleOptions?: Record<string, unknown>,
): WorkspaceContext & { ruleOptions?: Record<string, unknown> } {
  const filePaths: string[] = Object.keys(files);
  return {
    rootDir: '/mock',
    allFiles: async (): Promise<readonly string[]> => filePaths,
    filesByExtension: async (...exts: string[]): Promise<readonly string[]> =>
      filePaths.filter((f: string): boolean => exts.some((e: string): boolean => f.endsWith(e))),
    readFile: async (path: string): Promise<string> => files[path] ?? '',
    fileExists: async (path: string): Promise<boolean> => path in files,
    dirExists: async (): Promise<boolean> => false,
    getWorkspacePackages: async () => [],
    ruleOptions,
  };
}

/** Minimal valid plan content for tests that need a clean base. */
const VALID_PLAN: string = `# Linter Phase 99 — Test Plan

**Date**: 2026-04-01
**Package**: \`@/lint\` (\`packages/shared/config/tooling/lint/src/\`)
**Goal**: Add a workspace rule that detects stale plan tasks.
**Architecture**: WorkspaceRule scanning docs/plans/*.md files.

Each task is atomic: implement -> verify (QA + tests) -> update plan -> next.

---

## Status Legend

- \`[ ]\` — Not started
- \`[x]\` — Done (implemented + verified + tests passing)
- \`[~]\` — In progress

---

## Baseline (before any changes)

| Metric | Value |
|--------|-------|
| Tests | 4994 total (4994 pass) |
| Type-check | Passes |

---

## TASK 1 — Create stale-plan-detector rule

**Status**: [x]

**Gap**: No lint rule detects stale or abandoned plan tasks across the workspace.

**Plan**:
- Create WorkspaceRule scanning docs/plans/*.md
- Parse task blocks and check completion status

**Files**:
- Create: \`src/rules/plans/stale-detector.ts\`
- Test: \`src/rules/plans/plans-rules.test.ts\`

**Verification**: \`pnpm qa:test -- --reporter verbose plans-rules\` shows 5 new tests passing

---

## TASK 2 — Register Rules + Config

**Status**: [x]

**Plan**:
- Register the new rule in config files if needed
- Add exports to barrel files / entry points

**Files**:
- Edit: \`src/index.ts\`

**Verification**: All new features appear in config, \`grep 'stale-detector' src/index.ts\` outputs 1

---

## TASK 3 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get somewhere in code
- Verify all feature classes are instantiated in the entry point
- Verify no unused exports or dead code (orphaned)

**Verification**:
- \`grep -c 'registerCommand' src/extension.ts\` matches declared command count
- All config settings have corresponding config.get calls
- All feature classes instantiated (grep entry point for class names)
- No orphaned exports (every export is imported somewhere)

---

## TASK 4 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: \`pnpm -w run qa:lint --tools\`
- Run: \`pnpm qa:test\`

**Verification**: All \`pnpm\` commands exit 0, test count >= 4994

---

## TASK 5 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all implementation files exist
- Verify all features registered in config
- Verify all integration checks pass
- Verify test count >= baseline + new tests

**Verification**:
- All implementation \`.ts\` files exist
- All entries in config / entry point
- Test count >= baseline + new tests
- Integration audit shows zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Create stale-plan-detector rule | -- |
| 2 | Register rules + config | 1 |
| 3 | Integration verification | 2 |
| 4 | Full QA + Coverage | 3 |
| 5 | Final verification + commit | 4 |
`;

// =============================================================================
// plan-parser tests
// =============================================================================

describe('plan-parser', () => {
  it('parses header metadata', () => {
    const plan = parsePlan(VALID_PLAN);
    expect(plan.header.date).toBe('2026-04-01');
    expect(plan.header.packagePath).toBe('packages/shared/config/tooling/lint/src/');
    expect(plan.header.goal).toContain('workspace rule');
  });

  it('parses all task blocks', () => {
    const plan = parsePlan(VALID_PLAN);
    expect(plan.tasks).toHaveLength(5);
    expect(plan.tasks[0]?.number).toBe(1);
    expect(plan.tasks[0]?.name).toBe('Create stale-plan-detector rule');
    expect(plan.tasks[0]?.status).toBe('[x]');
    expect(plan.tasks[0]?.isTail).toBe(false);
  });

  it('identifies tail tasks', () => {
    const plan = parsePlan(VALID_PLAN);
    const tailTasks = plan.tasks.filter((t) => t.isTail);
    expect(tailTasks.length).toBeGreaterThanOrEqual(3);
    expect(tailTasks.some((t) => t.name.includes('Register'))).toBe(true);
    expect(tailTasks.some((t) => t.name.includes('Integration'))).toBe(true);
    expect(tailTasks.some((t) => t.name.includes('Final'))).toBe(true);
  });

  it('parses task files', () => {
    const plan = parsePlan(VALID_PLAN);
    const task1 = plan.tasks[0]!;
    expect(task1.files).toHaveLength(2);
    expect(task1.files[0]?.action).toBe('create');
    expect(task1.files[0]?.path).toBe('src/rules/plans/stale-detector.ts');
    expect(task1.files[1]?.action).toBe('test');
  });

  it('parses execution order dependencies', () => {
    const plan = parsePlan(VALID_PLAN);
    expect(plan.dependencies).toHaveLength(5);
    expect(plan.dependencies[0]?.task).toBe(1);
    expect(plan.dependencies[0]?.dependsOn).toEqual([]);
    expect(plan.dependencies[1]?.task).toBe(2);
    expect(plan.dependencies[1]?.dependsOn).toEqual([1]);
  });

  it('parses range dependencies (e.g., 1-3)', () => {
    const content = `## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 4 | Integration | 1-3 |
`;
    const plan = parsePlan(content);
    expect(plan.dependencies[0]?.dependsOn).toEqual([1, 2, 3]);
  });

  it('parses verification text', () => {
    const plan = parsePlan(VALID_PLAN);
    expect(plan.tasks[0]?.verification).toContain('pnpm qa:test');
  });

  it('parses plan date from filename', () => {
    const d = parsePlanDate('2026-04-01-linter-phase-69.md');
    expect(d).toBeDefined();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(3); /* April = 3 (0-indexed) */
    expect(d?.getDate()).toBe(1);
  });

  it('returns undefined for invalid filename', () => {
    expect(parsePlanDate('TEMPLATE.md')).toBeUndefined();
  });

  it('detects structural sections', () => {
    const plan = parsePlan(VALID_PLAN);
    expect(plan.hasBaseline).toBe(true);
    expect(plan.hasStatusLegend).toBe(true);
    expect(plan.hasExecutionOrder).toBe(true);
  });
});

// =============================================================================
// plans/no-template-placeholders
// =============================================================================

describe('plans/no-template-placeholders', () => {
  it('detects [descriptive-name] placeholder', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': `## TASK 1 — [descriptive-name]\n**Status**: [ ]`,
    });
    const results: LintResult[] = await noTemplatePlaceholders.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.message).toContain('[descriptive-name]');
  });

  it('detects YYYY-MM-DD placeholder', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': `**Date**: YYYY-MM-DD`,
    });
    const results: LintResult[] = await noTemplatePlaceholders.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.message).toContain('YYYY-MM-DD');
  });

  it('detects src/path/to/ placeholder', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': `- Create: src/path/to/new-file.ts`,
    });
    const results: LintResult[] = await noTemplatePlaceholders.check(ctx);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('passes clean plan with no placeholders', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': VALID_PLAN,
    });
    const results: LintResult[] = await noTemplatePlaceholders.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips TEMPLATE.md', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/TEMPLATE.md': `## TASK 1 — [descriptive-name]\n**Date**: YYYY-MM-DD`,
    });
    const results: LintResult[] = await noTemplatePlaceholders.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// plans/no-incomplete-tasks
// =============================================================================

describe('plans/no-incomplete-tasks', () => {
  it('reports tasks that are not [x] on old plans', async () => {
    const ctx = createMockContext(
      {
        '/mock/docs/plans/2020-01-01-old-plan.md': `## TASK 1 — Old task\n\n**Status**: [ ]\n\n**Verification**: done`,
      },
      { maxAgeDays: 7 },
    );
    const results: LintResult[] = await noIncompleteTasks.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('not started');
  });

  it('reports [~] in-progress tasks on old plans', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2020-01-01-old-plan.md': `## TASK 1 — Stale task\n\n**Status**: [~]\n\n**Verification**: done`,
    });
    const results: LintResult[] = await noIncompleteTasks.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('still in progress');
  });

  it('skips recent plans within maxAgeDays', async () => {
    /* Use tomorrow's date to guarantee it's within the window */
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr: string = tomorrow.toISOString().slice(0, 10);
    const ctx = createMockContext({
      [`/mock/docs/plans/${dateStr}-fresh-plan.md`]: `## TASK 1 — Fresh task\n\n**Status**: [ ]\n\n**Verification**: done`,
    });
    const results: LintResult[] = await noIncompleteTasks.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('passes all-done plans', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2020-01-01-done-plan.md': VALID_PLAN,
    });
    const results: LintResult[] = await noIncompleteTasks.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// plans/status-dependency-order
// =============================================================================

describe('plans/status-dependency-order', () => {
  it('reports dependency violation: task done but dep not', async () => {
    const plan = `## TASK 1 — First thing

**Status**: [ ]

**Verification**: done

---

## TASK 2 — Second thing

**Status**: [x]

**Verification**: done

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | First thing | -- |
| 2 | Second thing | 1 |
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await statusDependencyOrder.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('TASK 2');
    expect(results[0]?.message).toContain('TASK 1');
    expect(results[0]?.message).toContain('[ ]');
  });

  it('passes consistent statuses', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': VALID_PLAN,
    });
    const results: LintResult[] = await statusDependencyOrder.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips plans without execution order', async () => {
    const plan = `## TASK 1 — thing\n\n**Status**: [x]\n\n**Verification**: done`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await statusDependencyOrder.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// plans/files-exist
// =============================================================================

describe('plans/files-exist', () => {
  it('reports missing files for completed tasks', async () => {
    const plan = `**Package**: \`@/lint\` (\`packages/lint/src/\`)

## TASK 1 — Create rule

**Status**: [x]

**Files**:
- Create: \`src/rules/my-rule.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
      /* Note: /mock/packages/lint/src/src/rules/my-rule.ts does NOT exist */
    });
    const results: LintResult[] = await filesExist.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('does not exist');
    expect(results[0]?.message).toContain('my-rule.ts');
  });

  it('passes when declared files exist', async () => {
    const plan = `**Package**: \`@/lint\` (\`pkg/\`)

## TASK 1 — Create rule

**Status**: [x]

**Files**:
- Create: \`src/my-rule.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
      '/mock/pkg/src/my-rule.ts': 'export default {};',
    });
    const results: LintResult[] = await filesExist.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips incomplete tasks', async () => {
    const plan = `**Package**: \`@/lint\` (\`pkg/\`)

## TASK 1 — Create rule

**Status**: [ ]

**Files**:
- Create: \`src/nonexistent.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await filesExist.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// plans/require-concrete-verification
// =============================================================================

describe('plans/require-concrete-verification', () => {
  it('reports generic verification text', async () => {
    const plan = `## TASK 1 — Do something

**Status**: [x]

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireConcreteVerification.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('too generic');
  });

  it('passes verification with specific commands', async () => {
    const plan = `## TASK 1 — Do something

**Status**: [x]

**Verification**: \`pnpm qa:test -- --reporter verbose my-rule\` shows 5 new tests passing
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireConcreteVerification.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('passes verification with file paths', async () => {
    const plan = `## TASK 1 — Do something

**Status**: [x]

**Verification**: src/rules/my-rule.ts exists and exports default rule
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireConcreteVerification.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('reports Integration Verification task without grep commands', async () => {
    const plan = `## TASK 3 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all commands registered
- Verify no unused exports

**Verification**: All commands registered, no dead code, all features wired
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireConcreteVerification.check(ctx);
    /* Should report missing grep/count commands */
    const integrationErrors = results.filter((r) => r.message.includes('Integration Verification'));
    expect(integrationErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('passes Integration Verification with grep commands', async () => {
    const plan = `## TASK 3 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all commands registered
- Verify no unused exports

**Verification**:
- \`grep -c 'registerCommand' src/extension.ts\` matches declared command count
- No orphaned exports
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireConcreteVerification.check(ctx);
    const integrationErrors = results.filter((r) => r.message.includes('Integration Verification'));
    expect(integrationErrors).toHaveLength(0);
  });
});

// =============================================================================
// plans/no-empty-plan-sections
// =============================================================================

describe('plans/no-empty-plan-sections', () => {
  it('reports short Gap text', async () => {
    const plan = `## TASK 1 — Do thing

**Status**: [ ]

**Gap**: Fix it

**Plan**:
- Step one
- Step two

**Files**:
- Create: \`src/foo.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    const gapErrors = results.filter((r) => r.message.includes('Gap'));
    expect(gapErrors).toHaveLength(1);
    expect(gapErrors[0]?.message).toContain('too short');
  });

  it('reports single plan bullet', async () => {
    const plan = `## TASK 1 — Do thing

**Status**: [ ]

**Gap**: This is a long enough gap description for the rule to pass validation.

**Plan**:
- Do the thing

**Files**:
- Create: \`src/foo.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    const planErrors = results.filter((r) => r.message.includes('Plan'));
    expect(planErrors).toHaveLength(1);
    expect(planErrors[0]?.message).toContain('1 bullet');
  });

  it('reports missing Files section on non-tail task', async () => {
    const plan = `## TASK 1 — Do thing

**Status**: [ ]

**Gap**: This is a long enough gap description for the rule to pass validation.

**Plan**:
- Step one
- Step two

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    const fileErrors = results.filter((r) => r.message.includes('Files'));
    expect(fileErrors).toHaveLength(1);
  });

  it('reports missing Verification section', async () => {
    const plan = `## TASK 1 — Do thing

**Status**: [ ]

**Gap**: This is a long enough gap description for the rule to pass validation.

**Plan**:
- Step one
- Step two

**Files**:
- Create: \`src/foo.ts\`
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    const verErrors = results.filter((r) => r.message.includes('Verification'));
    expect(verErrors).toHaveLength(1);
  });

  it('passes well-formed tasks', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': VALID_PLAN,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips Gap and Files checks for tail tasks', async () => {
    const plan = `## TASK 3 — Register Rules + Config

**Status**: [x]

**Plan**:
- Register in config
- Add exports

**Verification**: All features in config, \`grep 'rule' src/index.ts\` outputs 1
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await noEmptyPlanSections.check(ctx);
    /* Should not report missing Gap or Files for tail tasks */
    const gapOrFileErrors = results.filter(
      (r) => r.message.includes('Gap') || r.message.includes('Files'),
    );
    expect(gapOrFileErrors).toHaveLength(0);
  });
});

// =============================================================================
// plans/require-test-files
// =============================================================================

describe('plans/require-test-files', () => {
  it('reports task creating source files without test files', async () => {
    const plan = `## TASK 1 — Create feature

**Status**: [ ]

**Files**:
- Create: \`src/features/my-feature.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireTestFiles.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]?.message).toContain('no test files');
  });

  it('passes task with test file declared', async () => {
    const plan = `## TASK 1 — Create feature

**Status**: [ ]

**Files**:
- Create: \`src/features/my-feature.ts\`
- Test: \`src/features/my-feature.test.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireTestFiles.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('exempts config/schema/index files', async () => {
    const plan = `## TASK 1 — Update config

**Status**: [ ]

**Files**:
- Edit: \`src/vitest.config.ts\`
- Edit: \`src/user.schema.ts\`
- Edit: \`src/index.ts\`

**Verification**: Tests pass
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireTestFiles.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips tail tasks', async () => {
    const plan = `## TASK 3 — Register Rules + Config

**Status**: [ ]

**Files**:
- Edit: \`src/entry.ts\`

**Verification**: All registered
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireTestFiles.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('skips tasks with no files', async () => {
    const plan = `## TASK 1 — Research

**Status**: [ ]

**Verification**: Research complete
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requireTestFiles.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// plans/require-plan-structure
// =============================================================================

describe('plans/require-plan-structure', () => {
  it('passes a well-formed plan', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': VALID_PLAN,
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    expect(results).toHaveLength(0);
  });

  it('reports missing Status Legend section', async () => {
    const plan = `## Baseline

| Metric | Value |
|--------|-------|
| Tests | 100 |

## TASK 1 — Register Rules + Config

**Status**: [x]

**Plan**:
- Register in config
- Add exports

**Verification**: All features in config, \`grep 'rule' src/index.ts\` outputs 1

---

## TASK 2 — Integration Verification

**Status**: [x]

**Plan**:
- Verify all declared commands have matching registerCommand calls
- Verify all config settings are read via config.get
- Verify all feature classes are instantiated
- Verify no unused exports or dead code (orphaned)

**Verification**:
- \`grep -c 'registerCommand' src/extension.ts\` matches declared count
- No orphaned exports

---

## TASK 3 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: \`pnpm qa:test\`
- Run: \`pnpm qa:lint\`

**Verification**: All pnpm commands exit 0

---

## TASK 4 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all implementation files exist
- Verify all features registered in config
- Verify all integration checks pass
- Verify test count >= baseline

**Verification**:
- All files exist
- All entries in config
- Test count >= baseline
- Integration audit shows zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Register | -- |
| 2 | Integration | 1 |
| 3 | QA | 2 |
| 4 | Final | 3 |
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    const legendErrors = results.filter((r) => r.message.includes('Status Legend'));
    expect(legendErrors).toHaveLength(1);
  });

  it('reports missing required tail tasks', async () => {
    const plan = `## Status Legend

- \`[ ]\` — Not started
- \`[x]\` — Done

---

## Baseline

| Metric | Value |
|--------|-------|
| Tests | 100 |

---

## TASK 1 — Do something

**Status**: [x]

**Verification**: Tests pass at \`src/foo.ts\`

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Do something | -- |
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    /* Missing all 4 tail tasks */
    const tailErrors = results.filter((r) => r.message.includes('Missing required tail task'));
    expect(tailErrors).toHaveLength(4);
  });

  it('reports incomplete Integration Verification task', async () => {
    const plan = `## Status Legend

- \`[ ]\` — Not started
- \`[x]\` — Done

---

## Baseline

| Metric | Value |
|--------|-------|
| Tests | 100 |

---

## TASK 1 — Register Rules + Config

**Status**: [x]

**Plan**:
- Register stuff
- Add exports

**Verification**: All features in config at \`src/index.ts\`

---

## TASK 2 — Integration Verification

**Status**: [x]

**Plan**:
- Just check things
- Make sure it works

**Verification**: Looks good

---

## TASK 3 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: \`pnpm qa:test\`
- Run: \`pnpm qa:lint\`

**Verification**: All pnpm commands exit 0

---

## TASK 4 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all implementation files exist
- Verify all features registered in config
- Verify all integration checks pass
- Verify test count >= baseline

**Verification**:
- All files exist
- All entries in config
- Test count >= baseline
- Integration audit zero gaps

---

## Execution Order

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Register | -- |
| 2 | Integration | 1 |
| 3 | QA | 2 |
| 4 | Final | 3 |
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    const integrationErrors = results.filter((r) => r.message.includes('incomplete'));
    expect(integrationErrors).toHaveLength(1);
    expect(integrationErrors[0]?.message).toContain('command registration');
  });

  it('reports missing Execution Order table', async () => {
    const plan = `## Status Legend

- \`[ ]\` — Not started
- \`[x]\` — Done

---

## Baseline

| Metric | Value |
|--------|-------|
| Tests | 100 |

---

## TASK 1 — Do something

**Status**: [x]

**Verification**: Tests pass at \`src/foo.ts\`
`;
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-01-test.md': plan,
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    const orderErrors = results.filter((r) => r.message.includes('Execution Order'));
    expect(orderErrors).toHaveLength(1);
  });

  it('skips TEMPLATE.md', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/TEMPLATE.md': '# Template\n\nNo structure here.',
    });
    const results: LintResult[] = await requirePlanStructure.check(ctx);
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// discoverPlanFiles helper
// =============================================================================

describe('discoverPlanFiles', () => {
  it('returns only .md files under docs/plans/', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-24-foo.md': '# Foo',
      '/mock/docs/plans/2026-04-25-bar.md': '# Bar',
      '/mock/docs/other.md': '# elsewhere',
      '/mock/README.md': '# root',
    });
    const files: readonly string[] = await discoverPlanFiles(ctx);
    expect(files).toEqual(
      expect.arrayContaining([
        '/mock/docs/plans/2026-04-24-foo.md',
        '/mock/docs/plans/2026-04-25-bar.md',
      ]),
    );
    expect(files).not.toContain('/mock/docs/other.md');
    expect(files).not.toContain('/mock/README.md');
  });

  it('excludes TEMPLATE.md from the result', async () => {
    const ctx = createMockContext({
      '/mock/docs/plans/2026-04-24-foo.md': '# Foo',
      '/mock/docs/plans/TEMPLATE.md': '# Template',
    });
    const files: readonly string[] = await discoverPlanFiles(ctx);
    expect(files).toContain('/mock/docs/plans/2026-04-24-foo.md');
    expect(files).not.toContain('/mock/docs/plans/TEMPLATE.md');
  });

  it('returns empty when no .md files match', async () => {
    const ctx = createMockContext({
      '/mock/docs/other.md': '# elsewhere',
    });
    const files: readonly string[] = await discoverPlanFiles(ctx);
    expect(files).toEqual([]);
  });
});
