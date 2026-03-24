/**
 * Rule: valibot/prefer-shared-schema
 *
 * When a field name in v.strictObject() matches a known pattern
 * (path, url, port, version, command, hostname), suggest using
 * the corresponding shared schema from @/schemas/common instead
 * of bare v.string() or v.pipe(v.string(), ...).
 *
 * @module
 */

import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../framework/types.ts';

/** Map of field name patterns to suggested shared schemas. */
const SCHEMA_SUGGESTIONS: ReadonlyArray<{ pattern: RegExp; schema: string; source: string }> = [
  { pattern: /[Pp]ath|[Dd]ir|[Ff]ile/, schema: 'PathSchema', source: '@/schemas/common' },
  { pattern: /[Uu]rl|URL|[Ee]ndpoint/, schema: 'UrlStringSchema', source: '@/schemas/common' },
  { pattern: /^port$|Port$|_port$/, schema: 'PortSchema', source: '@/schemas/common' },
  { pattern: /[Vv]ersion$/, schema: 'SemverSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ommand|[Cc]md$/, schema: 'CommandSchema', source: '@/schemas/common' },
  { pattern: /[Hh]ostname|[Hh]ost$/, schema: 'HostnameSchema', source: '@/schemas/common' },
  { pattern: /[Mm]eta[Tt]itle$/, schema: 'MetaTitleSchema', source: '@/schemas/common' },
  { pattern: /[Mm]eta[Dd]escription$/, schema: 'MetaDescriptionSchema', source: '@/schemas/common' },
  { pattern: /[Nn]ame$|[Tt]itle$/, schema: 'NameSchema', source: '@/schemas/common' },
  {
    pattern: /[Pp]refix$|[Ss]uffix$/,
    schema: 'v.pipe(v.string(), v.minLength(1), v.maxLength(50))',
    source: 'inline',
  },
  { pattern: /[Ff]amily$|[Ff]amilies$/, schema: 'CssFontFamilySchema', source: '@/schemas/common' },
  { pattern: /[Ee]mail$/, schema: 'EmailSchema', source: '@/schemas/common' },
  { pattern: /^id$|Id$|[Ss]essionId$/, schema: 'UuidSchema', source: '@/schemas/common' },
  { pattern: /[Tt]imestamp$|[Dd]ateTime$/, schema: 'IsoTimestampSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ommit$|[Cc]ommitHash$/, schema: 'GitCommitShortSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ommitFull$/, schema: 'GitCommitFullSchema', source: '@/schemas/common' },
  { pattern: /[Bb]ranch$/, schema: 'GitBranchSchema', source: '@/schemas/common' },
  { pattern: /[Ww]eight$/, schema: 'CssFontWeightSchema', source: '@/schemas/common' },
  { pattern: /[Ss]uite$|[Ss]ervice$/, schema: 'NameSchema', source: '@/schemas/common' },
  { pattern: /[Dd]escription$/, schema: 'DescriptionSchema', source: '@/schemas/common' },
  { pattern: /[Tt]ag$|[Kk]eyword$/, schema: 'TagSchema', source: '@/schemas/common' },
  { pattern: /[Ss]lug$/, schema: 'SlugSchema', source: '@/schemas/common' },
  { pattern: /[Cc]olor$|[Cc]olour$/, schema: 'HexColorSchema', source: '@/schemas/common' },
  { pattern: /[Ss]tatus[Cc]ode$/, schema: 'HttpStatusCodeSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ontent[Tt]ype$|[Mm]ime[Tt]ype$/, schema: 'MimeTypeSchema', source: '@/schemas/common' },
  { pattern: /[Dd]uration$|[Ee]xpiry$|[Tt]tl$/, schema: 'DurationSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ountry[Cc]ode$/, schema: 'CountryCodeSchema', source: '@/schemas/common' },
  { pattern: /[Cc]urrency[Cc]ode$|[Cc]urrency$/, schema: 'CurrencyCodeSchema', source: '@/schemas/common' },
  { pattern: /[Tt]imezone$|[Tt]z$/, schema: 'TimezoneSchema', source: '@/schemas/common' },
  { pattern: /[Cc]ron$|[Ss]chedule$/, schema: 'CronExpressionSchema', source: '@/schemas/common' },
  { pattern: /[Pp]assword$/, schema: 'PasswordSchema', source: '@/schemas/common' },
  { pattern: /[Tt]oken$/, schema: 'BearerTokenSchema', source: '@/schemas/common' },
  { pattern: /[Ff]eature[Ff]lag$/, schema: 'FeatureFlagSchema', source: '@/schemas/common' },
  { pattern: /[Cc]anonical[Uu]rl$/, schema: 'CanonicalUrlSchema', source: '@/schemas/common' },
  { pattern: /[Ll]ocale[Tt]ag$|[Ll]ang[Tt]ag$/, schema: 'BCP47TagSchema', source: '@/schemas/common' },
  { pattern: /[Tt]ranslation[Kk]ey$|[Ii]18n[Kk]ey$/, schema: 'TranslationKeySchema', source: '@/schemas/common' },
  { pattern: /[Ee]rror[Cc]ode$/, schema: 'ErrorCodeSchema', source: '@/schemas/common' },
  { pattern: /[Cc]orrelation[Ii]d$|[Rr]equest[Ii]d$|[Tt]race[Ii]d$/, schema: 'CorrelationIdSchema', source: '@/schemas/common' },
  { pattern: /[Ee]xtension$|[Ee]xt$/, schema: 'FileExtensionSchema', source: '@/schemas/common' },
  { pattern: /[Ss]earch[Qq]uery$|[Qq]uery$/, schema: 'SearchQuerySchema', source: '@/schemas/common' },
  { pattern: /[Cc]omment$/, schema: 'CommentSchema', source: '@/schemas/common' },
  { pattern: /[Ss]ummary$/, schema: 'SummarySchema', source: '@/schemas/common' },
  { pattern: /[Yy]ear$/, schema: 'YearSchema', source: '@/schemas/common' },
];

/** File path patterns exempt from this rule. */
const EXEMPT_PATTERNS: readonly RegExp[] = [
  /config\/tooling\/lint\//,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

/**
 * Check whether a file is exempt.
 *
 * @param {string} filePath - File path
 * @returns {boolean} Whether exempt
 */
function isExempt(filePath: string): boolean {
  return EXEMPT_PATTERNS.some((p: RegExp): boolean => p.test(filePath));
}

/**
 * Check if a property value uses v.string() or v.pipe(v.string(), ...) without
 * already referencing a shared schema.
 *
 * @param {string} valueText - Source text of the property value
 * @returns {boolean} Whether the value is a string-based schema
 */
function isPrimitiveSchema(valueText: string): boolean {
  if (valueText === 'v.string()' || valueText === 'v.number()') {
    return true;
  }
  if (valueText.startsWith('v.pipe(v.string()') || valueText.startsWith('v.pipe(v.number()')) {
    return true;
  }
  if (valueText.startsWith('v.optional(v.string()') || valueText.startsWith('v.optional(v.number()')) {
    return true;
  }
  if (valueText.startsWith('v.optional(v.pipe(v.string()') || valueText.startsWith('v.optional(v.pipe(v.number()')) {
    return true;
  }
  return false;
}

/** Rule definition. */
const rule: TypeScriptRule = {
  id: 'valibot/prefer-shared-schema',
  description: 'Use shared schemas (PathSchema, UrlStringSchema, etc.) for matching field names',
  patterns: ['**/*.ts', '**/*.svelte.ts'],

  visitor: {
    CallExpression(node: AstNode, context: VisitorContext): LintResult[] {
      const results: LintResult[] = [];
      if (isExempt(context.file)) {
        return results;
      }

      const callee = node.callee as AstNode | undefined;
      if (!callee) {
        return results;
      }

      const prop = callee.property as AstNode | undefined;
      const obj = callee.object as AstNode | undefined;
      if ((obj?.name as string) !== 'v' || (prop?.name as string) !== 'strictObject') {
        return results;
      }

      const args = node.arguments as AstNode[] | undefined;
      if (!args || args.length === 0) {
        return results;
      }

      const objArg: AstNode = args[0];
      if (objArg.type !== 'ObjectExpression') {
        return results;
      }

      const properties = objArg.properties as AstNode[] | undefined;
      if (!properties) {
        return results;
      }

      for (const property of properties) {
        if (property.type !== 'ObjectProperty' && property.type !== 'Property') {
          continue;
        }

        const keyNode = property.key as AstNode | undefined;
        const keyName: string = (keyNode?.name as string) ?? (keyNode?.value as string) ?? '';
        if (!keyName) {
          continue;
        }

        const value = property.value as AstNode | undefined;
        if (!value) {
          continue;
        }

        const valueText: string = context.content.slice(value.start, value.end).trim();

        // Skip if already using a shared schema (e.g., PathSchema, PortSchema)
        if (valueText.includes('Schema') && !valueText.startsWith('v.')) {
          continue;
        }

        // Only check string-based schemas
        if (!isPrimitiveSchema(valueText)) {
          continue;
        }

        // Skip fields already well-constrained (3+ validators in v.pipe)
        // e.g. v.pipe(v.string(), v.minLength(1), v.maxLength(50), v.regex(...))
        const pipeMatch: RegExpMatchArray | null = valueText.match(/v\.pipe\(/);
        if (pipeMatch) {
          const pipeContent: string = valueText.slice(valueText.indexOf('v.pipe('));
          const validatorCount: number = pipeContent.split(/v\.\w+\(/).length - 1;
          if (validatorCount >= 4) {
            continue;
          }
        }

        // Check field name against patterns
        for (const suggestion of SCHEMA_SUGGESTIONS) {
          if (suggestion.pattern.test(keyName)) {
            results.push({
              file: context.file,
              line: property.loc.start.line,
              column: property.loc.start.column + 1,
              severity: 'error',
              message: `Field '${keyName}' should use ${suggestion.schema} from ${suggestion.source}`,
              ruleId: 'valibot/prefer-shared-schema',
              tip: `Replace with ${suggestion.schema} for type-safe branded validation`,
              fix: { range: { start: value.start, end: value.end }, text: suggestion.schema },
            });
            break;
          }
        }
      }

      return results;
    },
  },
};

export default rule;
