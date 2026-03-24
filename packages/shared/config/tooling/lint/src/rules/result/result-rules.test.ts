/**
 * Tests for Result lint rules.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import type { LintResult, TypeScriptRule } from '../../framework/types.ts';

import noTernaryFallback from './no-ternary-fallback.ts';
import checkBeforeAccess from './check-before-access.ts';
import noIgnoreResult from './no-ignore-result.ts';
import noRedundantOkGuard from './no-redundant-ok-guard.ts';
import requireResultType from './require-result-type.ts';
import validateFunctionInput from './validate-function-input.ts';
import requireOkReturn from './require-ok-return.ts';
import noResultFallback from './no-result-fallback.ts';

/**
 * Run a single rule against fixture source code.
 *
 * @param {TypeScriptRule} rule - The rule to test
 * @param {string} code - TypeScript source code
 * @returns {Promise<LintResult[]>} Array of lint results
 */
function lint(rule: TypeScriptRule, code: string): Promise<LintResult[]> {
  return runTypeScriptRules('test.ts', code, [rule]);
}

// =============================================================================
// result/no-ternary-fallback
// =============================================================================

describe('result/no-ternary-fallback', () => {
  it('reports result.ok ? result.data : fallback', async () => {
    const code: string = `const x = result.ok ? result.data : 'fallback';`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('Ternary fallback');
    expect(results[0].message).toContain('result');
  });

  it('passes regular ternary without .ok/.data pattern', async () => {
    const code: string = `const x = condition ? valueA : valueB;`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes .ok check without .data in consequent', async () => {
    const code: string = `const x = result.ok ? 'yes' : 'no';`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('exempts ternary inside $derived.by context', async () => {
    const code: string = `
const label = $derived.by(() => {
  return result.ok ? result.data : 'fallback';
});
`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(0);
  });

  it('reports ternary outside reactive context', async () => {
    const code: string = `
function getValue() {
  return result.ok ? result.data : null;
}
`;
    const results: LintResult[] = await lint(noTernaryFallback, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/check-before-access
// =============================================================================

describe('result/check-before-access', () => {
  it('reports .data access without .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/check-before-access');
    expect(results[0].message).toContain('result.data');
    expect(results[0].message).toContain('.ok');
  });

  it('passes .data access after .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
if (!result.ok) return result;
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('reports .error access without .ok check', async () => {
    const code: string = `
import { err } from '@/schemas/result/result';
const result = validate(input);
const msg = result.error;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('result.error');
  });

  it('detects Result variable named "response" via expanded patterns', async () => {
    const code: string = `
import { ok } from '@/schemas/result/result';
const response = fetchData();
const value = response.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('response.data');
  });

  it('ignores non-Result variable names without Result import', async () => {
    const code: string = `
const config = loadConfig();
const value = config.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('ignores .data access when no Result imports', async () => {
    const code: string = `
const result = JSON.parse(data);
const value = result.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('passes when .ok is checked via if statement', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const parsed = safeParse(Schema, data);
if (parsed.ok) {
  console.log(parsed.data);
}
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/no-ignore-result
// =============================================================================

describe('result/no-ignore-result', () => {
  it('reports ignored Result from safeParse()', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
safeParse(Schema, data);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-ignore-result');
    expect(results[0].message).toContain('safeParse');
  });

  it('passes when Result is captured', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const result = safeParse(Schema, data);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(0);
  });

  it('reports ignored Result from validate()', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
validate(input);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('validate');
  });

  it('does not flag non-Result function calls', async () => {
    const code: string = `
console.log('hello');
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(0);
  });

  it('reports ignored awaited Result', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
await fetchData(url);
`;
    const results: LintResult[] = await lint(noIgnoreResult, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('fetchData');
  });
});

// =============================================================================
// result/require-result-type
// =============================================================================

describe('result/require-result-type', () => {
  it('reports exported function with non-Result return type', async () => {
    const code: string = `
export function loadUser(id: string): Promise<User> {
  return await fetchData(id);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/require-result-type');
    expect(results[0].message).toContain('loadUser');
    expect(results[0].severity).toBe('error');
  });

  it('reports ALL exported non-void functions without Result (no mightFail heuristic)', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('add');
  });

  it('passes exported function returning Result<T>', async () => {
    const code: string = `
export function loadUser(id: string): Result<User> {
  return safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes exported function returning Promise<Result<T>>', async () => {
    const code: string = `
export async function loadUser(id: string): Promise<Result<User>> {
  return await safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes void functions', async () => {
    const code: string = `
export function logMessage(msg: string): void {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts boolean predicates (is*, has*, can*, should*)', async () => {
    const code: string = `
export function isValid(input: string): boolean {
  return input.length > 0;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('does not exempt predicates with non-boolean return', async () => {
    const code: string = `
export function isValid(input: string): string {
  return input;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('reports non-exported module-scope function with non-Result return', async () => {
    const code: string = `
function getGitInfo(): GitInfo {
  const data: string = fetchData();
  return { commit: data };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('getGitInfo');
  });

  it('passes non-exported function returning Result', async () => {
    const code: string = `
function getGitInfo(): Result<GitInfo> {
  return ok(GitInfoSchema, data);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('passes non-exported void function', async () => {
    const code: string = `
function logMessage(msg: string): void {
  console.log(msg);
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('exempts integration boundary functions with throw result.error', async () => {
    const code: string = `
export function createConfig(): UserConfig {
  const result: Result<GitInfo> = getGitInfo();
  if (!result.ok) throw result.error; // integration boundary: Vite doesn't understand Result
  return defineConfig({ plugins: [] });
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('flags function with integration boundary comment but no throw (no longer exempt)', async () => {
    const code: string = `
export function createPlugin(): Plugin {
  // integration boundary: returns Vite Plugin type
  return { name: 'my-plugin', apply: 'serve' };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });

  it('exempts function that throws result.error at integration boundary', async () => {
    const code: string = `export function createConfig(options: Options): Config {
    const result = safeParse(Schema, options);
    if (!result.ok) throw result.error; // integration boundary
    return result.data;
  }`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('still flags function without integration boundary comment', async () => {
    const code: string = `
export function createConfig(): UserConfig {
  const result: Result<GitInfo> = getGitInfo();
  return defineConfig({});
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/validate-function-input
// =============================================================================

describe('result/validate-function-input', () => {
  it('reports each unvalidated parameter individually', async () => {
    const code: string = `
export function createUser(name: string, age: number): Result<User> {
  return ok({ name, age, id: '123' });
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(2);
    expect(results[0].message).toContain("'name'");
    expect(results[1].message).toContain("'age'");
  });

  it('passes when all parameters are validated with safeParse()', async () => {
    const code: string = `
export function createUser(name: unknown, age: unknown): Result<User> {
  const nameResult = safeParse(NameSchema, name);
  if (!nameResult.ok) return nameResult;
  const ageResult = safeParse(AgeSchema, age);
  if (!ageResult.ok) return ageResult;
  return ok({ name: nameResult.data, age: ageResult.data });
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('reports only the unvalidated parameter when one is validated', async () => {
    const code: string = `
export function readFile(path: string, encoding: string): Result<string> {
  const pathResult = safeParse(PathSchema, path);
  if (!pathResult.ok) return pathResult;
  return ok(FileSchema, content);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'encoding'");
  });

  it('reports handler function without validation', async () => {
    const code: string = `
function handleSubmit(data: FormData): void {
  saveToDb(data);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'data'");
  });

  it('does not flag non-exported non-handler functions', async () => {
    const code: string = `
function helperAdd(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('does not flag functions without parameters', async () => {
    const code: string = `
export function getVersion(): string {
  return '1.0.0';
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('skips callback parameters (type contains =>)', async () => {
    const code: string = `
export function processItems(items: unknown, onDone: () => void): Result<void> {
  const itemsResult = safeParse(ItemsSchema, items);
  if (!itemsResult.ok) return itemsResult;
  return ok(VoidSchema, undefined);
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/require-ok-return
// =============================================================================

describe('result/require-ok-return', () => {
  it('reports raw object return in Result function', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return { ok: true, data: user, error: null };
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/require-ok-return');
    expect(results[0].message).toContain('raw value');
  });

  it('passes ok() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return ok(UserSchema, user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes okUnchecked() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes err() return', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return err(ERRORS.DB.NOT_FOUND);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('passes returning a variable (presumed Result)', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  const result = safeParse(UserSchema, data);
  return result;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not check functions without Result return type', async () => {
    const code: string = `
export function add(a: number, b: number): number {
  return a + b;
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags safeParse in return — should use ok() for typed values', async () => {
    const code: string = `
export function getUser(id: string): Result<User> {
  return safeParse(UserSchema, data);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('safeParse');
  });

  it('flags ok() in catch block (should be err())', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (e) {
    return ok(Schema, fallback);
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('error path');
    expect(results[0].message).toContain('err()');
  });

  it('passes err() in catch block', async () => {
    const code: string = `
export function readFile(path: string): Result<string> {
  try {
    const data = fs.readFileSync(path);
    return ok(Schema, data);
  } catch (e) {
    return err(ERRORS.IO.READ_FAILED, { cause: fromUnknownError(e) });
  }
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags okUnchecked when matching schema is available', async () => {
    const code: string = `
import { UserSchema } from '@/schemas/user';
export function getUser(id: string): Result<User> {
  return okUnchecked(user);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('UserSchema');
    expect(results[0].message).toContain('okUnchecked');
  });

  it('passes okUnchecked when no matching schema exists', async () => {
    const code: string = `
export function parseConfig(raw: string): Result<ParsedConfig> {
  return okUnchecked(parsed);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('flags safeParse() in return position — should use ok() instead', async () => {
    const code: string = `
export function getVersion(): Result<string> {
  const version: string = '1.0.0';
  return safeParse(v.string(), version);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('safeParse');
    expect(results[0].message).toContain('ok()');
    expect(results[0].tip).toContain('untrusted input');
  });

  it('passes ok() in return position', async () => {
    const code: string = `
export function getVersion(): Result<string> {
  const version: string = '1.0.0';
  return ok(v.string(), version);
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });

  it('does not flag ok() after early-return error guards', async () => {
    const code: string = `
function getGitInfo(): Result<GitInfo> {
  const a: Result<Str> = execSyncSafe('cmd1');
  if (!a.ok) return a;
  const b: Result<Str> = execSyncSafe('cmd2');
  if (!b.ok) return b;
  return ok(GitInfoSchema, { commit: a.data, full: b.data });
}
`;
    const results: LintResult[] = await lint(requireOkReturn, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 2: brace-less early returns
// =============================================================================

describe('result/check-before-access — brace-less early returns', () => {
  it('passes .data access after brace-less early return guard', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const rootResult = safeParse(Schema, data);
if (!rootResult.ok) return rootResult;
const value = rootResult.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });

  it('passes .data access after braced early return guard', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const rootResult = safeParse(Schema, data);
if (!rootResult.ok) { return rootResult; }
const value = rootResult.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 3: inline chain detection
// =============================================================================

describe('result/check-before-access — inline chains', () => {
  it('reports safeParse(...).data without .ok check', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const value = safeParse(Schema, data).data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('safeParse(...)');
    expect(results[0].message).toContain('.ok');
  });

  it('does not flag non-Result function chains', async () => {
    const code: string = `
import { safeParse } from '@/utils/result/safe';
const value = JSON.parse(text).data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/check-before-access — Fix 4: type annotation detection
// =============================================================================

describe('result/check-before-access — type annotation detection', () => {
  it('reports .data access on variable with Result type annotation', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
const cached: Result<Config> = safeParse(Schema, data);
const value = cached.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain('cached.data');
  });

  it('passes .data access on Result-typed variable after .ok check', async () => {
    const code: string = `
import type { Result } from '@/schemas/result/result';
const cached: Result<Config> = safeParse(Schema, data);
if (!cached.ok) return cached;
const value = cached.data;
`;
    const results: LintResult[] = await lint(checkBeforeAccess, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// result/no-redundant-ok-guard (Fix 6)
// =============================================================================

describe('result/no-redundant-ok-guard', () => {
  it('reports redundant guard where both branches return same variable', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) return validated;
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-redundant-ok-guard');
    expect(results[0].message).toContain('validated');
    expect(results[0].message).toContain('Redundant');
  });

  it('passes when guard returns different value than next return', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) return validated;
  return ok(Schema, transformed);
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(0);
  });

  it('passes when guard has braces and returns different value', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) {
    return err(ERRORS.INVALID);
  }
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(0);
  });

  it('reports redundant guard with braces', async () => {
    const code: string = `
function example() {
  const validated = safeParse(Schema, data);
  if (!validated.ok) { return validated; }
  return validated;
}
`;
    const results: LintResult[] = await lint(noRedundantOkGuard, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/require-result-type — Fix 7: identity function exemption
// =============================================================================

describe('result/require-result-type — identity function exemption', () => {
  it('exempts identity functions that return their parameter', async () => {
    const code: string = `
export function defineConfig(config: Partial<CoreConfig>): Partial<CoreConfig> {
  return config;
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(0);
  });

  it('does not exempt functions that transform their input', async () => {
    const code: string = `
export function processConfig(config: Partial<CoreConfig>): CoreConfig {
  return { ...defaults, ...config };
}
`;
    const results: LintResult[] = await lint(requireResultType, code);
    expect(results.length).toBe(1);
  });
});

// =============================================================================
// result/validate-function-input — Fix 8: indirect validation
// =============================================================================

describe('result/validate-function-input — indirect validation', () => {
  it('passes when parameter is transformed then safeParsed', async () => {
    const code: string = `
export function setConfig(config: Partial<CoreConfig>): Result<CoreConfig> {
  const merged = deepMerge(defaults, config);
  const validated = safeParse(CoreConfigSchema, merged);
  if (!validated.ok) return validated;
  return validated;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(0);
  });

  it('still reports when parameter is not used in any validated path', async () => {
    const code: string = `
export function setConfig(config: Partial<CoreConfig>): Result<CoreConfig> {
  const validated = safeParse(CoreConfigSchema, defaults);
  if (!validated.ok) return validated;
  return validated;
}
`;
    const results: LintResult[] = await lint(validateFunctionInput, code);
    expect(results.length).toBe(1);
    expect(results[0].message).toContain("'config'");
  });
});

// =============================================================================
// result/no-result-fallback
// =============================================================================

describe('result/no-result-fallback', () => {
  it('flags if/else fallback on Result', async () => {
    const code: string = `
let git: GitInfo;
if (gitResult.ok) {
  git = gitResult.data;
} else {
  git = { commit: 'unknown' };
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-result-fallback');
    expect(results[0].message).toContain('silently discarded');
  });

  it('flags ternary fallback on Result with literal alternate', async () => {
    const code: string = `
const version: string = versionResult.ok ? versionResult.data : 'unknown';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-result-fallback');
  });

  it('flags ternary fallback on Result with object alternate', async () => {
    const code: string = `
const git: GitInfo = gitResult.ok ? gitResult.data : { commit: 'unknown' };
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });

  it('passes if (!result.ok) return result pattern', async () => {
    const code: string = `
if (!gitResult.ok) return gitResult;
const git: GitInfo = gitResult.data;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes if (!result.ok) throw result.error pattern', async () => {
    const code: string = `
if (!gitResult.ok) throw gitResult.error;
const git: GitInfo = gitResult.data;
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('passes regular if/else without Result .ok check', async () => {
    const code: string = `
let x: number;
if (condition) {
  x = 1;
} else {
  x = 2;
}
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags nullish fallback on Result .data property', async () => {
    const code: string = `
const version: Str = (parsed.data.version as Str) ?? '0.0.0';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
    expect(results[0].ruleId).toBe('result/no-result-fallback');
    expect(results[0].message).toContain('parsed.data');
    expect(results[0].message).toContain('silently discards');
  });

  it('passes nullish coalescing without .data in chain', async () => {
    const code: string = `
const name: string = config.name ?? 'default';
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(0);
  });

  it('flags nullish fallback on .data with object literal', async () => {
    const code: string = `
const opts: Options = parsed.data.options ?? {};
`;
    const results: LintResult[] = await lint(noResultFallback, code);
    expect(results.length).toBe(1);
  });
});
