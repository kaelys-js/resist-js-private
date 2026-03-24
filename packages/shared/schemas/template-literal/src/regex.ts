/**
 * Regex generation for template literal schemas.
 *
 * Maps Valibot schema types to regex fragments, with full pipe introspection
 * for tighter patterns (email, uuid, regex, minLength, maxLength, integer, etc.).
 *
 * @module
 */

import * as v from 'valibot';

import type { Str } from '@/schemas/common';
import { ok, type Result } from '@/schemas/result/result';

import type { TemplateLiteralPart } from '@/schemas/template-literal/types';

// =============================================================================
// Constants
// =============================================================================

/** Regex pattern for any string (including newlines). */
const STRING_PATTERN: Str = String.raw`[\s\S]*`;

/** Regex pattern for any number (integer or float, signed). */
const NUMBER_PATTERN: Str = String.raw`-?\d+(?:\.\d+)?`;

/** Regex pattern for integers only (signed). */
const INTEGER_PATTERN: Str = String.raw`-?\d+`;

/** Regex pattern for boolean strings. */
const BOOLEAN_PATTERN: Str = '(?:true|false)';

/** Regex pattern for bigint strings (signed integers). */
const BIGINT_PATTERN: Str = String.raw`-?\d+`;

/** Regex pattern for UUID v4. */
const UUID_PATTERN: Str = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** Regex pattern for ULID. */
const ULID_PATTERN: Str = '[0-9A-HJKMNP-TV-Z]{26}';

/** Regex pattern for CUID2. */
const CUID2_PATTERN: Str = '[a-z][0-9a-z]+';

/** Regex pattern for nanoid (default alphabet). */
const NANOID_PATTERN: Str = '[A-Za-z0-9_-]+';

/** Regex pattern for IPv4 addresses. */
const IPV4_PATTERN: Str = String.raw`(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;

/** Regex pattern for hexadecimal strings. */
const HEXADECIMAL_PATTERN: Str = '[0-9a-fA-F]+';

/** Regex pattern for octal strings. */
const OCTAL_PATTERN: Str = '[0-7]+';

/** Regex pattern for decimal number strings. */
const DECIMAL_PATTERN: Str = String.raw`-?\d+(?:\.\d+)?`;

/** Regex pattern for slug strings. */
const SLUG_PATTERN: Str = '[a-z0-9]+(?:-[a-z0-9]+)*';

// =============================================================================
// Regex Escaping
// =============================================================================

/**
 * Escapes special regex characters in a string.
 *
 * @param str - The string to escape.
 * @returns Result containing the regex-safe string.
 *
 * @example
 * ```typescript
 * const result = escapeRegex('$100.00');
 * if (result.ok) result.data; // '\\$100\\.00'
 * ```
 */
export function escapeRegex(str: Str): Result<Str> {
  const escaped: Str = str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return ok(v.string(), escaped);
}

// =============================================================================
// Pipe Introspection
// =============================================================================

/**
 * Introspects pipe actions on a `SchemaWithPipe` to extract regex constraints.
 *
 * Walks the pipe array and checks each action's `type` property to
 * tighten the base regex pattern. Supported actions:
 *
 * **String actions:** `regex`, `email`, `uuid`, `ulid`, `cuid2`, `nanoid`,
 * `ipv4`, `ipv6`, `hexadecimal`, `octal`, `decimal`, `slug`,
 * `starts_with`, `ends_with`, `min_length`, `max_length`, `length`
 *
 * **Number actions:** `integer`
 *
 * @param pipe - The pipe items array from a `SchemaWithPipe`.
 * @param basePattern - The default regex pattern for the base schema type.
 * @returns Result containing the tightened regex pattern.
 */
function _introspectPipe(pipe: readonly unknown[], basePattern: Str): Result<Str> {
  let pattern: Str = basePattern;
  let minLen: number | undefined;
  let maxLen: number | undefined;
  let hasUserRegex: boolean = false;

  for (const action of pipe) {
    if (typeof action !== 'object' || action === null || !('type' in action)) {
      continue;
    }

    const { type: actionType }: { readonly type: unknown } = action as { readonly type: unknown };

    switch (actionType) {
      // ── String format actions ──
      case 'regex': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (requirement instanceof RegExp) {
          const { source }: RegExp = requirement;
          // Strip anchors — we add our own ^...$
          const start: number = source.startsWith('^') ? 1 : 0;
          const end: number = source.endsWith('$') ? source.length - 1 : source.length;
          pattern = source.slice(start, end);
          hasUserRegex = true;
        }
        break;
      }
      case 'email': {
        // Simplified email pattern — matches most valid emails
        const backtick: Str = '`';
        pattern = `[a-zA-Z0-9.!#$%&'*+/=?^_${backtick}{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?${String.raw`(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*`}`;
        break;
      }
      case 'uuid': {
        pattern = UUID_PATTERN;
        break;
      }
      case 'ulid': {
        pattern = ULID_PATTERN;
        break;
      }
      case 'cuid2': {
        pattern = CUID2_PATTERN;
        break;
      }
      case 'nanoid': {
        pattern = NANOID_PATTERN;
        break;
      }
      case 'ipv4': {
        pattern = IPV4_PATTERN;
        break;
      }
      case 'hexadecimal': {
        pattern = HEXADECIMAL_PATTERN;
        break;
      }
      case 'octal': {
        pattern = OCTAL_PATTERN;
        break;
      }
      case 'decimal': {
        pattern = DECIMAL_PATTERN;
        break;
      }
      case 'slug': {
        pattern = SLUG_PATTERN;
        break;
      }
      // ── String length actions ──
      case 'min_length': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (typeof requirement === 'number') {
          minLen = requirement;
        }
        break;
      }
      case 'max_length': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (typeof requirement === 'number') {
          maxLen = requirement;
        }
        break;
      }
      case 'length': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (typeof requirement === 'number') {
          minLen = requirement;
          maxLen = requirement;
        }
        break;
      }
      // ── String prefix/suffix actions ──
      case 'starts_with': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (typeof requirement === 'string') {
          const escapedResult: Result<Str> = escapeRegex(requirement);
          if (!escapedResult.ok) {
            return escapedResult;
          }
          pattern = `${escapedResult.data}${String.raw`[\s\S]*`}`;
        }
        break;
      }
      case 'ends_with': {
        const { requirement }: { readonly requirement: unknown } = action as {
          readonly requirement: unknown;
        };
        if (typeof requirement === 'string') {
          const escapedResult: Result<Str> = escapeRegex(requirement);
          if (!escapedResult.ok) {
            return escapedResult;
          }
          pattern = `${String.raw`[\s\S]*`}${escapedResult.data}`;
        }
        break;
      }
      // ── Number actions ──
      case 'integer': {
        if (basePattern === NUMBER_PATTERN) {
          pattern = INTEGER_PATTERN;
        }
        break;
      }
      default: {
        // Unknown action — skip without modifying pattern
        break;
      }
    }
  }

  // Apply length constraints to string patterns (if no user regex overrides)
  if (!hasUserRegex && (minLen !== undefined || maxLen !== undefined)) {
    const min: Str = minLen === undefined ? '0' : String(minLen);
    const max: Str = maxLen === undefined ? '' : String(maxLen);
    pattern = String.raw`[\s\S]{${min},${max}}`;
  }

  return ok(v.string(), pattern);
}

// =============================================================================
// Schema → Regex Fragment
// =============================================================================

/**
 * Generates the regex fragment for a single Valibot schema.
 *
 * Handles all supported schema types including piped schemas
 * (with full pipe introspection for tighter patterns).
 *
 * @param schema - A Valibot schema that participates as a template literal part.
 * @returns Result containing the regex fragment string (without anchors).
 */
export function schemaToRegex(schema: v.GenericSchema): Result<Str> {
  const { type: schemaType }: v.GenericSchema = schema;

  switch (schemaType) {
    case 'string': {
      return ok(v.string(), STRING_PATTERN);
    }

    case 'number': {
      return ok(v.string(), NUMBER_PATTERN);
    }

    case 'boolean': {
      return ok(v.string(), BOOLEAN_PATTERN);
    }

    case 'bigint': {
      return ok(v.string(), BIGINT_PATTERN);
    }

    case 'null': {
      return ok(v.string(), 'null');
    }

    case 'undefined': {
      return ok(v.string(), 'undefined');
    }

    case 'literal': {
      const { literal }: { readonly literal: unknown } = schema as { readonly literal: unknown };
      return escapeRegex(String(literal));
    }

    case 'picklist': {
      const { options }: { readonly options: readonly unknown[] } = schema as {
        readonly options: readonly unknown[];
      };
      const escapedParts: Str[] = [];
      for (const opt of options) {
        const escapedResult: Result<Str> = escapeRegex(String(opt));
        if (!escapedResult.ok) {
          return escapedResult;
        }
        escapedParts.push(escapedResult.data);
      }
      return ok(v.string(), `(?:${escapedParts.join('|')})`);
    }

    case 'enum': {
      const { enum: enumObj }: { readonly enum: Record<string, unknown> } = schema as {
        readonly enum: Record<string, unknown>;
      };
      const values: unknown[] = Object.values(enumObj);
      const escapedParts: Str[] = [];
      for (const val of values) {
        const escapedResult: Result<Str> = escapeRegex(String(val));
        if (!escapedResult.ok) {
          return escapedResult;
        }
        escapedParts.push(escapedResult.data);
      }
      return ok(v.string(), `(?:${escapedParts.join('|')})`);
    }

    case 'union': {
      const { options }: { readonly options: readonly v.GenericSchema[] } = schema as {
        readonly options: readonly v.GenericSchema[];
      };
      const unionParts: Str[] = [];
      for (const opt of options) {
        const optResult: Result<Str> = schemaToRegex(opt);
        if (!optResult.ok) {
          return optResult;
        }
        unionParts.push(optResult.data);
      }
      return ok(v.string(), `(?:${unionParts.join('|')})`);
    }

    case 'optional': {
      const { wrapped }: { readonly wrapped: v.GenericSchema } = schema as {
        readonly wrapped: v.GenericSchema;
      };
      const innerResult: Result<Str> = schemaToRegex(wrapped);
      if (!innerResult.ok) {
        return innerResult;
      }
      return ok(v.string(), `(?:${innerResult.data}|undefined)`);
    }

    case 'nullable': {
      const { wrapped }: { readonly wrapped: v.GenericSchema } = schema as {
        readonly wrapped: v.GenericSchema;
      };
      const innerResult: Result<Str> = schemaToRegex(wrapped);
      if (!innerResult.ok) {
        return innerResult;
      }
      return ok(v.string(), `(?:${innerResult.data}|null)`);
    }

    case 'nullish': {
      const { wrapped }: { readonly wrapped: v.GenericSchema } = schema as {
        readonly wrapped: v.GenericSchema;
      };
      const innerResult: Result<Str> = schemaToRegex(wrapped);
      if (!innerResult.ok) {
        return innerResult;
      }
      return ok(v.string(), `(?:${innerResult.data}|null|undefined)`);
    }

    case 'template_literal': {
      const { regex: nestedRegex }: { readonly regex: RegExp } = schema as {
        readonly regex: RegExp;
      };
      const { source }: RegExp = nestedRegex;
      // Strip ^...$ anchors from nested template literal
      const start: number = source.startsWith('^') ? 1 : 0;
      const end: number = source.endsWith('$') ? source.length - 1 : source.length;
      return ok(v.string(), source.slice(start, end));
    }

    default: {
      // Check if this is a SchemaWithPipe — has a `pipe` property
      if ('pipe' in schema && Array.isArray((schema as { readonly pipe: unknown }).pipe)) {
        const { pipe }: { readonly pipe: readonly unknown[] } = schema as {
          readonly pipe: readonly unknown[];
        };
        if (pipe.length > 0) {
          const baseSchema: v.GenericSchema = pipe[0] as v.GenericSchema;
          const baseResult: Result<Str> = schemaToRegex(baseSchema);
          if (!baseResult.ok) {
            return baseResult;
          }
          // Introspect remaining pipe items for tighter patterns
          const pipeItems: readonly unknown[] = pipe.slice(1);
          return _introspectPipe(pipeItems, baseResult.data);
        }
      }
      // Fallback: match any string
      return ok(v.string(), STRING_PATTERN);
    }
  }
}

// =============================================================================
// Build Complete Regex
// =============================================================================

/**
 * Builds the complete anchored regex for a template literal from its parts.
 *
 * Concatenates regex fragments from all parts, wraps in `^...$`.
 *
 * @param parts - Array of string literals and schema objects.
 * @returns Result containing the compiled RegExp.
 *
 * @example
 * ```typescript
 * const result = buildRegex(['user_', v.number()]);
 * if (result.ok) result.data; // /^user_-?\d+(?:\.\d+)?$/
 * ```
 */
export function buildRegex(parts: readonly TemplateLiteralPart[]): Result<RegExp> {
  let pattern: Str = '';
  for (const part of parts) {
    if (typeof part === 'string') {
      const escapedResult: Result<Str> = escapeRegex(part);
      if (!escapedResult.ok) {
        return escapedResult;
      }
      pattern += escapedResult.data;
    } else {
      const schemaResult: Result<Str> = schemaToRegex(part as v.GenericSchema);
      if (!schemaResult.ok) {
        return schemaResult;
      }
      pattern += schemaResult.data;
    }
  }
  return ok(
    v.custom<RegExp>((val: unknown): boolean => val instanceof RegExp),
    new RegExp(`^${pattern}$`),
  );
}

// =============================================================================
// Build Expects String
// =============================================================================

/**
 * Builds the human-readable `expects` string for error messages.
 *
 * Produces a string like `` `user_${number}` `` that describes the expected pattern.
 *
 * @param parts - The template literal parts.
 * @returns Result containing the expects string.
 *
 * @example
 * ```typescript
 * const result = buildExpects(['user_', v.number()]);
 * if (result.ok) result.data; // '`user_${number}`'
 * ```
 */
export function buildExpects(parts: readonly TemplateLiteralPart[]): Result<Str> {
  let result: Str = '`';
  for (const part of parts) {
    if (typeof part === 'string') {
      result += part;
    } else {
      const schema: v.GenericSchema = part as v.GenericSchema;
      const expects: Str =
        'expects' in schema && typeof schema.expects === 'string' ? schema.expects : 'unknown';
      result += `\${${expects}}`;
    }
  }
  result += '`';
  return ok(v.string(), result);
}
