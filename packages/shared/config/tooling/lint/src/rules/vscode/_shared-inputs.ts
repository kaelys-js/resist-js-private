/**
 * Shared input declaration for vscode/* rules.
 *
 * Every rule in this category scans:
 *   - All workspace package.json files (via getWorkspacePackages)
 *   - All .ts files in the workspace (via filesByExtension)
 *
 * Used by `WorkspaceRule.inputs` to define the cache invalidation set.
 *
 * @module
 */

import type { WorkspaceContext, WorkspacePackage } from '@/lint/framework/rule-context.ts';

/**
 * Collect inputs for vscode workspace rules: every .ts file plus every
 * resolved package.json path.
 *
 * @param ctx - Workspace context
 * @returns Absolute paths whose contents affect vscode/* rule outputs
 */
export async function vscodeRuleInputs(ctx: WorkspaceContext): Promise<readonly string[]> {
  const tsFiles: readonly string[] = await ctx.filesByExtension('.ts');
  const packages: WorkspacePackage[] = await ctx.getWorkspacePackages();
  const pkgPaths: string[] = packages.map((p: WorkspacePackage): string => p.path);
  return [...tsFiles, ...pkgPaths];
}
