# @/lint Phase 49 — Svelte 5 Runes Lint Rules + Framework Extension

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Spec**: `_INTEGRATE/linter/svelte5.md`
**Goal**: Extend the linter framework with Svelte template AST support (via `svelte/compiler`), then implement 18 Svelte 5 runes lint rules covering legacy syntax detection, rune usage patterns, component conventions, and template analysis.
**Architecture**: All rules are `TypeScriptRule` with `patterns: ['**/*.svelte']`. Script-only rules use standard AST visitors. Template rules use Svelte template AST visitors (new framework capability). Cross-analysis rules use `ruleState` for script+template coordination.

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
| Tests | 4871 total |
| Svelte5 rules | 0 |
| Template AST support | No |

---

## TASK 0 — Framework Extension: Svelte Template AST Support

**Status**: [x]

**Gap**: Linter extracts `<script>` blocks from `.svelte` files but ignores template. No AST-level detection of `{#each}`, `bind:`, `on:`, `<slot>`, `{@render}`, `style=`.

**Plan**:
- Create `src/framework/svelte-template.ts` — `parseSvelteTemplate(content)` using `svelte/compiler` parse with `{ modern: true }`, `walkSvelteNode(node, callback)` for depth-first template traversal
- Modify `src/framework/types.ts` — add `templateAst` and `ruleState` to VisitorContext
- Modify `src/framework/oxc-runner.ts` — after TypeScript AST walk for `.svelte` files, parse template, walk template AST invoking visitors, patch `loc` on template nodes

**Files**:
- Create: `src/framework/svelte-template.ts`
- Modify: `src/framework/types.ts`
- Modify: `src/framework/oxc-runner.ts`

**Verification**: Existing 4871 tests pass, template AST nodes walked for .svelte files

---

## TASK 1 — Shared Helpers + Test Scaffold

**Status**: [x]

**Plan**:
- Create `src/rules/svelte5/_svelte-helpers.ts` — `collectStateVariables`, `collectDerivedVariables`, `isRuneCall`, `getCallbackBody`, `hasReturnStatement`, `findAssignmentTargets`, `isInsideConditional`, `getModuleScriptRange`
- Create `src/rules/svelte5/svelte5-rules.test.ts` — test scaffold with `lint()` helper

**Files**:
- Create: `src/rules/svelte5/_svelte-helpers.ts`
- Create: `src/rules/svelte5/svelte5-rules.test.ts`

---

## TASK 2 — svelte5/no-legacy-reactive-statements (error)

**Status**: [x]
**Visitor**: `LabeledStatement` — `label.name === '$'`
**Message**: `Legacy reactive statement '$:' - use $derived or $effect instead`
**File**: `src/rules/svelte5/no-legacy-reactive-statements.ts`

---

## TASK 3 — svelte5/no-legacy-props (error)

**Status**: [x]
**Visitor**: `ExportNamedDeclaration` — declaration is `let` VariableDeclaration
**Message**: `Legacy prop declaration 'export let ${name}' - use $props() instead`
**File**: `src/rules/svelte5/no-legacy-props.ts`

---

## TASK 4 — svelte5/require-effect-cleanup (error)

**Status**: [x]
**Visitor**: `CallExpression` — `$effect` body has subscribe/timer patterns without cleanup return
**Message**: `$effect contains '${operation}' but no cleanup function returned`
**File**: `src/rules/svelte5/require-effect-cleanup.ts`

---

## TASK 5 — svelte5/no-effect-mutation (error)

**Status**: [x]
**Visitor**: `Program` — collect $state vars, find unguarded mutations in $effect
**Message**: `Unguarded mutation of '$state' variable '${name}' inside $effect may cause infinite loop`
**File**: `src/rules/svelte5/no-effect-mutation.ts`

---

## TASK 6 — svelte5/prefer-derived-over-effect (warning)

**Status**: [x]
**Visitor**: `Program` — $effect with single assignment to $state var
**Message**: `$effect only sets '${name}' - use $derived instead`
**File**: `src/rules/svelte5/prefer-derived-over-effect.ts`

---

## TASK 7 — svelte5/require-bindable-for-bind (error)

**Status**: [x]
**Visitors**: `BindDirective` (template) + `Program` (script) — cross-analysis via ruleState
**Message**: `Prop '${name}' used with bind: but not declared as $bindable()`
**File**: `src/rules/svelte5/require-bindable-for-bind.ts`

---

## TASK 8 — svelte5/no-legacy-event-handlers (error)

**Status**: [x]
**Visitor**: `OnDirective` (template)
**Message**: `Legacy event handler 'on:${event}' - use 'on${event}' attribute instead`
**File**: `src/rules/svelte5/no-legacy-event-handlers.ts`

---

## TASK 9 — svelte5/no-create-event-dispatcher (error)

**Status**: [x]
**Visitor**: `ImportDeclaration` — `createEventDispatcher` from `'svelte'`
**Message**: `createEventDispatcher is deprecated in Svelte 5 - use callback props instead`
**File**: `src/rules/svelte5/no-create-event-dispatcher.ts`

---

## TASK 10 — svelte5/no-legacy-slots (error)

**Status**: [x]
**Visitors**: `SlotElement` (template) + `Program` (script for $$slots)
**Messages**: `<slot> is deprecated in Svelte 5 - use snippets with {@render}` / `$$slots is deprecated in Svelte 5 - check snippet props directly`
**File**: `src/rules/svelte5/no-legacy-slots.ts`

---

## TASK 11 — svelte5/require-snippet-typing (warning)

**Status**: [x]
**Visitors**: `RenderTag` (template) + `Program` (script) — cross-analysis via ruleState
**Message**: `Snippet prop '${name}' should be typed as Snippet or Snippet<[...]>`
**File**: `src/rules/svelte5/require-snippet-typing.ts`

---

## TASK 12 — svelte5/no-rest-props-misuse (error)

**Status**: [x]
**Visitor**: `Program` — search content for `$$restProps`/`$$props`
**Message**: `$$restProps is deprecated in Svelte 5 - use rest destructuring with $props()`
**File**: `src/rules/svelte5/no-rest-props-misuse.ts`

---

## TASK 13 — svelte5/prefer-derived-by (warning)

**Status**: [x]
**Visitor**: `CallExpression` — `$derived()` with 3+ chained method calls
**Message**: `Complex derivation should use $derived.by() for clarity`
**File**: `src/rules/svelte5/prefer-derived-by.ts`

---

## TASK 14 — svelte5/no-state-in-module-context (error)

**Status**: [x]
**Visitor**: `Program` — find module script range, check for $state within
**Message**: `$state in module context creates shared state across all component instances`
**File**: `src/rules/svelte5/no-state-in-module-context.ts`

---

## TASK 15 — svelte5/component-naming (warning)

**Status**: [x]
**Visitor**: `Program` — check filename PascalCase, exempt SvelteKit convention files
**Message**: `Component file should be PascalCase: '${current}' -> '${suggested}'`
**File**: `src/rules/svelte5/component-naming.ts`

---

## TASK 16 — svelte5/no-inline-styles (warning)

**Status**: [x]
**Visitor**: `Attribute` (template) — `name === 'style'` with literal string value
**Message**: `Avoid inline styles - use CSS classes or style: directives`
**File**: `src/rules/svelte5/no-inline-styles.ts`

---

## TASK 17 — svelte5/require-each-key (error)

**Status**: [x]
**Visitor**: `EachBlock` (template) — `node.key` is null
**Message**: `{#each} block should have a key expression for stable identity`
**File**: `src/rules/svelte5/require-each-key.ts`

---

## TASK 18 — svelte5/no-reactive-class-properties (warning)

**Status**: [x]
**Visitor**: `Program` — $state() inside ClassBody PropertyDefinition
**Message**: `$state in class property makes all instances deeply reactive - ensure this is intentional`
**File**: `src/rules/svelte5/no-reactive-class-properties.ts`

---

## TASK 19 — svelte5/no-untrack-misuse (warning)

**Status**: [x]
**Visitor**: `CallExpression` — `untrack()` wrapping non-reactive values
**Message**: `untrack() used on non-reactive value '${expression}' - untrack is only needed for $state/$derived`
**File**: `src/rules/svelte5/no-untrack-misuse.ts`

---

## TASK 20 — Register Rules + Config

**Status**: [x]

**Plan**: Register all 18 rules in `.resist-lint.jsonc` with appropriate severity:
- `svelte5/no-legacy-reactive-statements`: `"error"`
- `svelte5/no-legacy-props`: `"error"`
- `svelte5/require-effect-cleanup`: `"error"`
- `svelte5/no-effect-mutation`: `"error"`
- `svelte5/prefer-derived-over-effect`: `"warn"`
- `svelte5/require-bindable-for-bind`: `"error"`
- `svelte5/no-legacy-event-handlers`: `"error"`
- `svelte5/no-create-event-dispatcher`: `"error"`
- `svelte5/no-legacy-slots`: `"error"`
- `svelte5/require-snippet-typing`: `"warn"`
- `svelte5/no-rest-props-misuse`: `"error"`
- `svelte5/prefer-derived-by`: `"warn"`
- `svelte5/no-state-in-module-context`: `"error"`
- `svelte5/component-naming`: `"warn"`
- `svelte5/no-inline-styles`: `"warn"`
- `svelte5/require-each-key`: `"error"`
- `svelte5/no-reactive-class-properties`: `"warn"`
- `svelte5/no-untrack-misuse`: `"warn"`

**Files**:
- Edit: `.resist-lint.jsonc`

**Verification**: Config valid, all rules load

---

## TASK 21 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run `pnpm -w run qa:lint`
- Run `pnpm -w run qa:test`
- Run `pnpm -w run qa:format:check`
- Run `pnpm --filter @/lint qa:test:coverage`
- Verify all coverage thresholds pass (statements ≥80%, branches ≥75%, functions ≥80%, lines ≥80%)
- Verify test count increased from baseline 4871

**Verification**: All QA green, coverage above thresholds

---

## TASK 22 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 18 rules implemented against approved changelog and spec (`_INTEGRATE/linter/svelte5.md`)
- Verify each rule file exists at `rules/svelte5/<rule-name>.ts` and matches its plan
- Verify each rule has tests in `rules/svelte5/svelte5-rules.test.ts`
- Verify all 18 rules registered in `.resist-lint.jsonc` with correct severities
- Verify framework extension (svelte-template.ts, oxc-runner.ts, types.ts) is complete
- Commit all changes

**Verification**: All tasks `[x]`, commit clean
