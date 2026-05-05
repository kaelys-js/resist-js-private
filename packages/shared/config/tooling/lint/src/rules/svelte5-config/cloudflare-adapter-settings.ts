/**
 * Rule: svelte5-config/cloudflare-adapter-settings
 *
 * Cloudflare adapter should have explicit `routes` config for optimal
 * edge deployment.
 *
 * @module
 */

import {
  NO_OP_FIX,
  type TypeScriptRule,
  type LintResult,
  type AstNode,
  type VisitorContext,
} from '@/lint/framework/types.ts';
import {
  getDefaultExportObject,
  getNestedValue,
  getAdapterImport,
  CLOUDFLARE_ADAPTERS,
} from './_config-ast.ts';

/**
 * Check if the adapter call expression has a `routes` argument property.
 *
 * @param adapterNode - The adapter CallExpression node
 * @returns True if routes config is present and non-empty
 */
function hasRoutesConfig(adapterNode: AstNode): boolean {
  if (adapterNode.type !== 'CallExpression') {
    return false;
  }

  const args: AstNode[] | undefined = adapterNode.arguments as AstNode[] | undefined;

  if (!args || args.length === 0) {
    return false;
  }

  const [firstArg] = args;

  if (!firstArg || firstArg.type !== 'ObjectExpression') {
    return false;
  }

  const routesValue: AstNode | undefined = getNestedValue(firstArg, 'routes');

  if (!routesValue) {
    return false;
  }

  // Empty routes object `{}` is not sufficient
  if (routesValue.type === 'ObjectExpression') {
    const props: AstNode[] | undefined = routesValue.properties as AstNode[] | undefined;

    if (!props || props.length === 0) {
      return false;
    }
  }

  return true;
}

/** The cloudflare-adapter-settings lint rule. */
const rule: TypeScriptRule = {
  id: 'svelte5-config/cloudflare-adapter-settings',
  description: 'Cloudflare adapter should have explicit routes config for optimal deployment',
  patterns: ['**/svelte.config.*'],
  categories: ['svelte5-config'],
  stages: ['lint', 'ci'],
  fixable: true,

  visitor: {
    Program(node: AstNode, context: VisitorContext): LintResult[] {
      const adapterPkg: string | undefined = getAdapterImport(context.imports);

      if (!adapterPkg || !CLOUDFLARE_ADAPTERS.has(adapterPkg)) {
        return [];
      }

      // cloudflare-workers uses wrangler.toml config, not routes option
      if (adapterPkg === '@sveltejs/adapter-cloudflare-workers') {
        return [];
      }

      const configObj: AstNode | undefined = getDefaultExportObject(context.ast);

      if (!configObj) {
        return [];
      }

      const adapterValue: AstNode | undefined = getNestedValue(configObj, 'kit.adapter');

      if (!adapterValue) {
        return [];
      }

      if (!hasRoutesConfig(adapterValue)) {
        /* Fix: insert routes config into adapter call args */
        let fix = NO_OP_FIX;

        if (adapterValue.type === 'CallExpression') {
          const args: AstNode[] | undefined = adapterValue.arguments as AstNode[] | undefined;
          const routesSnippet = "routes: { include: ['/*'], exclude: ['<all>'] }";

          if (args && args.length > 0 && args[0]?.type === 'ObjectExpression') {
            /* Has existing options object — insert routes property */
            const optObj = args[0];
            fix = {
              range: { start: optObj.end - 1, end: optObj.end - 1 },
              text: `, ${routesSnippet} `,
            };
          } else if (!args || args.length === 0) {
            /* No args — insert full options object */
            fix = {
              range: { start: adapterValue.end - 1, end: adapterValue.end - 1 },
              text: `{ ${routesSnippet} }`,
            };
          }
        }

        return [
          {
            file: context.file,
            line: node.loc.start.line,
            column: node.loc.start.column + 1,
            severity: 'warning',
            message: 'Cloudflare adapter should have explicit routes config for optimal deployment',
            ruleId: rule.id,
            tip: "Add routes: { include: ['/*'], exclude: ['<all>'] } to exclude static assets from Worker",
            fix,
          },
        ];
      }

      return [];
    },
  },
};

export default rule;
