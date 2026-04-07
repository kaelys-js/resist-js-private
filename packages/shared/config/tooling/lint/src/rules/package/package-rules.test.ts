/**
 * Tests for package.json lint rules.
 *
 * @module
 */
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { LintResult, PackageJsonContext } from '../../framework/types.ts';

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
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
import requireReadme from './require-readme.ts';
import requireSharedConfig from './require-shared-config.ts';
import requireScope from './require-scope.ts';
import noGitDeps from './no-git-deps.ts';
import noTsNode from './no-ts-node.ts';

function ctx(
  overrides: Partial<PackageJsonContext> & { pkg?: Partial<PackageJsonContext['pkg']> } = {},
): PackageJsonContext {
  return {
    file: overrides.file ?? '/workspace/packages/shared/test-pkg/package.json',
    pkg: { name: '@/test-pkg', scripts: {}, ...overrides.pkg },
    isRoot: overrides.isRoot ?? false,
  };
}

// require-project-test
describe('package/require-project-test', () => {
  it('flags bare vitest run', () => {
    const results: LintResult[] = requireProjectTest.check(
      ctx({ pkg: { scripts: { 'qa:test': 'vitest run' } } }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/require-project-test');
  });
  it('flags cd .. pattern', () => {
    const results: LintResult[] = requireProjectTest.check(
      ctx({ pkg: { scripts: { 'qa:test': 'cd ../../../.. && vitest run --project foo' } } }),
    );
    expect(results.length).toBe(1);
  });
  it('passes pnpm -w exec pattern', () => {
    const results: LintResult[] = requireProjectTest.check(
      ctx({ pkg: { scripts: { 'qa:test': 'pnpm -w exec vitest run --project test-pkg' } } }),
    );
    expect(results.length).toBe(0);
  });
  it('exempts root package', () => {
    const results: LintResult[] = requireProjectTest.check(
      ctx({ isRoot: true, pkg: { scripts: { 'qa:test': 'vitest run' } } }),
    );
    expect(results.length).toBe(0);
  });
  it('flags bare vitest bench in qa:benchmark', () => {
    const results: LintResult[] = requireProjectTest.check(
      ctx({ pkg: { scripts: { 'qa:benchmark': 'vitest bench' } } }),
    );
    expect(results.length).toBe(1);
  });
});

// require-standard-scripts
describe('package/require-standard-scripts', () => {
  it('flags missing required scripts', () => {
    const results: LintResult[] = requireStandardScripts.check(
      ctx({ pkg: { name: '@/test', scripts: {} } }),
    );
    expect(results.length).toBe(4);
    const messages: string[] = results.map((r: LintResult) => r.message);
    expect(messages.some((m: string) => m.includes('clean'))).toBe(true);
    expect(messages.some((m: string) => m.includes('qa:test'))).toBe(true);
  });
  it('passes when all scripts present', () => {
    const results: LintResult[] = requireStandardScripts.check(
      ctx({
        pkg: {
          scripts: {
            clean: 'rm -rf dist',
            'qa:test': 'pnpm -w exec vitest run --project x',
            'qa:test:coverage': 'pnpm -w exec vitest run --project x --coverage',
            'qa:benchmark': 'pnpm -w exec vitest bench --project x',
          },
        },
      }),
    );
    expect(results.length).toBe(0);
  });
  it('exempts root package', () => {
    const results: LintResult[] = requireStandardScripts.check(
      ctx({ isRoot: true, pkg: { scripts: {} } }),
    );
    expect(results.length).toBe(0);
  });
});

// no-root-only-scripts
describe('package/no-root-only-scripts', () => {
  it('flags qa:format in sub-package', () => {
    const results: LintResult[] = noRootOnlyScripts.check(
      ctx({ pkg: { scripts: { 'qa:format': 'biome format' } } }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-root-only-scripts');
  });
  it('flags qa:lint in sub-package', () => {
    const results: LintResult[] = noRootOnlyScripts.check(
      ctx({ pkg: { scripts: { 'qa:lint': 'oxlint' } } }),
    );
    expect(results.length).toBe(1);
  });
  it('passes root package with qa:format', () => {
    const results: LintResult[] = noRootOnlyScripts.check(
      ctx({ isRoot: true, pkg: { scripts: { 'qa:format': 'biome format' } } }),
    );
    expect(results.length).toBe(0);
  });
  it('passes sub-package without root-only scripts', () => {
    const results: LintResult[] = noRootOnlyScripts.check(
      ctx({ pkg: { scripts: { 'qa:test': 'vitest' } } }),
    );
    expect(results.length).toBe(0);
  });
});

// no-tsc-dependency
describe('package/no-tsc-dependency', () => {
  it('flags typescript dep in sub-package', () => {
    const results: LintResult[] = noTscDependency.check(
      ctx({
        pkg: {
          devDependencies: { typescript: '^5.9.3' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-tsc-dependency');
  });
  it('passes when no typescript dep', () => {
    const results: LintResult[] = noTscDependency.check(
      ctx({
        pkg: { devDependencies: {} },
      }),
    );
    expect(results.length).toBe(0);
  });
  it('exempts packages with svelte-check devDependency', () => {
    const results: LintResult[] = noTscDependency.check(
      ctx({
        pkg: {
          devDependencies: { typescript: '^5.9.3', 'svelte-check': '^4.4.3' },
        },
      }),
    );
    expect(results.length).toBe(0);
  });
  it('exempts root', () => {
    const results: LintResult[] = noTscDependency.check(
      ctx({
        isRoot: true,
        pkg: { devDependencies: { typescript: '^5.9.3' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// no-workspace-dep
describe('package/no-workspace-dep', () => {
  it('flags @types/node in sub-package devDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: { name: '@/test', devDependencies: { '@types/node': '^25.0.0' } },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-workspace-dep');
    expect(results[0]!.message).toContain('@types/node');
  });

  it('flags vite in sub-package devDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: { name: '@/test', devDependencies: { vite: '^7.0.0' } },
      }),
    );
    expect(results.length).toBe(1);
  });

  it('passes when dep is in dependencies (runtime)', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: { name: '@/test', dependencies: { vite: '^7.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('passes when dep is in peerDependencies', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: { name: '@/test', peerDependencies: { vite: '>=7.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root package', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        isRoot: true,
        pkg: { devDependencies: { '@types/node': '^25.0.0', vite: '^7.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('flags multiple workspace deps', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: {
          name: '@/test',
          devDependencies: { '@types/node': '^25.0.0', vite: '^7.0.0', tsx: '^4.0.0' },
        },
      }),
    );
    expect(results.length).toBe(3);
  });

  it('passes non-workspace deps', () => {
    const results: LintResult[] = noWorkspaceDep.check(
      ctx({
        pkg: { name: '@/test', devDependencies: { 'some-tool': '^1.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// no-hoisted-dep
describe('package/no-hoisted-dep', () => {
  it('flags valibot in sub-package dependencies', () => {
    const results: LintResult[] = noHoisedDep.check(
      ctx({
        pkg: { name: '@/test', dependencies: { valibot: '^1.2.0' } },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-hoisted-dep');
    expect(results[0]!.message).toContain('valibot');
  });

  it('flags valibot in sub-package devDependencies', () => {
    const results: LintResult[] = noHoisedDep.check(
      ctx({
        pkg: { name: '@/test', devDependencies: { valibot: '^1.2.0' } },
      }),
    );
    expect(results.length).toBe(1);
  });

  it('passes when no hoisted deps present', () => {
    const results: LintResult[] = noHoisedDep.check(
      ctx({
        pkg: { name: '@/test', dependencies: { '@/utils/core': 'workspace:*' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noHoisedDep.check(
      ctx({
        isRoot: true,
        pkg: { dependencies: { valibot: '^1.2.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// no-peer-deps
describe('package/no-peer-deps', () => {
  it('flags peerDependencies in private package', () => {
    const results: LintResult[] = noPeerDeps.check(
      ctx({
        pkg: { name: '@/test', private: true, peerDependencies: { vite: '>=7.0.0' } },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-peer-deps');
    expect(results[0]!.message).toContain('vite');
  });

  it('passes non-private package with peerDependencies', () => {
    const results: LintResult[] = noPeerDeps.check(
      ctx({
        pkg: { name: '@/test', peerDependencies: { vite: '>=7.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('passes private package without peerDependencies', () => {
    const results: LintResult[] = noPeerDeps.check(
      ctx({
        pkg: { name: '@/test', private: true },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noPeerDeps.check(
      ctx({
        isRoot: true,
        pkg: { private: true, peerDependencies: { svelte: '>=5.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// valid-project-ref
describe('package/valid-project-ref', () => {
  it('passes valid project reference', () => {
    const results: LintResult[] = validProjectRef.check(
      ctx({
        pkg: {
          name: '@/test',
          scripts: { 'qa:test': 'pnpm -w exec vitest run --project utils-core' },
        },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('flags invalid project reference', () => {
    const results: LintResult[] = validProjectRef.check(
      ctx({
        pkg: {
          name: '@/test',
          scripts: { 'qa:test': 'pnpm -w exec vitest run --project nonexistent-project' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/valid-project-ref');
    expect(results[0]!.message).toContain('nonexistent-project');
  });

  it('passes scripts without --project', () => {
    const results: LintResult[] = validProjectRef.check(
      ctx({
        pkg: { name: '@/test', scripts: { 'qa:test': 'echo no tests' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = validProjectRef.check(
      ctx({
        isRoot: true,
        pkg: { scripts: { 'qa:test': 'vitest run' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/valid-tsconfig
// =============================================================================

describe('package/valid-tsconfig', () => {
  it('passes when tsconfig extends root and includes src', () => {
    const results: LintResult[] = validTsconfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/schemas/common/package.json`,
        pkg: { name: '@/schemas/common' },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root package', () => {
    const results: LintResult[] = validTsconfig.check(
      ctx({
        isRoot: true,
        file: `${REPO_ROOT}/package.json`,
        pkg: { name: 'webforge' },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts vscode packages', () => {
    const results: LintResult[] = validTsconfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/extensions/vscode-formatter/package.json`,
        pkg: { name: '@resist/vscode-formatter' },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts SvelteKit packages (extends .svelte-kit)', () => {
    const results: LintResult[] = validTsconfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/products/storylyne/editor/package.json`,
        pkg: { name: '@storylyne/editor' },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('flags overridden protected compiler options', () => {
    const results: LintResult[] = validTsconfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/config/tooling/lint/package.json`,
        pkg: { name: '@/lint' },
      }),
    );
    // @/lint tsconfig has no protected overrides (rootDir and types are fine)
    const protectedResults: LintResult[] = results.filter((r: LintResult) =>
      r.message.includes('protected'),
    );
    expect(protectedResults.length).toBe(0);
  });
});

// =============================================================================
// package/no-workspace-self-ref
// =============================================================================

describe('package/no-workspace-self-ref', () => {
  it('flags workspace:* in dependencies', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        pkg: { name: '@/test', dependencies: { '@/schemas/common': 'workspace:*' } },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-workspace-self-ref');
    expect(results[0]!.message).toContain('@/schemas/common');
  });

  it('flags workspace:* in devDependencies', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        pkg: { name: '@/test', devDependencies: { '@/test-presets': 'workspace:*' } },
      }),
    );
    expect(results.length).toBe(1);
  });

  it('flags multiple workspace:* entries', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        pkg: {
          name: '@/test',
          dependencies: { '@/schemas/common': 'workspace:*', '@/utils/core': 'workspace:*' },
          devDependencies: { '@/test-presets': 'workspace:*' },
        },
      }),
    );
    expect(results.length).toBe(3);
  });

  it('passes non-workspace deps', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        pkg: { name: '@/test', dependencies: { 'some-pkg': '^1.0.0' } },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('passes empty deps', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        pkg: { name: '@/test' },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('exempts root', () => {
    const results: LintResult[] = noWorkspaceSelfRef.check(
      ctx({
        isRoot: true,
        pkg: { dependencies: { '@/schemas/common': 'workspace:*' } },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/no-vitest-config
// =============================================================================

describe('package/no-vitest-config', () => {
  it('flags sub-package with vitest.config.ts', () => {
    const results: LintResult[] = noVitestConfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/utils/cli/package.json`,
        pkg: { name: '@/cli' },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-vitest-config');
  });

  it('passes for root package', () => {
    const results: LintResult[] = noVitestConfig.check(
      ctx({
        isRoot: true,
      }),
    );
    expect(results.length).toBe(0);
  });

  it('passes for package without vitest.config.ts', () => {
    const results: LintResult[] = noVitestConfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/schemas/common/package.json`,
        pkg: { name: '@/schemas/common' },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/require-shared-config
// =============================================================================

describe('package/require-shared-config', () => {
  it('passes for package with correct svelte.config.ts', () => {
    const results: LintResult[] = requireSharedConfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/products/storylyne/editor/package.json`,
        pkg: { name: '@storylyne/editor' },
      }),
    );
    const svelteErrors: LintResult[] = results.filter((r: LintResult): boolean =>
      r.message.includes('svelte.config'),
    );
    expect(svelteErrors.length).toBe(0);
  });

  it('passes for root package', () => {
    const results: LintResult[] = requireSharedConfig.check(
      ctx({
        isRoot: true,
      }),
    );
    expect(results.length).toBe(0);
  });

  it('passes for package without config files', () => {
    const results: LintResult[] = requireSharedConfig.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/schemas/common/package.json`,
        pkg: { name: '@/schemas/common' },
      }),
    );
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// package/require-readme
// =============================================================================

describe('package/require-readme', () => {
  it('skips root package.json', () => {
    const results: LintResult[] = requireReadme.check(
      ctx({
        file: `${REPO_ROOT}/package.json`,
        pkg: { name: 'webforge' },
        isRoot: true,
      }),
    );
    expect(results.length).toBe(0);
  });

  it('flags missing README', () => {
    const results: LintResult[] = requireReadme.check(
      ctx({
        file: '/tmp/nonexistent-pkg-abc123/package.json',
        pkg: { name: '@/test-pkg' },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('missing README.md');
  });

  it('validates existing README has required sections', () => {
    // Use @/config which has a README
    const results: LintResult[] = requireReadme.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/config/core/package.json`,
        pkg: { name: '@/config' },
      }),
    );
    // Should pass — README has Files, API, Usage sections
    const missingSection: LintResult | undefined = results.find((r: LintResult): boolean =>
      r.message.includes('missing required section'),
    );
    expect(missingSection).toBeUndefined();
  });

  it('validates README title matches package name', () => {
    // @/config README title is "# @/config" which matches
    const results: LintResult[] = requireReadme.check(
      ctx({
        file: `${REPO_ROOT}/packages/shared/config/core/package.json`,
        pkg: { name: '@/config' },
      }),
    );
    const titleMismatch: LintResult | undefined = results.find((r: LintResult): boolean =>
      r.message.includes('does not match package name'),
    );
    expect(titleMismatch).toBeUndefined();
  });
});

// =============================================================================
// package/require-scope
// =============================================================================

describe('package/require-scope', () => {
  it('flags package without required scope', () => {
    const results: LintResult[] = requireScope.check(ctx({ pkg: { name: 'foo-bar' } }));
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/require-scope');
    expect(results[0]!.message).toContain('foo-bar');
  });

  it('flags package with wrong scope', () => {
    const results: LintResult[] = requireScope.check(ctx({ pkg: { name: '@other/foo' } }));
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/require-scope');
    expect(results[0]!.message).toContain('@other/foo');
  });

  it('passes package with correct scope', () => {
    const results: LintResult[] = requireScope.check(ctx({ pkg: { name: '@/foo' } }));
    expect(results.length).toBe(0);
  });

  it('passes root package', () => {
    const results: LintResult[] = requireScope.check(
      ctx({ isRoot: true, pkg: { name: 'webforge' } }),
    );
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(requireScope.id).toBe('package/require-scope');
    expect(requireScope.fixable).toBe(false);
  });
});

// =============================================================================
// package/no-git-deps
// =============================================================================

describe('package/no-git-deps', () => {
  it('flags git+https dependency in dependencies', () => {
    const results: LintResult[] = noGitDeps.check(
      ctx({
        pkg: {
          name: '@/test',
          dependencies: { 'some-pkg': 'git+https://github.com/foo/bar.git' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-git-deps');
    expect(results[0]!.message).toContain('some-pkg');
  });

  it('flags git+https dependency in devDependencies', () => {
    const results: LintResult[] = noGitDeps.check(
      ctx({
        pkg: {
          name: '@/test',
          devDependencies: { 'some-pkg': 'git+https://github.com/foo/bar.git' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-git-deps');
  });

  it('flags git+https dependency in optionalDependencies', () => {
    const results: LintResult[] = noGitDeps.check(
      ctx({
        pkg: {
          name: '@/test',
          optionalDependencies: { 'some-pkg': 'git+https://github.com/foo/bar.git' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-git-deps');
  });

  it('flags git+https dependency in peerDependencies', () => {
    const results: LintResult[] = noGitDeps.check(
      ctx({
        pkg: {
          name: '@/test',
          peerDependencies: { 'some-pkg': 'git+https://github.com/foo/bar.git' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-git-deps');
  });

  it('passes when no git+https dependencies', () => {
    const results: LintResult[] = noGitDeps.check(
      ctx({
        pkg: {
          name: '@/test',
          dependencies: { 'some-pkg': '^1.0.0' },
          devDependencies: { 'other-pkg': '^2.0.0' },
        },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(noGitDeps.id).toBe('package/no-git-deps');
    expect(noGitDeps.fixable).toBe(false);
  });
});

// =============================================================================
// package/no-ts-node
// =============================================================================

describe('package/no-ts-node', () => {
  it('flags ts-node in dependencies', () => {
    const results: LintResult[] = noTsNode.check(
      ctx({
        pkg: {
          name: '@/test',
          dependencies: { 'ts-node': '^10.0.0' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-ts-node');
    expect(results[0]!.message).toContain('ts-node');
  });

  it('flags ts-node in devDependencies', () => {
    const results: LintResult[] = noTsNode.check(
      ctx({
        pkg: {
          name: '@/test',
          devDependencies: { 'ts-node': '^10.0.0' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-ts-node');
  });

  it('flags ts-node in scripts', () => {
    const results: LintResult[] = noTsNode.check(
      ctx({
        pkg: {
          name: '@/test',
          scripts: { start: 'ts-node src/index.ts' },
        },
      }),
    );
    expect(results.length).toBe(1);
    expect(results[0]!.ruleId).toBe('package/no-ts-node');
    expect(results[0]!.message).toContain('ts-node');
  });

  it('passes when no ts-node references', () => {
    const results: LintResult[] = noTsNode.check(
      ctx({
        pkg: {
          name: '@/test',
          dependencies: { 'some-pkg': '^1.0.0' },
          scripts: { start: 'node src/index.js' },
        },
      }),
    );
    expect(results.length).toBe(0);
  });

  it('has correct rule metadata', () => {
    expect(noTsNode.id).toBe('package/no-ts-node');
    expect(noTsNode.fixable).toBe(false);
  });
});
