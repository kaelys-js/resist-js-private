/**
 * Trivial fixture file for cli-run-linter-{4,5}.test.ts workspace-rules tests.
 *
 * The tests just need a directory with at least one lintable TS file to
 * exercise the workspace-rule plumbing — they don't inspect this content.
 * Pointing the tests at this fixture instead of `framework/` (50+ files)
 * cuts test runtime from ~7-9s to sub-second and eliminates the
 * pre-push timeout flake.
 *
 * @module
 */

export const fixtureMarker: string = 'tiny-dir';
