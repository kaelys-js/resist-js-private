I'm building a custom linting system for my monorepo. The linter uses oxc-parser for AST parsing and runs custom TypeScript rules.

**Stack:** Svelte 5, SvelteKit, Cloudflare (Workers, D1, KV, R2, Queues), Capacitor, Pulumi, Valibot

**Existing coverage:**
- Oxlint (660+ rules) handles: TypeScript safety, imports, promises, a11y, testing, general JS
- 66 Valibot rules already implemented

**Rule output location:** `_INTEGRATE/_rules/{category}.md`

**Rule spec format:**

```markdown
# {Category Name} Lint Rules

Implement the **{Category}** lint rules ({N} rules).

Create files in: `_INTEGRATE/linter-test/scripts/rules/typescript/{category}/`

File patterns: {relevant file patterns}

---

## Already Covered by Oxlint

{List any rules oxlint already handles - do not implement these}

---

## Rules to Implement

### 1. `{category}/rule-name`

**What it catches:** {description}

**Why:** {reason this matters}

**Detection:** {how to detect in AST}

\`\`\`typescript
// ❌ Bad
{bad example}

// ✅ Good
{good example}
\`\`\`

**Error message:** `{error message with ${interpolation}}`

**Tip:** `{helpful tip}`

**Severity:** {error|warning}

---

{repeat for each rule}

## Summary

| Rule | Severity | Category |
|------|----------|----------|
| ... | ... | ... |

**Total: {N} rules**

Instructions:

First check what oxlint already covers for this category (search web if needed)
Write exhaustive rule specs for rules NOT covered by oxlint
Include detection logic, bad/good examples, error messages, tips
Write to _INTEGRATE/_rules/{category}.md (you can read existing structure from one of the files already tehre)
Category to implement: {CATEGORY_NAME}
List of oxlint rules: https://oxc.rs/docs/guide/usage/linter/rules

CATEGORY_NAME = Common bugs & edge cases

List rules first before writing file
====== <<<>>>
I'm building a custom linting system for my monorepo. The linter uses oxc-parser for AST parsing and runs custom TypeScript rules.

**Stack:** Svelte 5, SvelteKit, Cloudflare (Workers, D1, KV, R2, Queues), Capacitor, Pulumi, Valibot

**Existing coverage:**
- Oxlint handles: TypeScript safety, imports, promises, a11y, testing, general JS
- 66 Valibot rules already implemented (schema patterns, Result<T,E>, error maps, i18n)

**Rule structure location:** `_INTEGRATE/linter-test/scripts/rules/typescript/`

**Rule file pattern:**
```typescript
import type { TypeScriptRule, LintResult, AstNode, VisitorContext } from '../../types.js';

const rule: TypeScriptRule = {
  id: 'category/rule-name',
  description: '...',
  categories: ['typescript', 'category'],
  stages: ['lint', 'check', 'ci'],
  scope: {
    type: 'file',
    patterns: ['**/*.ts', '**/*.svelte'],
  },
  visitor: {
    NodeType(node: AstNode, context: VisitorContext): LintResult[] {
      // Detection logic
    },
  },
  async check(context: VisitorContext): Promise<LintResult[]> {
    // File-level checks
  },
};
export default rule;

Helper functions available in oxc-runner.ts:

hasImport(module, imports) - Check if module is imported
getNamespaceAlias(module, imports) - Get namespace alias (e.g., v for valibot)
getNamespaceMethodName(node, alias) - Get method name from namespace call
isNamespaceMethodCall(node, alias, method) - Check specific method call
LintResult structure:

{
  file: string,
  line: number,
  column: number,
  severity: 'error' | 'warning',
  message: string,
  ruleId: string,
  tip?: string,
  example?: string,
}

I will now give you the specific category to implement.

--

