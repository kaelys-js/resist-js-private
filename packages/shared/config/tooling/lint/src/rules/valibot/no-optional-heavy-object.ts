/**
 * Rule: valibot/no-optional-heavy-object
 *
 * Warns when more than 70% of fields in a `v.strictObject()` or `v.object()`
 * are optional, nullable, or nullish. This usually indicates a poorly designed
 * schema where required fields should be separated from optional ones.
 *
 * @module
 */

import type {
  AstNode,
  LintResult,
  TypeScriptRule,
  VisitorContext,
} from '@/lint/framework/types.ts';

/** Minimum number of properties before the rule applies. */
const MIN_PROPERTIES: number = 3;

/** Schema methods that accept an object literal as their first argument. */
const OBJECT_METHODS: ReadonlySet<string> = new Set(['object', 'strictObject']);

/** Wrapper methods that make a field optional-like. */
const OPTIONAL_METHODS: ReadonlySet<string> = new Set(['nullable', 'nullish', 'optional']);

/** Threshold ratio above which the warning fires. */
const THRESHOLD: number = 0.7;

/** The no-optional-heavy-object lint rule. */
const rule: TypeScriptRule = {
  categories: ['valibot', 'architecture'],
  description: 'Warns when >70% of fields in a schema object are optional/nullable',
  id: 'valibot/no-optional-heavy-object',
  patterns: ['**/*.ts', '**/*.svelte.ts'],
  stages: ['lint'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      if (callee.type !== 'StaticMemberExpression' && callee.type !== 'MemberExpression') {
        return results;
      }

      const object = callee.object as AstNode | undefined;
      const property = callee.property as AstNode | undefined;
      const propName: string = (property?.name as string) ?? '';

      if (!OBJECT_METHODS.has(propName)) {
        return results;
      }
      if (!context.isImportedFrom((object?.name as string) ?? '', 'valibot')) {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const schemaObj = args[0] as AstNode;
      if (schemaObj.type !== 'ObjectExpression') {
        return results;
      }

      const properties = schemaObj.properties as AstNode[] | undefined;
      if (!properties) {
        return results;
      }

      // Filter out spread elements
      const namedProps: AstNode[] = properties.filter(
        (p: AstNode): boolean => p.type !== 'SpreadElement',
      );
      const totalCount: number = namedProps.length;

      if (totalCount < MIN_PROPERTIES) {
        return results;
      }

      // Count optional/nullable/nullish wrapped properties
      let optionalCount: number = 0;

      for (const prop of namedProps) {
        const value = prop.value as AstNode | undefined;
        if (!value) {
          continue;
        }

        if (value.type === 'CallExpression') {
          const valueCallee = value.callee as AstNode | undefined;
          if (
            valueCallee &&
            (valueCallee.type === 'StaticMemberExpression' ||
              valueCallee.type === 'MemberExpression')
          ) {
            const valueObj = valueCallee.object as AstNode | undefined;
            const valueProp = valueCallee.property as AstNode | undefined;
            const methodName: string = (valueProp?.name as string) ?? '';

            if (
              OPTIONAL_METHODS.has(methodName) &&
              context.isImportedFrom((valueObj?.name as string) ?? '', 'valibot')
            ) {
              optionalCount++;
            }
          }
        }
      }

      const ratio: number = optionalCount / totalCount;
      if (ratio > THRESHOLD) {
        const pct: number = Math.round(ratio * 100);
        results.push({
          column: node.loc.start.column + 1,
          file: context.file,
          fix: { range: { end: node.start, start: node.start }, text: '' },
          line: node.loc.start.line,
          message: `${pct}% of fields (${optionalCount}/${totalCount}) are optional/nullable — consider splitting required and optional fields`,
          ruleId: 'valibot/no-optional-heavy-object',
          severity: 'warning',
          tip: 'Split into a base schema with required fields and extend with optional fields using v.intersect()',
        });
      }

      return results;
    },
  },
};

export default rule;
