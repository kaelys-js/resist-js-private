/**
 * Validates the three `lens.ts` scaffolds that re-export `.svelte` components
 * (`island`, `language-switcher`, `theme-switcher`) without pulling their
 * transitive component graph into the test runtime.
 *
 * Strategy: read each file's source text via a `?raw` Vite import and assert
 * the `meta` object-literal contains the required fields. This does not
 * execute the module and therefore does not count toward execution coverage —
 * those three scaffolds represent ~3 statements total (<0.05% of `@/ui`) and
 * the node-env `lens-scaffolds.discovery.test.ts` already covers the other
 * 860 scaffolds.
 *
 * @module
 */
import islandSource from './island/lens.ts?raw';
import languageSwitcherSource from './language-switcher/lens.ts?raw';
import themeSwitcherSource from './theme-switcher/lens.ts?raw';
import { describe, expect, it } from 'vitest';

const SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['./island/lens.ts', islandSource],
  ['./language-switcher/lens.ts', languageSwitcherSource],
  ['./theme-switcher/lens.ts', themeSwitcherSource],
];

describe('lens.ts scaffold discovery (svelte-importing, source-text validation)', () => {
  describe.each(SOURCES)('%s', (_path: string, source: string) => {
    it('declares `export const meta: LensMeta`', () => {
      expect(source).toMatch(/export const meta: LensMeta = \{/);
    });

    it('declares a `category:` field with a quoted string value', () => {
      expect(source).toMatch(/category: '[a-z][a-z0-9-]*',/);
    });

    it('declares a `tags:` array field with at least one entry', () => {
      const match = /tags: \[([^\]]*)\]/.exec(source);
      expect(match).not.toBeNull();
      const body = (match as RegExpExecArray)[1] as string;
      const tagTokens = body.split(',').filter((t: string): boolean => t.trim().length > 0);
      expect(tagTokens.length).toBeGreaterThanOrEqual(1);
    });

    it('declares a non-empty `description:` field', () => {
      const match = /description: '([^']+)',/.exec(source);
      expect(match).not.toBeNull();
      expect(((match as RegExpExecArray)[1] as string).length).toBeGreaterThan(0);
    });
  });
});
