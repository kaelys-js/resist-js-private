COMMIT EVERYTHING UNSTAGED AND THEN:

This: /Users/coleb/Desktop/webforge/packages/shared/[TARGET_PATH]

Run the custom linter against this file/directory and fix every error and warning found.

1. Run ALL FOUR QA checks and collect ALL errors:
   - `pnpm -w run qa:lint 2>&1 | grep "[TARGET_PATH]"` (oxlint)
   - `npx tsx packages/shared/config/tooling/lint/src/cli.ts [TARGET_PATH]` (custom lint)
   - `cd [TARGET_PACKAGE] && pnpm qa:type-check 2>&1 | grep "error TS"` (type-check)
   - `npx vitest run --project [PROJECT_NAME] 2>&1` (tests)
   Present ALL errors from ALL FOUR checks before proposing fixes.
2. For EACH error/warning found:
   - Read the source file at the flagged line
   - Read the rule that flagged it at packages/shared/config/tooling/lint/src/rules/
   - Determine: is this a TRUE POSITIVE (real code issue) or FALSE POSITIVE (rule bug)?
   - If TRUE POSITIVE: propose the exact code fix with before/after
   - If FALSE POSITIVE: propose the exact rule fix with before/after (and add to rule tests)
3. Present a detailed changelog with:
   - Every error grouped by file
   - For each error: the rule ID, line number, current code, why it's wrong, and the exact fix
   - Clearly mark which are code fixes vs rule fixes
4. After approval, implement ALL fixes
5. After implementation, re-run ALL FOUR checks and confirm ZERO errors in EACH:
   - `pnpm -w run qa:lint 2>&1 | grep "[TARGET_PATH]"` → 0 errors
   - `npx tsx packages/shared/config/tooling/lint/src/cli.ts [TARGET_PATH]` → 0 errors
   - `cd [TARGET_PACKAGE] && pnpm qa:type-check 2>&1 | grep "error TS"` → 0 errors
   - `npx vitest run --project [PROJECT_NAME]` → all pass
   If ANY check has errors, fix them and re-run ALL checks again.
6. Run `npx vitest run --project lint` to confirm all rule tests still pass (210+ must pass)

DO NOT weaken assertions, skip errors, or dismiss warnings as "acceptable." Every single diagnostic must be resolved — either fix the code or fix the rule.

CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

---

This: /Users/coleb/Desktop/webforge/packages/shared/[TARGET_PATH]

I noticed [DESCRIBE WHAT YOU SEE — e.g. "functions returning raw objects instead of using ok()", "missing error handling in catch blocks", "inconsistent naming on schema variables"].

1. Read ALL source files in the target directory to find every instance of this pattern
2. Read the existing custom lint rules at packages/shared/config/tooling/lint/src/rules/ to determine:
   - Does an existing rule ALREADY cover this? If so, why isn't it catching it? (false negative analysis — fix the rule)
   - Does a rule PARTIALLY cover this? If so, what enhancement is needed? (gap analysis — extend the rule)
   - Is this completely uncovered? If so, design a new rule (new rule — create it)
3. For each rule change or new rule, provide:
   - Rule ID and category (e.g. result/no-raw-object-return)
   - What it detects (exact pattern description)
   - Detection logic (AST node types, regex patterns, or source analysis)
   - False positive mitigation (what should NOT be flagged)
   - Every instance in the target directory it would catch (file:line)
   - Every instance across the FULL codebase it would catch (grep/search)
4. Present a detailed changelog with:
   - Each rule fix/enhancement/creation with exact code
   - Tests for every rule (positive + negative cases)
   - Registration in the appropriate all.ts category file
5. After approval, implement ALL changes following TDD:
   - Write failing tests first
   - Implement rule logic
   - Verify tests pass
6. Verify: run lint tests (all must pass), run qa:lint (0 oxlint errors), run the custom linter against the target directory and confirm every identified instance is now caught

CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

--

This: /Users/coleb/Desktop/webforge/packages/shared/[TARGET_PATH]

Run qa:lint and qa:lint:custom against this directory. Then:

1. Read ALL lint rules at packages/shared/config/tooling/lint/src/rules/
2. Read ALL source files in the target directory
3. Compare the lint output against the actual code and identify:
   - FALSE POSITIVES: rules firing incorrectly (code is correct but flagged)
   - FALSE NEGATIVES: real issues the rules SHOULD catch but DON'T
   - MISSING RULES: patterns of bad code that no rule covers
   - RULE QUALITY: contradictory reports, wrong severity, misleading messages
4. For each finding, provide:
   - The exact rule file and line causing the issue
   - The exact source file and line being mis-analyzed
   - Root cause explanation (why the rule logic fails)
   - Proposed fix with exact code changes
5. Present a detailed changelog with ALL findings and fixes
6. After approval, implement ALL fixes + update/create tests following TDD
7. Verify: run lint tests (201+ must pass), run qa:lint (0 oxlint errors), verify each fix against the changelog by checking lint output on the target directory

CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

--

This: 

Need it to be shared so any product can use it.

100% Test Coverage For Every File + Verification (Based On TDD) CRITICAL: DO NOT SKIP CODE BUGS OR ISSUES WHERE TESTS FAIL. PRESENT THEM AND WAIT FOR USER INSTRUCTION. DO NOT SKIP ERROR PATHS IN TESTS.

ADD TO TODO: VERIFY 100% TEST COVERAGE IN EVERY BRANCH IN EVERY FILE. DO NOT SKIP OR IGNORE OR BE A LAZY BITCH.

CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.
---
Convert {COMPONENT} to full Lens compliance. Read docs/prompts/lens-component-conversion.md and follow it exactly. Verify after each Step that you have explicitly followed EVERY WORD.

CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

- [Prompt 0]
- 

- [Prompt 1]
  - Build Editor UI: See below
  * Following memory.md, CLAUDE.md, build-editor skill
  * Follow TDD with full Unit/Behavioural/Integration Tests
  * Research online for best practices
  * Update ARCHITECTURE/README
  * Skip visual verification for now. I will do it.
  * Present a changelog before proceeding and ask for permission

  Several Issues (build-editor OR fix-bug if needed):

- [Prompt 2]
  - Several Issues:
    - 

  CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

- [Prompt 3]
  - Build Editor UI: [what you want built]
    - Following memory.md, CLAUDE.md, build-editor skill
    - Follow TDD
    - Research online for best practices
    - Update ARCHITECTURE/README
    - Visually verify via Playwright MCP so I can see your verification
    - Present a changelog before proceeding and ask for permission

- [Prompt 4]
  - Expand Feature: 
    - Following memory.md, CLAUDE.md, expand-feature skill
    - Follow TDD
    - You could also do thorough research online for features/options
    - Update ARCHITECTURE/README
    - Add toggles/options/features to Dev UX
    - Visually verify added options/features work in Dev UX and in the Scene via the open Playwright MCP browser so I CAN VISUALLY SEE YOUR VERIFICATION
    - Present a changelog before proceeding and ask for permission for implementing
