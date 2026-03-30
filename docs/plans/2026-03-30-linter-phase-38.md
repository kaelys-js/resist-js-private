# @/lint Phase 38 — Primitives Lint Rules (Numbers, Math, Strings, Dates, JSON, Arrays)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Date**: 2026-03-30
**Package**: `@/lint` (`packages/shared/config/tooling/lint/src/`)
**Source**: `_INTEGRATE/linter/primitives.md`
**Goal**: Extend the AST visitor framework with 6 new node types, then implement 32 primitives lint rules using proper AST visitors. Rules detect number precision issues, BigInt misuse, math edge cases, string unicode pitfalls, date mutation, JSON serialization bugs, comparison traps, array holes, and object prototype misuse.
**Architecture**: All rules are `TypeScriptRule` with AST visitors (`Literal`, `BinaryExpression`, `CallExpression`, `NewExpression`, `AssignmentExpression`, `UnaryExpression`, `ArrayExpression`, `MemberExpression`, `Program`, `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`).

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
| Tests | 4520 pass / 0 fail |
| Type-check | Passes |
| AstVisitor node types | 35 |

---

## TASK 0 — Extend AST Visitor Framework

**Status**: [x]

**Plan**:
- Add 6 node types to `AstVisitorSchema` in `framework/types.ts`: `BinaryExpression`, `NewExpression`, `AssignmentExpression`, `UnaryExpression`, `ArrayExpression`, `Literal`

**Files**:
- Modify: `src/framework/types.ts`

**Verification**: Type-check passes, no test regressions

---

## TASK 1 — `primitives/no-unsafe-integer`

**Status**: [x]

**What**: Detect numeric literals > MAX_SAFE_INTEGER (9007199254740991)
**Visitor**: `Literal`
**Branches**: Large integer literal → warn, safe integer → pass, non-number literal → skip

---

## TASK 2 — `primitives/no-float-equality`

**Status**: [x]

**What**: Detect === or !== where one operand is a float literal
**Visitor**: `BinaryExpression`
**Branches**: Float literal in equality → warn, integer comparison → pass, non-equality operator → skip

---

## TASK 3 — `primitives/no-infinity-arithmetic`

**Status**: [x]

**What**: Detect ** with large exponents or division without zero check
**Visitor**: `BinaryExpression`
**Branches**: ** with large literal → warn, / operator → warn, safe arithmetic → pass

---

## TASK 4 — `primitives/use-number-is-finite`

**Status**: [x]

**What**: Detect global isFinite() instead of Number.isFinite()
**Visitor**: `CallExpression`
**Branches**: Bare isFinite() → warn, Number.isFinite() → pass, other calls → skip

---

## TASK 5 — `primitives/use-number-is-integer`

**Status**: [x]

**What**: Detect manual integer checks (x % 1 === 0, Math.floor(x) === x)
**Visitor**: `BinaryExpression`
**Branches**: x % 1 === 0 → warn, Math.floor(x) === x → warn, other patterns → pass

---

## TASK 6 — `primitives/no-toFixed-rounding`

**Status**: [x]

**What**: Detect .toFixed() calls
**Visitor**: `CallExpression`
**Branches**: .toFixed() call → warn, other method calls → skip

---

## TASK 7 — `primitives/prefer-bigint-for-ids`

**Status**: [x]

**What**: Detect interface properties named *Id/*id/id typed as number
**Visitor**: `TSInterfaceDeclaration`
**Branches**: ID property as number → warn, ID as string/bigint → pass, non-ID property → skip

---

## TASK 8 — `primitives/no-bigint-number-mix`

**Status**: [x]

**What**: Detect arithmetic mixing bigint and number literals (123n + 456)
**Visitor**: `BinaryExpression`
**Branches**: BigInt + number → warn, same-type → pass, non-arithmetic → skip

---

## TASK 9 — `primitives/no-math-random-crypto`

**Status**: [x]

**What**: Detect Math.random() in security-sensitive files
**Visitor**: `CallExpression`
**Branches**: Math.random() in auth/token/secret file → warn, in other files → pass

---

## TASK 10 — `primitives/division-by-zero`

**Status**: [x]

**What**: Detect division by variable without zero guard
**Visitor**: `BinaryExpression`
**Branches**: / by variable → warn, / by literal !== 0 → pass, non-division → skip

---

## TASK 11 — `primitives/no-modulo-negative`

**Status**: [x]

**What**: Detect % operator usage
**Visitor**: `BinaryExpression`
**Branches**: % operator → warn, other operators → skip

---

## TASK 12 — `primitives/prefer-math-trunc`

**Status**: [x]

**What**: Detect Math.floor() calls
**Visitor**: `CallExpression`
**Branches**: Math.floor() → warn, Math.trunc() → pass, other calls → skip

---

## TASK 13 — `primitives/no-lossy-math-operation`

**Status**: [x]

**What**: Detect Math.round(x * N) / N rounding patterns
**Visitor**: `BinaryExpression`
**Branches**: Math.round(...) / N → warn, other division → skip

---

## TASK 14 — `primitives/no-string-length-unicode`

**Status**: [x]

**What**: Detect .length on strings (UTF-16 code unit count, not characters)
**Visitor**: `MemberExpression`
**Branches**: str.length → warn, arr.length → skip, [...str].length → pass

---

## TASK 15 — `primitives/no-string-index-unicode`

**Status**: [x]

**What**: Detect .charAt() calls
**Visitor**: `CallExpression`
**Branches**: .charAt() → warn, other calls → skip

---

## TASK 16 — `primitives/prefer-normalize-comparison`

**Status**: [x]

**What**: Detect string === comparison without .normalize()
**Visitor**: `BinaryExpression`
**Branches**: String literal === string literal → skip (compile-time), variable === variable → warn

---

## TASK 17 — `primitives/no-regex-on-untrusted`

**Status**: [x]

**What**: Detect new RegExp(variable) — ReDoS risk
**Visitor**: `NewExpression`
**Branches**: new RegExp(variable) → warn, new RegExp(literal) → pass, non-RegExp → skip

---

## TASK 18 — `primitives/no-new-date-string-parse`

**Status**: [x]

**What**: Detect new Date(stringLiteral) with non-ISO format
**Visitor**: `NewExpression`
**Branches**: new Date("01/15/2024") → warn, new Date(number) → pass, new Date() → pass

---

## TASK 19 — `primitives/no-date-mutation`

**Status**: [x]

**What**: Detect date.setMonth(), date.setFullYear(), etc.
**Visitor**: `CallExpression`
**Branches**: .setMonth()/.setFullYear()/etc → warn, .getMonth() → pass

---

## TASK 20 — `primitives/no-date-arithmetic`

**Status**: [x]

**What**: Detect subtraction of Date objects (returns ms)
**Visitor**: `BinaryExpression`
**Branches**: date - date → warn, getTime() - getTime() → pass

---

## TASK 21 — `primitives/no-json-bigint`

**Status**: [x]

**What**: Detect JSON.parse() without reviver function
**Visitor**: `CallExpression`
**Branches**: JSON.parse(str) without 2nd arg → warn, JSON.parse(str, reviver) → pass

---

## TASK 22 — `primitives/no-json-undefined`

**Status**: [x]

**What**: Detect JSON.stringify() without replacer
**Visitor**: `CallExpression`
**Branches**: JSON.stringify(obj) without 2nd arg → warn, with replacer → pass

---

## TASK 23 — `primitives/no-json-circular`

**Status**: [x]

**What**: Detect JSON.stringify() on variables with self-reference patterns
**Visitor**: `CallExpression`
**Branches**: JSON.stringify() → warn (general advisory), with safe-stringify → pass

---

## TASK 24 — `primitives/no-json-nan-infinity`

**Status**: [x]

**What**: Detect JSON.stringify() where number values could be NaN/Infinity
**Visitor**: `CallExpression`
**Branches**: JSON.stringify() without replacer → warn, with replacer → pass

---

## TASK 25 — `primitives/no-compare-different-types`

**Status**: [x]

**What**: Detect relational operators between string literal and number literal
**Visitor**: `BinaryExpression`
**Branches**: "10" > 9 → warn, same-type comparison → pass

---

## TASK 26 — `primitives/no-relational-null-undefined`

**Status**: [x]

**What**: Detect <, >, <=, >= with null or undefined literal
**Visitor**: `BinaryExpression`
**Branches**: null >= 0 → warn, null === null → pass, non-relational → skip

---

## TASK 27 — `primitives/object-is-for-special`

**Status**: [x]

**What**: Detect === NaN or === -0 patterns
**Visitor**: `BinaryExpression`
**Branches**: x === NaN → warn, x === -0 → warn, normal === → pass

---

## TASK 28 — `primitives/no-array-hole`

**Status**: [x]

**What**: Detect sparse arrays [1, , 3], delete arr[i], new Array(n) without fill
**Visitor**: `ArrayExpression`, `UnaryExpression`, `NewExpression`
**Branches**: Elision in array → warn, delete arr[i] → warn, new Array(5) → warn, filled array → pass

---

## TASK 29 — `primitives/no-array-length-mutation`

**Status**: [x]

**What**: Detect assignment to .length property
**Visitor**: `AssignmentExpression`
**Branches**: arr.length = 0 → warn, arr.length (read) → pass

---

## TASK 30 — `primitives/no-array-index-string`

**Status**: [x]

**What**: Detect non-numeric string bracket access on arrays
**Visitor**: `AssignmentExpression`
**Branches**: arr["key"] = val → warn, arr[0] → pass, obj["key"] → skip

---

## TASK 31 — `primitives/no-object-prototype-access`

**Status**: [x]

**What**: Detect obj.hasOwnProperty() — use Object.hasOwn()
**Visitor**: `CallExpression`
**Branches**: .hasOwnProperty() → warn, Object.hasOwn() → pass

---

## TASK 32 — `primitives/no-in-operator-primitive`

**Status**: [x]

**What**: Detect 'in' operator where right side is string/number literal
**Visitor**: `BinaryExpression`
**Branches**: "key" in "string" → warn, "key" in obj → pass

---

## TASK 33 — Register Rules + Config

**Status**: [x]

**Plan**:
- Add 32 rules to `.resist-lint.jsonc` with severities from source doc

**Files**:
- Modify: `.resist-lint.jsonc`

**Verification**: All 32 rules in config

---

## TASK 34 — Full QA + Coverage

**Status**: [x]

**Plan**:
- Run: `pnpm --filter @/lint qa:type-check`
- Run: `pnpm --filter @/lint qa:test`
- Run: `pnpm -w run qa:format`
- Run: `pnpm -w run qa:format:check`
- Verify test count increased from baseline

**Verification**: All commands exit 0

---

## TASK 35 — Final Verification + Commit

**Status**: [x]

**Plan**:
- Verify all 32 rule files exist
- Verify AstVisitorSchema has 6 new node types
- Verify all 32 rules registered in `.resist-lint.jsonc`
- Verify test count increased from baseline
- Commit with descriptive message

**Verification**:
- All files exist in `src/rules/primitives/`
- Test count ≥ baseline + new tests
