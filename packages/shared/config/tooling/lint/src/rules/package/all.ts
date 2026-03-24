/**
 * Package.json lint rules — all rules in this category.
 *
 * @module
 */
import type { PackageJsonRule } from '../../framework/types.ts';
import noHoisedDep from './no-hoisted-dep.ts';
import noPeerDeps from './no-peer-deps.ts';
import noRootOnlyScripts from './no-root-only-scripts.ts';
import noTscDependency from './no-tsc-dependency.ts';
import noWorkspaceDep from './no-workspace-dep.ts';
import noVitestConfig from './no-vitest-config.ts';
import noWorkspaceSelfRef from './no-workspace-self-ref.ts';
import requireProjectTest from './require-project-test.ts';
import requireReadme from './require-readme.ts';
import requireSharedConfig from './require-shared-config.ts';
import requireStandardScripts from './require-standard-scripts.ts';
import requireTsgo from './require-tsgo.ts';
import validProjectRef from './valid-project-ref.ts';
import validTsconfig from './valid-tsconfig.ts';

/** All package.json lint rules. */
export const PACKAGE_RULES: PackageJsonRule[] = [
  requireTsgo,
  requireProjectTest,
  requireStandardScripts,
  noRootOnlyScripts,
  noTscDependency,
  noWorkspaceDep,
  noHoisedDep,
  noPeerDeps,
  noWorkspaceSelfRef,
  noVitestConfig,
  validProjectRef,
  validTsconfig,
  requireSharedConfig,
  requireReadme,
];
