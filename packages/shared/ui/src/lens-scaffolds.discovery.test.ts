/**
 * Discovery test: statically imports every `src/<name>/lens.ts` scaffold and
 * asserts the shape of its exported `meta` object.
 *
 * Purpose:
 *   There are ~863 generated `lens.ts` scaffolds under `packages/shared/ui/src/<name>/`.
 *   Each file exports a single `meta: LensMeta` object. None of them are imported
 *   by any feature test, so without this file they contribute a pile of uncovered
 *   statements to the coverage report.
 *
 *   This test uses `import.meta.glob(..., { eager: true })` to import every
 *   matching file at module evaluation time, which both executes the export
 *   (covering the statement) and gives us a concrete object to validate.
 *
 * What is asserted (per scaffold, exact values):
 *   - `meta` is a plain object (not `null`, not an array).
 *   - `meta.category` is a non-empty `string`.
 *   - `meta.tags` is an array with length >= 1 and every element is a non-empty `string`.
 *   - `meta.description` is a non-empty `string`.
 *
 * The glob pattern deliberately matches only direct children of `src/`, so it
 * excludes `src/lens/` analyser sources and any nested test fixtures.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';

// Eager glob: every `.ts` exporting `meta` under `src/<kebab>/lens.ts`.
// Uses a relative path because this file lives at `src/lens-scaffolds.discovery.test.ts`.
// Three scaffolds import `.svelte` components and must be tested in the
// `ui-svelte` project (which has the svelte plugin). They are covered by
// `lens-scaffolds.discovery.svelte.test.ts`.
const modules = import.meta.glob<{ meta?: unknown }>(
  ['./*/lens.ts', '!./island/lens.ts', '!./language-switcher/lens.ts', '!./theme-switcher/lens.ts'],
  { eager: true },
);

/**
 * Lexicographic comparator for `[path, module]` entries — kept named so the
 * outer expression stays free of nested ternaries.
 *
 * @param entryA - First scaffold entry; only the `[0]` path is compared.
 * @param entryB - Second scaffold entry; only the `[0]` path is compared.
 * @returns -1, 0, or 1 in standard `Array#sort` semantics.
 */
function compareScaffoldEntries(
  entryA: readonly [string, { meta?: unknown }],
  entryB: readonly [string, { meta?: unknown }],
): number {
  const [a] = entryA;
  const [b] = entryB;
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/** Stable, sorted list of `[path, module]` pairs for deterministic iteration. */
const scaffoldEntries: ReadonlyArray<readonly [string, { meta?: unknown }]> =
  Object.entries(modules).toSorted(compareScaffoldEntries);

describe('lens.ts scaffold discovery', () => {
  it('discovers at least 800 scaffolds', () => {
    // Guard against a silent empty glob (misconfigured Vite / moved files).
    expect(scaffoldEntries.length).toBeGreaterThanOrEqual(800);
  });

  it('every scaffold path matches the expected naming convention', () => {
    for (const [path] of scaffoldEntries) {
      // Every entry looks like `./<kebab-name>/lens.ts`.
      expect(path).toMatch(/^\.\/[a-z][a-z0-9-]*\/lens\.ts$/);
    }
  });

  describe.each(scaffoldEntries)('%s', (path: string, mod: { meta?: unknown }) => {
    it('exports a plain object as `meta`', () => {
      expect(mod.meta).toBeDefined();
      expect(typeof mod.meta).toBe('object');
      expect(mod.meta).not.toBeNull();
      expect(Array.isArray(mod.meta)).toBe(false);
    });

    it('`meta.category` is a non-empty string', () => {
      const meta = mod.meta as { category?: unknown };
      expect(typeof meta.category).toBe('string');
      expect((meta.category as string).length).toBeGreaterThan(0);
    });

    it('`meta.tags` is a non-empty array of non-empty strings', () => {
      const meta = mod.meta as { tags?: unknown };
      expect(Array.isArray(meta.tags)).toBe(true);
      const tags = meta.tags as unknown[];
      expect(tags.length).toBeGreaterThanOrEqual(1);
      for (const tag of tags) {
        expect(typeof tag).toBe('string');
        expect((tag as string).length).toBeGreaterThan(0);
      }
    });

    it('`meta.description` is a non-empty string', () => {
      const meta = mod.meta as { description?: unknown };
      expect(typeof meta.description).toBe('string');
      expect((meta.description as string).length).toBeGreaterThan(0);
    });
  });
});
