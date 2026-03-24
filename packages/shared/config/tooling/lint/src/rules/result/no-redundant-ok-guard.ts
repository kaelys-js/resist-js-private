/**
 * Rule: result/no-redundant-ok-guard
 *
 * Detects patterns where both branches of an `.ok` guard return the same
 * variable, making the guard dead code:
 *
 * ```typescript
 * const validated = safeParse(Schema, data);
 * if (!validated.ok) return validated;  // guard
 * return validated;                     // same return
 * ```
 *
 * Both branches return `validated` — the guard has no effect.
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/**
 * Extract the returned variable name from a return statement node.
 *
 * @param {AstNode} returnNode - The ReturnStatement AST node
 * @returns {string | null} The returned identifier name, or null
 */
function getReturnedName(returnNode: AstNode): string | null {
  const argument = returnNode.argument as AstNode | undefined;
  if (!argument) {
    return null;
  }
  if (argument.type === 'Identifier') {
    return (argument.name as string) ?? null;
  }
  return null;
}

const rule: TypeScriptRule = {
  id: 'result/no-redundant-ok-guard',
  description: 'Redundant .ok guard — both branches return the same variable',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    IfStatement(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];

      // Check if condition is `!varName.ok`
      const test = node.test as AstNode | undefined;
      if (!test) {
        return results;
      }

      // Match: !varName.ok
      let guardedVarName: string | null = null;

      if (test.type === 'UnaryExpression') {
        const operator = test.operator as string | undefined;
        if (operator !== '!') {
          return results;
        }

        const argument = test.argument as AstNode | undefined;
        if (!argument) {
          return results;
        }

        if (argument.type === 'MemberExpression' || argument.type === 'StaticMemberExpression') {
          const prop = argument.property as AstNode | undefined;
          const propName: string = (prop?.name as string) ?? '';
          if (propName !== 'ok') {
            return results;
          }

          const obj = argument.object as AstNode | undefined;
          if (obj?.type === 'Identifier') {
            guardedVarName = (obj.name as string) ?? null;
          }
        }
      }

      if (!guardedVarName) {
        return results;
      }

      // Check if the consequent (if-body) returns the same variable
      const consequent = node.consequent as AstNode | undefined;
      if (!consequent) {
        return results;
      }

      let guardReturn: string | null = null;

      // Handle both block and non-block consequent
      if (consequent.type === 'BlockStatement') {
        const body = consequent.body as AstNode[] | undefined;
        if (!body || body.length !== 1) {
          return results;
        }
        if (body[0].type !== 'ReturnStatement') {
          return results;
        }
        guardReturn = getReturnedName(body[0]);
      } else if (consequent.type === 'ReturnStatement') {
        guardReturn = getReturnedName(consequent);
      }

      if (guardReturn !== guardedVarName) {
        return results;
      }

      // Now check the NEXT statement after this if
      // We need to find the next sibling in the parent block
      const source: string = context.content;
      const afterIf: string = source.slice(node.end).trimStart();

      // Check if next statement is `return guardedVarName;`
      const nextReturnPattern: RegExp = new RegExp(`^return\\s+${guardedVarName}\\s*;`);
      if (nextReturnPattern.test(afterIf)) {
        results.push({
          file: context.file,
          line: node.loc.start.line,
          column: node.loc.start.column + 1,
          severity: 'error',
          message: `Redundant .ok guard — both branches return '${guardedVarName}'`,
          ruleId: 'result/no-redundant-ok-guard',
          tip: `The if (!${guardedVarName}.ok) guard has no effect because the next line also returns ${guardedVarName}. Either remove the guard or return different values.`,
        });
      }

      return results;
    },
  },
};

export default rule;
