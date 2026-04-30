/**
 * Tests for Svelte 5 configuration lint rules.
 *
 * Uses oxc-parser to parse fixture config code and verifies each rule
 * produces the expected diagnostics.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import requireAdapter from './require-adapter.ts';
import cloudflareAdapterSettings from './cloudflare-adapter-settings.ts';
import staticAdapterForCapacitor from './static-adapter-for-capacitor.ts';
import noNodeAdapterCloudflare from './no-node-adapter-cloudflare.ts';
import kitAliasConsistency from './kit-alias-consistency.ts';
import requireRunesMode from './require-runes-mode.ts';
import noDeprecatedOptions from './no-deprecated-options.ts';
import prerenderConfig from './prerender-config.ts';
import cspHeaders from './csp-headers.ts';
import envPrefixConsistency from './env-prefix-consistency.ts';
import outputDirectory from './output-directory.ts';
import versionSkewHandling from './version-skew-handling.ts';
import trailingSlashConsistency from './trailing-slash-consistency.ts';
import noInlinePreprocess from './no-inline-preprocess.ts';
import viteOptimizeDeps from './vite-optimize-deps.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param rule - The rule to test
 * @param code - TypeScript source code
 * @param filename - File name (determines which rules apply)
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string, filename?: string): Promise<LintResult[]> {
  return runTypeScriptRules(filename ?? '/project/svelte.config.ts', code, [rule]);
}

// =============================================================================
// _config-ast helpers (tested indirectly through rules)
// =============================================================================

// =============================================================================
// svelte5-config/require-adapter
// =============================================================================

describe('svelte5-config/require-adapter', () => {
  it('reports missing adapter in kit config', async () => {
    const code: string = `export default { kit: {} };`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('missing adapter');
  });

  it('reports adapter set to undefined', async () => {
    const code: string = `export default { kit: { adapter: undefined } };`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('missing adapter');
  });

  it('passes when adapter is a function call', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(0);
  });

  it('passes when no kit property', async () => {
    const code: string = `export default { compilerOptions: { runes: true } };`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(0);
  });

  it('passes when kit is not an object', async () => {
    const code: string = `export default { kit: getConfig() };`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = { kit: {} }; export { config };`;
    const results: LintResult[] = await lint(requireAdapter, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/cloudflare-adapter-settings
// =============================================================================

describe('svelte5-config/cloudflare-adapter-settings', () => {
  it('warns when cloudflare adapter has no routes config', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('routes config');
  });

  it('warns when cloudflare adapter has empty routes', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter({ routes: {} }) } };
`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(1);
  });

  it('passes when cloudflare adapter has routes config', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter({ routes: { include: ['/*'] } }) } };
`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(0);
  });

  it('passes for cloudflare-workers adapter (uses wrangler config)', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare-workers';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-cloudflare adapter', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-node';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(0);
  });

  it('passes when no adapter import', async () => {
    const code: string = `export default { kit: { adapter: myAdapter() } };`;
    const results: LintResult[] = await lint(cloudflareAdapterSettings, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/static-adapter-for-capacitor
// =============================================================================

describe('svelte5-config/static-adapter-for-capacitor', () => {
  // Note: Cross-file rules depend on filesystem state. Since test files don't
  // have companion capacitor.config.ts files, these rules should return [].

  it('passes when no capacitor config exists', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(staticAdapterForCapacitor, code);
    expect(results.length).toBe(0);
  });

  it('passes when no adapter import', async () => {
    const code: string = `export default { kit: {} };`;
    const results: LintResult[] = await lint(staticAdapterForCapacitor, code);
    expect(results.length).toBe(0);
  });

  it('passes for static adapter (regardless of capacitor)', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(staticAdapterForCapacitor, code);
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(staticAdapterForCapacitor.id).toBe('svelte5-config/static-adapter-for-capacitor');
    expect(staticAdapterForCapacitor.patterns).toContain('**/svelte.config.*');
  });
});

// =============================================================================
// svelte5-config/no-node-adapter-cloudflare
// =============================================================================

describe('svelte5-config/no-node-adapter-cloudflare', () => {
  it('passes when no wrangler config exists', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-node';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(noNodeAdapterCloudflare, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-node adapter', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(noNodeAdapterCloudflare, code);
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(noNodeAdapterCloudflare.id).toBe('svelte5-config/no-node-adapter-cloudflare');
    expect(noNodeAdapterCloudflare.patterns).toContain('**/svelte.config.*');
  });
});

// =============================================================================
// svelte5-config/kit-alias-consistency
// =============================================================================

describe('svelte5-config/kit-alias-consistency', () => {
  it('passes when no kit.alias is set', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(kitAliasConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = {};`;
    const results: LintResult[] = await lint(kitAliasConsistency, code);
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(kitAliasConsistency.id).toBe('svelte5-config/kit-alias-consistency');
    expect(kitAliasConsistency.patterns).toContain('**/svelte.config.*');
  });
});

// =============================================================================
// svelte5-config/require-runes-mode
// =============================================================================

describe('svelte5-config/require-runes-mode', () => {
  it('warns when runes is not set', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(requireRunesMode, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('runes: true');
  });

  it('warns when runes is false', async () => {
    const code: string = `export default { compilerOptions: { runes: false } };`;
    const results: LintResult[] = await lint(requireRunesMode, code);
    expect(results.length).toBe(1);
  });

  it('passes when runes is true', async () => {
    const code: string = `export default { compilerOptions: { runes: true } };`;
    const results: LintResult[] = await lint(requireRunesMode, code);
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = {};`;
    const results: LintResult[] = await lint(requireRunesMode, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/no-deprecated-options
// =============================================================================

describe('svelte5-config/no-deprecated-options', () => {
  it('reports deprecated compilerOptions.hydratable', async () => {
    const code: string = `export default { compilerOptions: { hydratable: true } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('hydratable');
    expect(results[0]?.message).toContain('Always true in Svelte 5');
  });

  it('reports deprecated compilerOptions.immutable', async () => {
    const code: string = `export default { compilerOptions: { immutable: true } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('immutable');
  });

  it('reports deprecated compilerOptions.accessors', async () => {
    const code: string = `export default { compilerOptions: { accessors: true } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('accessors');
  });

  it('reports deprecated compilerOptions.legacy', async () => {
    const code: string = `export default { compilerOptions: { legacy: true } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('legacy');
  });

  it('reports deprecated kit.vite', async () => {
    const code: string = `export default { kit: { vite: { plugins: [] } } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('kit.vite');
  });

  it('reports deprecated kit.package', async () => {
    const code: string = `export default { kit: { package: { dir: 'pkg' } } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('kit.package');
  });

  it('reports multiple deprecated options', async () => {
    const code: string = `export default { compilerOptions: { hydratable: true, immutable: true } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(2);
  });

  it('passes with valid Svelte 5 config', async () => {
    const code: string = `export default { compilerOptions: { runes: true }, kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = {};`;
    const results: LintResult[] = await lint(noDeprecatedOptions, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/prerender-config
// =============================================================================

describe('svelte5-config/prerender-config', () => {
  it('warns when static adapter has no prerender config', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(prerenderConfig, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('prerender');
  });

  it('passes when static adapter has prerender config', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter(), prerender: { entries: ['*'] } } };
`;
    const results: LintResult[] = await lint(prerenderConfig, code);
    expect(results.length).toBe(0);
  });

  it('passes for non-static adapter', async () => {
    const code: string = `
import adapter from '@sveltejs/adapter-cloudflare';
export default { kit: { adapter: adapter() } };
`;
    const results: LintResult[] = await lint(prerenderConfig, code);
    expect(results.length).toBe(0);
  });

  it('passes when no adapter import', async () => {
    const code: string = `export default { kit: {} };`;
    const results: LintResult[] = await lint(prerenderConfig, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/csp-headers
// =============================================================================

describe('svelte5-config/csp-headers', () => {
  it('warns when kit has no csp config', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(cspHeaders, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('CSP');
  });

  it('passes when kit has csp config', async () => {
    const code: string = `export default { kit: { adapter: adapter(), csp: { directives: {} } } };`;
    const results: LintResult[] = await lint(cspHeaders, code);
    expect(results.length).toBe(0);
  });

  it('passes when no kit property', async () => {
    const code: string = `export default { compilerOptions: { runes: true } };`;
    const results: LintResult[] = await lint(cspHeaders, code);
    expect(results.length).toBe(0);
  });

  it('passes when kit is not an object', async () => {
    const code: string = `export default { kit: getKit() };`;
    const results: LintResult[] = await lint(cspHeaders, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/env-prefix-consistency
// =============================================================================

describe('svelte5-config/env-prefix-consistency', () => {
  it('reports empty publicPrefix', async () => {
    const code: string = `export default { kit: { env: { publicPrefix: '' } } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('Empty publicPrefix');
  });

  it('reports wrong framework prefix (NEXT_PUBLIC_)', async () => {
    const code: string = `export default { kit: { env: { publicPrefix: 'NEXT_PUBLIC_' } } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('Non-standard');
  });

  it('reports matching public and private prefix', async () => {
    const code: string = `export default { kit: { env: { publicPrefix: 'APP_', privatePrefix: 'APP_' } } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('both');
  });

  it('passes with default PUBLIC_ prefix', async () => {
    const code: string = `export default { kit: { env: { publicPrefix: 'PUBLIC_' } } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when no env config', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when env is not an object', async () => {
    const code: string = `export default { kit: { env: getEnv() } };`;
    const results: LintResult[] = await lint(envPrefixConsistency, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/output-directory
// =============================================================================

describe('svelte5-config/output-directory', () => {
  it('reports outDir pointing to src', async () => {
    const code: string = `export default { kit: { outDir: './src' } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('./src');
  });

  it('reports outDir pointing to root', async () => {
    const code: string = `export default { kit: { outDir: '.' } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(1);
  });

  it('reports adapter pages pointing to root', async () => {
    const code: string = `export default { kit: { adapter: adapter({ pages: '.', assets: '.' }) } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(2);
  });

  it('passes with safe outDir', async () => {
    const code: string = `export default { kit: { outDir: '.svelte-kit' } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(0);
  });

  it('passes with safe adapter pages', async () => {
    const code: string = `export default { kit: { adapter: adapter({ pages: 'build', assets: 'build' }) } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(0);
  });

  it('passes when no outDir set', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = {};`;
    const results: LintResult[] = await lint(outputDirectory, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/version-skew-handling
// =============================================================================

describe('svelte5-config/version-skew-handling', () => {
  it('warns when no version config', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(versionSkewHandling, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('version config');
  });

  it('warns when version has no pollInterval', async () => {
    const code: string = `export default { kit: { version: { name: 'v1' } } };`;
    const results: LintResult[] = await lint(versionSkewHandling, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('pollInterval');
  });

  it('passes when version has pollInterval', async () => {
    const code: string = `export default { kit: { version: { name: 'v1', pollInterval: 60000 } } };`;
    const results: LintResult[] = await lint(versionSkewHandling, code);
    expect(results.length).toBe(0);
  });

  it('passes when no kit property', async () => {
    const code: string = `export default { compilerOptions: {} };`;
    const results: LintResult[] = await lint(versionSkewHandling, code);
    expect(results.length).toBe(0);
  });

  it('passes when kit is not an object', async () => {
    const code: string = `export default { kit: getKit() };`;
    const results: LintResult[] = await lint(versionSkewHandling, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/trailing-slash-consistency
// =============================================================================

describe('svelte5-config/trailing-slash-consistency', () => {
  it('warns when trailingSlash is not set', async () => {
    const code: string = `export default { kit: { adapter: adapter() } };`;
    const results: LintResult[] = await lint(trailingSlashConsistency, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('Trailing slash');
  });

  it('passes when trailingSlash is set to never', async () => {
    const code: string = `export default { kit: { trailingSlash: 'never' } };`;
    const results: LintResult[] = await lint(trailingSlashConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when trailingSlash is set to always', async () => {
    const code: string = `export default { kit: { trailingSlash: 'always' } };`;
    const results: LintResult[] = await lint(trailingSlashConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when trailingSlash is set to ignore', async () => {
    const code: string = `export default { kit: { trailingSlash: 'ignore' } };`;
    const results: LintResult[] = await lint(trailingSlashConsistency, code);
    expect(results.length).toBe(0);
  });

  it('passes when no kit property', async () => {
    const code: string = `export default { compilerOptions: {} };`;
    const results: LintResult[] = await lint(trailingSlashConsistency, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/no-inline-preprocess
// =============================================================================

describe('svelte5-config/no-inline-preprocess', () => {
  it('warns on inline preprocessor object with markup hook', async () => {
    const code: string = `export default {
  preprocess: [
    {
      markup: ({ content }) => ({ code: content }),
    },
  ],
};`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('inline preprocessor');
  });

  it('warns on inline preprocessor with script hook', async () => {
    const code: string = `export default {
  preprocess: [
    {
      script: ({ content }) => ({ code: content }),
    },
  ],
};`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(1);
  });

  it('warns on single inline preprocessor object (not array)', async () => {
    const code: string = `export default {
  preprocess: {
    markup: ({ content }) => ({ code: content }),
  },
};`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(1);
  });

  it('passes when preprocess is a function call', async () => {
    const code: string = `
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess() };
`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(0);
  });

  it('passes when preprocess array has only function calls', async () => {
    const code: string = `
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: [vitePreprocess()] };
`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(0);
  });

  it('passes when no preprocess property', async () => {
    const code: string = `export default { kit: {} };`;
    const results: LintResult[] = await lint(noInlinePreprocess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5-config/vite-optimizeDeps
// =============================================================================

describe('svelte5-config/vite-optimizeDeps', () => {
  it('warns when svelte is excluded from optimizeDeps', async () => {
    const code: string = `export default { optimizeDeps: { exclude: ['svelte'] } };`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('svelte');
  });

  it('warns when @sveltejs/kit is excluded', async () => {
    const code: string = `export default { optimizeDeps: { exclude: ['@sveltejs/kit'] } };`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('@sveltejs/kit');
  });

  it('warns on multiple excluded svelte packages', async () => {
    const code: string = `export default { optimizeDeps: { exclude: ['svelte', '@sveltejs/kit'] } };`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(2);
  });

  it('passes when non-svelte packages are excluded', async () => {
    const code: string = `export default { optimizeDeps: { exclude: ['lodash'] } };`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(0);
  });

  it('passes when no optimizeDeps.exclude', async () => {
    const code: string = `export default { optimizeDeps: { include: ['esm-env'] } };`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(0);
  });

  it('passes when no default export', async () => {
    const code: string = `const config = {};`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(0);
  });

  it('handles defineConfig wrapper', async () => {
    const code: string = `
import { defineConfig } from 'vite';
export default defineConfig({ optimizeDeps: { exclude: ['svelte'] } });
`;
    const results: LintResult[] = await lint(viteOptimizeDeps, code, '/project/vite.config.ts');
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// Rule metadata validation
// =============================================================================

describe('rule metadata', () => {
  const allRules: TypeScriptRule[] = [
    requireAdapter,
    cloudflareAdapterSettings,
    staticAdapterForCapacitor,
    noNodeAdapterCloudflare,
    kitAliasConsistency,
    requireRunesMode,
    noDeprecatedOptions,
    prerenderConfig,
    cspHeaders,
    envPrefixConsistency,
    outputDirectory,
    versionSkewHandling,
    trailingSlashConsistency,
    noInlinePreprocess,
    viteOptimizeDeps,
  ];

  it('all rules have unique IDs', () => {
    const ids: string[] = allRules.map((r: TypeScriptRule): string => r.id);
    const uniqueIds: Set<string> = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all rules have svelte5-config category', () => {
    for (const rule of allRules) {
      expect(rule.categories).toContain('svelte5-config');
    }
  });

  it('all rules have descriptions', () => {
    for (const rule of allRules) {
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });

  it('all rules have patterns', () => {
    for (const rule of allRules) {
      expect(rule.patterns.length).toBeGreaterThan(0);
    }
  });

  it('svelte config rules target svelte.config.*', () => {
    const svelteRules: TypeScriptRule[] = allRules.filter(
      (r: TypeScriptRule): boolean => r.id !== 'svelte5-config/vite-optimizeDeps',
    );

    for (const rule of svelteRules) {
      expect(rule.patterns).toContain('**/svelte.config.*');
    }
  });

  it('vite rule targets vite.config.*', () => {
    expect(viteOptimizeDeps.patterns).toContain('**/vite.config.*');
  });
});
