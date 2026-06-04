/**
 * Edge-case tests for defensive branches in vite-plugin-template-html.
 *
 * Line 233 (`!errorIdPrefixResult.ok`) in resolveErrorHtml is unreachable
 * through normal code paths because ErrorHtmlConfigSchema validation ensures
 * locale.errorId is always a valid string. This test file uses vi.mock to
 * intercept the ok() function from the result module and force the error.
 *
 * Must be a separate file because vi.mock is module-scoped and hoisted.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest';
import type { Name, Path, CssFontFamily, CssFontWeight, LocaleString } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import type * as ResultModule from '@/schemas/result/result';
import type { ErrorHtmlConfig } from './vite-plugin-template-html.js';

// ---------------------------------------------------------------------------
// Mock the ok() function from the result module with a call counter.
// safeParse (from @/utils/result/safe) does NOT use ok() internally —
// it constructs Results directly via _okResult. So this mock only
// affects ok() calls inside the source module (generateFontFaceCss,
// deriveErrorIdPrefix, resolveErrorHtml, resolveAppHtml).
// ---------------------------------------------------------------------------

const state = vi.hoisted(() => ({ okCallCount: 0 }));

vi.mock('@/schemas/result/result', async (importOriginal) => {
  const original = await importOriginal<typeof ResultModule>();

  return {
    ...original,
    ok: (...args: unknown[]): Result<unknown> => {
      state.okCallCount++;
      // 1st ok call: generateFontFaceCss → ok(CssStrSchema, cssString) → succeed
      // 2nd ok call: deriveErrorIdPrefix → ok(v.string(), prefix) → FAIL
      if (state.okCallCount === 2) {
        return {
          ok: false,
          data: null,
          error: { code: 'FORCED_FAIL', message: 'forced deriveErrorIdPrefix failure' },
        } as unknown as Result<never>;
      }
      return (original.ok as (...a: unknown[]) => Result<unknown>)(...args);
    },
  };
});

const { resolveErrorHtml } = await import('./vite-plugin-template-html.ts');

// =============================================================================
// Test
// =============================================================================

describe('resolveErrorHtml: deriveErrorIdPrefix error branch (line 233)', () => {
  it('returns error when ok() fails inside deriveErrorIdPrefix', () => {
    state.okCallCount = 0;

    const config: ErrorHtmlConfig = {
      appName: 'TestApp' as Name,
      fontFamilies: "'Inter', sans-serif" as CssFontFamily,
      fontFaces: [
        {
          family: 'Inter' as Name,
          style: 'normal' as const,
          weight: '400' as CssFontWeight,
          src: '/fonts/inter.woff2',
        },
      ],
      templatePath: '/tmp/test.html' as Path,
      locale: {
        serverError: 'Error' as LocaleString,
        serverErrorDescription: 'Desc' as LocaleString,
        goHome: 'Home' as LocaleString,
        copied: 'Copied' as LocaleString,
        copyFailed: 'Failed' as LocaleString,
        copyErrorId: 'Copy ID' as LocaleString,
        errorId: 'Reference: {id}' as LocaleString,
      },
    };

    const result = resolveErrorHtml('{{APP_NAME}} template', config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toHaveProperty('code', 'FORCED_FAIL');
    }
  });
});
