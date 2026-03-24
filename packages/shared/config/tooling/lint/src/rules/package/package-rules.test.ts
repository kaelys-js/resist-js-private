/**
 * Tests for package.json lint rules.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import type { LintResult, PackageJsonContext } from '../../framework/types.ts';
import requireTsgo from './require-tsgo.ts';
import validTsconfig from './valid-tsconfig.ts';
import requireProjectTest from './require-project-test.ts';
import requireStandardScripts from './require-standard-scripts.ts';
import noRootOnlyScripts from './no-root-only-scripts.ts';
import noTscDependency from './no-tsc-dependency.ts';
import noWorkspaceDep from './no-workspace-dep.ts';
import noHoisedDep from './no-hoisted-dep.ts';
import noPeerDeps from './no-peer-deps.ts';
import validProjectRef from './valid-project-ref.ts';
import noWorkspaceSelfRef from './no-workspace-self-ref.ts';
import noVitestConfig from './no-vitest-config.ts';
import requireSharedConfig from './require-shared-config.ts';

function ctx(overrides: Partial<PackageJsonContext> & { pkg?: Partial<PackageJsonContext['pkg']> } = {}): PackageJsonContext {
  return {
    file: overrides.file ?? '/workspace/packages/shared/test-pkg/package.json',
    pkg: { name: '@/test-pkg', scripts: {}, ...overrides.pkg },
    isRoot: overrides.isRoot ?? false,
  };
}

// require-tsgo
describe('package/require-tsgo', () => {
  it('flags tsc in qa:type-check', () => {
    const results: LintResult[] = requireTsgo.check(ctx({ pkg: { scripts: { 'qa:type-check': 'tsc --noEmit' } } }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/require-tsgo');
  });
  it('passes tsgo', () => {
    const results: LintResult[] = requireTsgo.check(ctx({ pkg: { scripts: { 'qa:type-check': 'tsgo --noEmit' } } }));
    expect(results.length).toBe(0);
  });
  it('passes svelte-check', () => {
    const results: LintResult[] = requireTsgo.check(ctx({ pkg: { scripts: { 'qa:type-check': 'svelte-check --tsconfig ./tsconfig.json' } } }));
    expect(results.length).toBe(0);
  });
  it('passes when no qa:type-check script', () => {
    const results: LintResult[] = requireTsgo.check(ctx({ pkg: { scripts: {} } }));
    expect(results.length).toBe(0);
  });
});

// require-project-test
describe('package/require-project-test', () => {
  it('flags bare vitest run', () => {
    const results: LintResult[] = requireProjectTest.check(ctx({ pkg: { scripts: { 'qa:test': 'vitest run' } } }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/require-project-test');
  });
  it('flags cd .. pattern', () => {
    const results: LintResult[] = requireProjectTest.check(ctx({ pkg: { scripts: { 'qa:test': 'cd ../../../.. && vitest run --project foo' } } }));
    expect(results.length).toBe(1);
  });
  it('passes pnpm -w exec pattern', () => {
    const results: LintResult[] = requireProjectTest.check(ctx({ pkg: { scripts: { 'qa:test': 'pnpm -w exec vitest run --project test-pkg' } } }));
    expect(results.length).toBe(0);
  });
  it('exempts root package', () => {
    const results: LintResult[] = requireProjectTest.check(ctx({ isRoot: true, pkg: { scripts: { 'qa:test': 'vitest run' } } }));
    expect(results.length).toBe(0);
  });
  it('flags bare vitest bench in qa:benchmark', () => {
    const results: LintResult[] = requireProjectTest.check(ctx({ pkg: { scripts: { 'qa:benchmark': 'vitest bench' } } }));
    expect(results.length).toBe(1);
  });
});

// require-standard-scripts
describe('package/require-standard-scripts', () => {
  it('flags missing required scripts', () => {
    const results: LintResult[] = requireStandardScripts.check(ctx({ pkg: { name: '@/test', scripts: {} } }));
    expect(results.length).toBe(5);
    const messages: string[] = results.map((r: LintResult) => r.message);
    expect(messages.some((m: string) => m.includes('clean'))).toBe(true);
    expect(messages.some((m: string) => m.includes('qa:test'))).toBe(true);
    expect(messages.some((m: string) => m.includes('qa:type-check'))).toBe(true);
  });
  it('passes when all scripts present', () => {
    const results: LintResult[] = requireStandardScripts.check(ctx({
      pkg: {
        scripts: {
          clean: 'rm -rf dist',
          'qa:test': 'pnpm -w exec vitest run --project x',
          'qa:test:coverage': 'pnpm -w exec vitest run --project x --coverage',
          'qa:benchmark': 'pnpm -w exec vitest bench --project x',
          'qa:type-check': 'tsgo --noEmit',
        },
      },
    }));
    expect(results.length).toBe(0);
  });
  it('exempts root package', () => {
    const results: LintResult[] = requireStandardScripts.check(ctx({ isRoot: true, pkg: { scripts: {} } }));
    expect(results.length).toBe(0);
  });
});

// no-root-only-scripts
describe('package/no-root-only-scripts', () => {
  it('flags qa:format in sub-package', () => {
    const results: LintResult[] = noRootOnlyScripts.check(ctx({ pkg: { scripts: { 'qa:format': 'biome format' } } }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-root-only-scripts');
  });
  it('flags qa:lint in sub-package', () => {
    const results: LintResult[] = noRootOnlyScripts.check(ctx({ pkg: { scripts: { 'qa:lint': 'oxlint' } } }));
    expect(results.length).toBe(1);
  });
  it('passes root package with qa:format', () => {
    const results: LintResult[] = noRootOnlyScripts.check(ctx({ isRoot: true, pkg: { scripts: { 'qa:format': 'biome format' } } }));
    expect(results.length).toBe(0);
  });
  it('passes sub-package without root-only scripts', () => {
    const results: LintResult[] = noRootOnlyScripts.check(ctx({ pkg: { scripts: { 'qa:test': 'vitest' } } }));
    expect(results.length).toBe(0);
  });
});

// no-tsc-dependency
describe('package/no-tsc-dependency', () => {
  it('flags typescript dep when using tsgo', () => {
    const results: LintResult[] = noTscDependency.check(ctx({
      pkg: { scripts: { 'qa:type-check': 'tsgo --noEmit' }, devDependencies: { typescript: '^5.9.3' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-tsc-dependency');
  });
  it('passes when no typescript dep', () => {
    const results: LintResult[] = noTscDependency.check(ctx({
      pkg: { scripts: { 'qa:type-check': 'tsgo --noEmit' }, devDependencies: {} },
    }));
    expect(results.length).toBe(0);
  });
  it('exempts svelte-check packages', () => {
    const results: LintResult[] = noTscDependency.check(ctx({
      pkg: { scripts: { 'qa:type-check': 'svelte-check --tsconfig ./tsconfig.json' }, devDependencies: { typescript: '^5.9.3' } },
    }));
    expect(results.length).toBe(0);
  });
  it('exempts root', () => {
    const results: LintResult[] = noTscDependency.check(ctx({
      isRoot: true,
      pkg: { devDependencies: { typescript: '^5.9.3' } },
    }));
    expect(results.length).toBe(0);
  });
});

// no-workspace-dep
describe('package/no-workspace-dep', () => {
  it('flags @types/node in sub-package devDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', devDependencies: { '@types/node': '^25.0.0' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-workspace-dep');
    expect(results[0].message).toContain('@types/node');
  });

  it('flags vite in sub-package devDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', devDependencies: { vite: '^7.0.0' } },
    }));
    expect(results.length).toBe(1);
  });

  it('passes when dep is in dependencies (runtime)', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', dependencies: { vite: '^7.0.0' } },
    }));
    expect(results.length).toBe(0);
  });

  it('passes when dep is in peerDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', peerDependencies: { vite: '>=7.0.0' } },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root package', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      isRoot: true,
      pkg: { devDependencies: { '@types/node': '^25.0.0', vite: '^7.0.0' } },
    }));
    expect(results.length).toBe(0);
  });

  it('flags multiple workspace deps', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', devDependencies: { '@types/node': '^25.0.0', vite: '^7.0.0', tsx: '^4.0.0' } },
    }));
    expect(results.length).toBe(3);
  });

  it('passes non-workspace deps', () => {
    const results: LintResult[] = noWorkspaceDep.check(ctx({
      pkg: { name: '@/test', devDependencies: { 'some-tool': '^1.0.0' } },
    }));
    expect(results.length).toBe(0);
  });
});

// no-hoisted-dep
describe('package/no-hoisted-dep', () => {
  it('flags valibot in sub-package dependencies', () => {
    const results: LintResult[] = noHoisedDep.check(ctx({
      pkg: { name: '@/test', dependencies: { valibot: '^1.2.0' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-hoisted-dep');
    expect(results[0].message).toContain('valibot');
  });

  it('flags valibot in sub-package devDependencies', () => {
    const results: LintResult[] = noHoisedDep.check(ctx({
      pkg: { name: '@/test', devDependencies: { valibot: '^1.2.0' } },
    }));
    expect(results.length).toBe(1);
  });

  it('passes when no hoisted deps present', () => {
    const results: LintResult[] = noHoisedDep.check(ctx({
      pkg: { name: '@/test', dependencies: { '@/utils/core': 'workspace:*' } },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noHoisedDep.check(ctx({
      isRoot: true,
      pkg: { dependencies: { valibot: '^1.2.0' } },
    }));
    expect(results.length).toBe(0);
  });
});

// no-peer-deps
describe('package/no-peer-deps', () => {
  it('flags peerDependencies in private package', () => {
    const results: LintResult[] = noPeerDeps.check(ctx({
      pkg: { name: '@/test', private: true, peerDependencies: { vite: '>=7.0.0' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-peer-deps');
    expect(results[0].message).toContain('vite');
  });

  it('passes non-private package with peerDependencies', () => {
    const results: LintResult[] = noPeerDeps.check(ctx({
      pkg: { name: '@/test', peerDependencies: { vite: '>=7.0.0' } },
    }));
    expect(results.length).toBe(0);
  });

  it('passes private package without peerDependencies', () => {
    const results: LintResult[] = noPeerDeps.check(ctx({
      pkg: { name: '@/test', private: true },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noPeerDeps.check(ctx({
      isRoot: true,
      pkg: { private: true, peerDependencies: { svelte: '>=5.0.0' } },
    }));
    expect(results.length).toBe(0);
  });
});

// valid-project-ref
describe('package/valid-project-ref', () => {
  it('passes valid project reference', () => {
    const results: LintResult[] = validProjectRef.check(ctx({
      pkg: { name: '@/test', scripts: { 'qa:test': 'pnpm -w exec vitest run --project utils-core' } },
    }));
    expect(results.length).toBe(0);
  });

  it('flags invalid project reference', () => {
    const results: LintResult[] = validProjectRef.check(ctx({
      pkg: { name: '@/test', scripts: { 'qa:test': 'pnpm -w exec vitest run --project nonexistent-project' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/valid-project-ref');
    expect(results[0].message).toContain('nonexistent-project');
  });

  it('passes scripts without --project', () => {
    const results: LintResult[] = validProjectRef.check(ctx({
      pkg: { name: '@/test', scripts: { 'qa:test': 'echo no tests' } },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = validProjectRef.check(ctx({
      isRoot: true,
      pkg: { scripts: { 'qa:test': 'vitest run' } },
    }));
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/valid-tsconfig
// =============================================================================

describe('package/valid-tsconfig', () => {
  it('passes when tsconfig extends root and includes src', () => {
    const results: LintResult[] = validTsconfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/schemas/common/package.json',
      pkg: { name: '@/schemas/common' },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root package', () => {
    const results: LintResult[] = validTsconfig.check(ctx({
      isRoot: true,
      file: '/Users/coleb/Desktop/webforge/package.json',
      pkg: { name: 'webforge' },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts vscode packages', () => {
    const results: LintResult[] = validTsconfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/extensions/vscode-formatter/package.json',
      pkg: { name: '@resist/vscode-formatter' },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts SvelteKit packages (extends .svelte-kit)', () => {
    const results: LintResult[] = validTsconfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/products/storylyne/editor/package.json',
      pkg: { name: '@storylyne/editor' },
    }));
    expect(results.length).toBe(0);
  });

  it('flags overridden protected compiler options', () => {
    const results: LintResult[] = validTsconfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/config/tooling/lint/package.json',
      pkg: { name: '@/lint' },
    }));
    // @/lint tsconfig has no protected overrides (rootDir and types are fine)
    const protectedResults: LintResult[] = results.filter((r: LintResult) => r.message.includes('protected'));
    expect(protectedResults.length).toBe(0);
  });
});

// =============================================================================
// package/no-workspace-self-ref
// =============================================================================

describe('package/no-workspace-self-ref', () => {
  it('flags workspace:* in dependencies', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      pkg: { name: '@/test', dependencies: { '@/schemas/common': 'workspace:*' } },
    }));
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('package/no-workspace-self-ref');
    expect(results[0].message).toContain('@/schemas/common');
  });

  it('flags workspace:* in devDependencies', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      pkg: { name: '@/test', devDependencies: { '@/test-presets': 'workspace:*' } },
    }));
    expect(results.length).toBe(1);
  });

  it('flags multiple workspace:* entries', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      pkg: {
        name: '@/test',
        dependencies: { '@/schemas/common': 'workspace:*', '@/utils/core': 'workspace:*' },
        devDependencies: { '@/test-presets': 'workspace:*' },
      },
    }));
    expect(results.length).toBe(3);
  });

  it('passes non-workspace deps', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      pkg: { name: '@/test', dependencies: { 'some-pkg': '^1.0.0' } },
    }));
    expect(results.length).toBe(0);
  });

  it('passes empty deps', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      pkg: { name: '@/test' },
    }));
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(ctx({
      isRoot: true,
      pkg: { dependencies: { '@/schemas/common': 'workspace:*' } },
    }));
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/no-vitest-config
// =============================================================================

describe('package/no-vitest-config', () => {
  it('flags sub-package with vitest.config.ts', () => {
    const results: LintResult[] = noVitestConfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/utils/cli/package.json',
      pkg: { name: '@/cli' },
    }));
    // @/cli is exempt
    expect(results.length).toBe(0);
  });

  it('passes for root package', () => {
    const results: LintResult[] = noVitestConfig.check(ctx({
      isRoot: true,
    }));
    expect(results.length).toBe(0);
  });

  it('passes for package without vitest.config.ts', () => {
    const results: LintResult[] = noVitestConfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/schemas/common/package.json',
      pkg: { name: '@/schemas/common' },
    }));
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/require-shared-config
// =============================================================================

describe('package/require-shared-config', () => {
  it('passes for package with correct svelte.config.ts', () => {
    const results: LintResult[] = requireSharedConfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/products/storylyne/editor/package.json',
      pkg: { name: '@storylyne/editor' },
    }));
    const svelteErrors: LintResult[] = results.filter((r: LintResult): boolean => r.message.includes('svelte.config'));
    expect(svelteErrors.length).toBe(0);
  });

  it('passes for root package', () => {
    const results: LintResult[] = requireSharedConfig.check(ctx({
      isRoot: true,
    }));
    expect(results.length).toBe(0);
  });

  it('passes for package without config files', () => {
    const results: LintResult[] = requireSharedConfig.check(ctx({
      file: '/Users/coleb/Desktop/webforge/packages/shared/schemas/common/package.json',
      pkg: { name: '@/schemas/common' },
    }));
    expect(results.length).toBe(0);
  });
});
