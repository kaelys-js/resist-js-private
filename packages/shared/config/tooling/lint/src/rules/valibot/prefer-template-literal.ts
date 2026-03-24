/**
 * Rule: valibot/prefer-template-literal
 *
 * Suggests using templateLiteral() from @/schemas/template-literal instead of
 * v.pipe(v.string(), v.regex(/^pattern$/)) when the regex has decomposable
 * literal segments + dynamic parts.
 *
 * templateLiteral() provides:
 * - Exact TypeScript template literal type inference (not just `string`)
 * - Composable schema-based parts instead of regex strings
 * - Better error messages ("expected `user_${number}`" vs "expected /^user_\\d+$/")
 * - v.record() key compatibility for typed record keys
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /config\/tooling\/lint\//,
  /schemas\/template-literal\//,
];

/**
 * Check if a regex pattern is decomposable into template literal parts.
 *
 * A regex is decomposable when it:
 * - Is anchored (^ and $)
 * - Contains literal segments (not just character classes)
 * - Has simple dynamic parts (\d+, \w+, .+, [a-z]+, etc.)
 * - Does NOT have complex features (optional groups, lookaheads, backreferences, alternation)
 *
 * @param {string} source - The regex source string
 * @returns {boolean} Whether the pattern could use templateLiteral()
 */
function isDecomposable(source: string): boolean {
  // Must be anchored
  if (!source.startsWith('^') || !source.endsWith('$')) {
    return false;
  }

  // Strip anchors
  const inner: string = source.slice(1, -1);

  // Reject character classes — templateLiteral() can't express [a-z], [0-9], etc.
  if (/\[[^\]]*-[^\]]*\]/.test(inner)) {
    return false;
  }

  // Reject complex features
  if (/\(\?[=!<]/.test(inner)) {
    return false; // Lookaheads/lookbehinds
  }
  if (/\\[1-9]/.test(inner)) {
    return false; // Backreferences
  }
  if (/\([^)]*\)\?/.test(inner)) {
    return false; // Optional groups
  }

  // Must have at least one literal segment (any non-special character not in a character class)
  // A "literal segment" is any fixed character between dynamic parts (e.g., '_' in prefix_\d+, ':' in .+:.+)
  const stripped: string = inner
    .replaceAll(/\[[^\]]*\]/g, '')
    .replaceAll(/\\[dDwWsSbB]/g, '')
    .replaceAll(/[.+*?{}()|\\]/g, '');
  const hasLiteral: boolean = stripped.length > 0;

  // Must have at least one dynamic segment
  const hasDynamic: boolean = /\\[dDwWsS]|\.\+|\.\*|\[[^\]]+\][+*]/.test(inner);

  return hasLiteral && hasDynamic;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/prefer-template-literal',
  description:
    'Prefer templateLiteral() over v.pipe(v.string(), v.regex()) for structured string patterns',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      if (EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(context.file))) {
        return [];
      }

      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return [];
      }

      // Check for v.pipe() calls
      if (
        (callee.type === 'MemberExpression' || callee.type === 'StaticMemberExpression') &&
        (callee.property as AstNode | undefined)?.name === 'pipe'
      ) {
        const pipeArgs = node.arguments as AstNode[] | undefined;
        if (!pipeArgs || pipeArgs.length < 2) {
          return [];
        }

        // First arg must be v.string()
        const firstArg: AstNode = pipeArgs[0];
        const firstArgText: string = context.content.slice(firstArg.start, firstArg.end);
        if (!firstArgText.includes('string()')) {
          return [];
        }

        // Find v.regex() in the remaining args
        for (let i: number = 1; i < pipeArgs.length; i++) {
          const arg: AstNode = pipeArgs[i];
          const argText: string = context.content.slice(arg.start, arg.end);

          if (!argText.includes('regex(')) {
            continue;
          }

          // Extract the regex pattern
          const regexMatch: RegExpMatchArray | null = argText.match(
            /regex\s*\(\s*\/(.+?)\/[gimsuy]*\s*[,)]/,
          );
          if (!regexMatch) {
            continue;
          }

          const regexSource: string = regexMatch[1];

          if (isDecomposable(regexSource)) {
            return [
              {
                file: context.file,
                line: node.loc.start.line,
                column: node.loc.start.column + 1,
                severity: 'warning',
                message: `Consider using templateLiteral() from @/schemas/template-literal instead of v.regex(/${regexSource}/)`,
                ruleId: 'valibot/prefer-template-literal',
                tip: 'templateLiteral() provides exact TypeScript type inference, composable parts, better errors, and record key support',
              },
            ];
          }
        }
      }

      return [];
    },
  },
};

export default rule;
