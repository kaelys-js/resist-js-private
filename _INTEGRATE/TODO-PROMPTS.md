COMMIT EVERYTHING UNSTAGED AND THEN:

This: Entire Workspace
* Verify that qa:lint passes. Present all errors/warnings in the changelog with explanation/solution if there are any. Use autofix if possible. YOU DO NOT NEED TO RUN qa:lint more than one time. The output has EXACTY what you need. Fucking cunt.

DO NOT weaken assertions, skip errors, or dismiss warnings as "acceptable." Every single diagnostic must be resolved — either fix the code or fix the rule. DO NOT skip ANY branch — trace every if/else, try/catch, ternary, ??, ||. Use exact error codes in assertions.

Steps (MANDATORY, DO NOT SKIP, READ EVERY WORD, FOLLOW EXACTLY):
- Re-invoke the fix-bug skill
- Read CLAUDE.md
- Follow docs/plans/TEMPLATE.md EXACTLY THEN EnterPlanMode
- After ExitPlanMode write the approved plan to docs/plans/[file].md
- docs/plans/[file].md: Run Linter Against The Plan File And Fix All Issues
- EnterPlanMode with docs/plans/[file].md
- Use TodoList for Tracking
- Use Workflows

--

COMMIT EVERYTHING UNSTAGED AND THEN:

This: Entire Workspace
* Verify that qa:test:coverage passes thresholds. If not, get coverage to passing thresholds or near 100%.

DO NOT weaken assertions, skip errors, or dismiss warnings as "acceptable." Every single diagnostic must be resolved — either fix the code or fix the rule. DO NOT skip ANY branch — trace every if/else, try/catch, ternary, ??, ||. Use exact error codes in assertions.

Steps (MANDATORY, DO NOT SKIP, READ EVERY WORD, FOLLOW EXACTLY):
- Re-invoke the fix-bug skill
- Read CLAUDE.md
- Follow docs/plans/TEMPLATE.md EXACTLY THEN EnterPlanMode
- After ExitPlanMode write the approved plan to docs/plans/[file].md
- docs/plans/[file].md: Run Linter Against The Plan File And Fix All Issues
- EnterPlanMode with docs/plans/[file].md
- Use TodoList for Tracking

READ EVERY WORD AS IF ITS YOUR FIRST TIME. DO NOT ASSUME ANYTHING ASSHOLE.

--

COMMIT EVERYTHING UNSTAGED AND THEN:

This: @/lint

Custom Linter:
  - Implement these rules "_INTEGRATE/linter/.md", provide your explanation of each rule and what you plan to do.

DO NOT weaken assertions, skip errors, or dismiss warnings as "acceptable." Every single diagnostic must be resolved — either fix the code or fix the rule. DO NOT skip ANY branch — trace every if/else, try/catch, ternary, ??, ||. Use exact error codes in assertions.

Steps (MANDATORY, DO NOT SKIP, READ EVERY WORD, FOLLOW EXACTLY):
- Re-invoke the fix-bug skill
- Read CLAUDE.md
- Follow docs/plans/TEMPLATE.md EXACTLY THEN EnterPlanMode
- After ExitPlanMode write the approved plan to docs/plans/[file].md
- docs/plans/[file].md: Run Linter Against The Plan File And Fix All Issues
- EnterPlanMode with docs/plans/[file].md
- Use TodoList for Tracking

- [Prompt 8]
  COMMIT EVERYTHING UNSTAGED AND THEN:

  This: packages/shared/[TARGET_PATH]

  Run ALL SIX QA checks, fix every error, and verify 100% test coverage.

  1. Run ALL SIX checks and collect ALL errors:
    - `pnpm -w run qa:lint 2>&1 | grep "[TARGET_PATH]"` (oxlint)
    - `pnpm -w run qa:lint:custom -- [TARGET_PATH]` (custom lint — WITHOUT --warn-only)
    - `pnpm -w run qa:lint --tools 2>&1` (type-check)
    - `pnpm -r --filter [PACKAGE_NAME] run qa:test 2>&1` (tests)
    - `pnpm -w run qa:format:check 2>&1 | grep "[TARGET_PATH]"` (formatting)
    - `pnpm -r --filter @/lint run qa:test 2>&1` (lint rule tests — all must pass)
    Present ALL errors from ALL SIX checks before proposing fixes.
  2. For EACH error/warning found:
    - Read the source file at the flagged line
    - Read the rule that flagged it at packages/shared/config/tooling/lint/src/rules/
    - Determine: is this a TRUE POSITIVE (real code issue) or FALSE POSITIVE (rule bug)?
    - If TRUE POSITIVE: propose the exact code fix with before/after
    - If FALSE POSITIVE: propose the exact rule fix with before/after (and add to rule tests)
  3. Read the source file and its test file. Trace EVERY branch (if/else, try/catch, ternary, ??, ||, conditional spread). For each branch:
    - Verify a test exists that covers it
    - If missing: add the test with exact assertions (use toBe, not toContain)
    - Verify error paths return exact error codes (e.g., toBe('IO.READ_FAILED'), not toContain('IO'))
  4. Present a detailed changelog with:
    - Every QA error grouped by file with rule ID, line, current code, and exact fix
    - Every missing test branch with the exact test to add
    - Clearly mark which are code fixes vs rule fixes vs test additions
  5. After approval, implement ALL fixes
  6. After implementation, re-run ALL SIX checks and confirm ZERO errors in EACH:
    - `pnpm -w run qa:lint 2>&1 | grep "[TARGET_PATH]"` → 0 errors
    - `pnpm -w run qa:lint:custom -- [TARGET_PATH]` → 0 errors
    - `pnpm -w run qa:lint --tools` → 0 errors
    - `pnpm -r --filter [PACKAGE_NAME] run qa:test` → all pass
    - `pnpm -w run qa:format:check 2>&1 | grep "[TARGET_PATH]"` → 0 errors
    - `pnpm -r --filter @/lint run qa:test` → all pass
    If ANY check has errors, fix them and re-run ALL checks again.
  7. Verify 100% test coverage.

  DO NOT weaken assertions, skip errors, or dismiss warnings as "acceptable." Every single diagnostic must be resolved — either fix the code or fix the rule. DO NOT skip ANY branch — trace every if/else, try/catch, ternary, ??, ||. Use exact error codes in assertions.

  CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present a detailed changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END. Use a TodoList to track and verify each step against approved changelog.

  <REQUIRED, DO NOT SKIP> DO THIS FIRST: RE-READ EVERY WORD AND RE-READ CLAUDE.md AND MEMORY.md AND RE-INVOKE fix-bug SKILL, THIS IS NOT OPTIONAL!!!

- [Prompt 7]
  This: packages/shared/[TARGET_PATH]

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

- [Prompt 6]
  This: 

  Need it to be shared so any product can use it.

  100% Test Coverage For Every File + Verification (Based On TDD) CRITICAL: DO NOT SKIP CODE BUGS OR ISSUES WHERE TESTS FAIL. PRESENT THEM AND WAIT FOR USER INSTRUCTION. DO NOT SKIP ERROR PATHS IN TESTS.

  ADD TO TODO: VERIFY 100% TEST COVERAGE IN EVERY BRANCH IN EVERY FILE. DO NOT SKIP OR IGNORE OR BE A LAZY BITCH.

  CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

- [Prompt 5]
  Convert {COMPONENT} to full Lens compliance. Read docs/prompts/lens-component-conversion.md and follow it exactly. Verify after each Step that you have explicitly followed EVERY WORD.

  CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

- [Prompt 0]
  Convert {COMPONENT} to full Lens compliance. Read docs/prompts/lens-component-conversion.md and follow it exactly. Verify after each Step that you have explicitly followed EVERY WORD.

  CRITICAL: Re-Invoke the fix-bug skill. Read CLAUDE.md. Read MEMORY.md. Present full changelog. VERIFY IMPLEMENTATION THOROUGHLY AGAINST APPROVED CHANGELOG AT THE END.

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
