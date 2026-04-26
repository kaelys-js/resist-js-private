/**
 * Tests for Svelte 5 rune lint rules.
 *
 * Uses oxc-parser + svelte/compiler to parse fixture Svelte code and verifies
 * each rule produces the expected diagnostics.
 *
 * Phase 49 — Svelte 5 Runes Lint Rules.
 * Phase 50 — Svelte Template AST Completeness + Error Reporting.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { runTypeScriptRules } from '../../framework/oxc-runner.ts';
import {
  AstVisitorSchema,
  type AstNode,
  type LintResult,
  type TypeScriptRule,
} from '../../framework/types.ts';
import {
  parseSvelteTemplate,
  walkSvelteNode,
  type SvelteParseResult,
} from '../../framework/svelte-template.ts';

import noLegacyReactiveStatements from './no-legacy-reactive-statements.ts';
import noLegacyProps from './no-legacy-props.ts';
import requireEffectCleanup from './require-effect-cleanup.ts';
import noEffectMutation from './no-effect-mutation.ts';
import preferDerivedOverEffect from './prefer-derived-over-effect.ts';
import requireBindableForBind from './require-bindable-for-bind.ts';
import noLegacyEventHandlers from './no-legacy-event-handlers.ts';
import noCreateEventDispatcher from './no-create-event-dispatcher.ts';
import noLegacySlots from './no-legacy-slots.ts';
import requireSnippetTyping from './require-snippet-typing.ts';
import noRestPropsMisuse from './no-rest-props-misuse.ts';
import preferDerivedBy from './prefer-derived-by.ts';
import noStateInModuleContext from './no-state-in-module-context.ts';
import componentNaming from './component-naming.ts';
import noInlineStyles from './no-inline-styles.ts';
import requireEachKey from './require-each-key.ts';
import noReactiveClassProperties from './no-reactive-class-properties.ts';
import noUntrackMisuse from './no-untrack-misuse.ts';

/**
 * Run a single rule against fixture Svelte source code.
 *
 * @param rule - The rule to test
 * @param code - Svelte source code (full .svelte file with script + template)
 * @param filename - File name (defaults to Component.svelte)
 * @returns Array of lint results
 */
function lint(rule: TypeScriptRule, code: string, filename?: string): Promise<LintResult[]> {
  return runTypeScriptRules(filename ?? '/project/Component.svelte', code, [rule]);
}

/**
 * Wrap TypeScript code in a Svelte script block for testing.
 *
 * @param script - TypeScript code for the script block
 * @param template - Optional template HTML
 * @returns Full Svelte file content
 */
function svelte(script: string, template?: string): string {
  const parts: string[] = ['<script lang="ts">', script, '</script>'];
  if (template) {
    parts.push('', template);
  }
  return parts.join('\n');
}

// =============================================================================
// svelte5/no-legacy-reactive-statements
// =============================================================================

describe('svelte5/no-legacy-reactive-statements', () => {
  it('reports $: reactive statement', async () => {
    const code: string = svelte('  $: doubled = count * 2;');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'$:'");
  });

  it('reports $: block statement', async () => {
    const code: string = svelte('  $: { console.log(count); }');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    expect(results.length).toBe(1);
  });

  it('allows $derived', async () => {
    const code: string = svelte('  let doubled = $derived(count * 2);');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    expect(results.length).toBe(0);
  });

  it('allows $effect', async () => {
    const code: string = svelte('  $effect(() => console.log(count));');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    expect(results.length).toBe(0);
  });

  it('ignores labeled statements with non-$ label', async () => {
    const code: string = svelte('  loop: for (let i = 0; i < 10; i++) { break loop; }');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-legacy-props
// =============================================================================

describe('svelte5/no-legacy-props', () => {
  it('reports export let prop', async () => {
    const code: string = svelte('  export let name: string;');
    const results: LintResult[] = await lint(noLegacyProps, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('export let name');
  });

  it('reports multiple export let props', async () => {
    const code: string = svelte('  export let a: string, b: number;');
    const results: LintResult[] = await lint(noLegacyProps, code);
    expect(results.length).toBe(2);
  });

  it('allows $props destructuring', async () => {
    const code: string = svelte('  let { name } = $props();');
    const results: LintResult[] = await lint(noLegacyProps, code);
    expect(results.length).toBe(0);
  });

  it('allows export const', async () => {
    const code: string = svelte('  export const MAX = 100;');
    const results: LintResult[] = await lint(noLegacyProps, code);
    expect(results.length).toBe(0);
  });

  it('allows export function', async () => {
    const code: string = svelte('  export function greet() { return "hi"; }');
    const results: LintResult[] = await lint(noLegacyProps, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/require-effect-cleanup
// =============================================================================

describe('svelte5/require-effect-cleanup', () => {
  it('reports $effect with addEventListener but no cleanup', async () => {
    const code: string = svelte(`
  $effect(() => {
    window.addEventListener('resize', handler);
  });`);
    const results: LintResult[] = await lint(requireEffectCleanup, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('addEventListener');
  });

  it('reports $effect with setInterval but no cleanup', async () => {
    const code: string = svelte(`
  $effect(() => {
    setInterval(tick, 1000);
  });`);
    const results: LintResult[] = await lint(requireEffectCleanup, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('setInterval');
  });

  it('allows $effect with cleanup return', async () => {
    const code: string = svelte(`
  $effect(() => {
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  });`);
    const results: LintResult[] = await lint(requireEffectCleanup, code);
    expect(results.length).toBe(0);
  });

  it('allows $effect with returned function variable', async () => {
    const code: string = svelte(`
  $effect(() => {
    const unsub = store.subscribe(handler);
    return unsub;
  });`);
    const results: LintResult[] = await lint(requireEffectCleanup, code);
    expect(results.length).toBe(0);
  });

  it('allows $effect without subscriptions', async () => {
    const code: string = svelte(`
  $effect(() => {
    console.log(count);
  });`);
    const results: LintResult[] = await lint(requireEffectCleanup, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-effect-mutation
// =============================================================================

describe('svelte5/no-effect-mutation', () => {
  it('reports unguarded $state mutation in $effect', async () => {
    const code: string = svelte(`
  let count = $state(0);
  $effect(() => {
    count = count + 1;
  });`);
    const results: LintResult[] = await lint(noEffectMutation, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'count'");
  });

  it('allows guarded $state mutation in $effect', async () => {
    const code: string = svelte(`
  let count = $state(0);
  $effect(() => {
    if (someCondition) {
      count = 10;
    }
  });`);
    const results: LintResult[] = await lint(noEffectMutation, code);
    expect(results.length).toBe(0);
  });

  it('allows mutation of non-$state variables in $effect', async () => {
    const code: string = svelte(`
  let count = $state(0);
  let local = 0;
  $effect(() => {
    local = count + 1;
  });`);
    const results: LintResult[] = await lint(noEffectMutation, code);
    expect(results.length).toBe(0);
  });

  it('ignores files without $state', async () => {
    const code: string = svelte(`
  $effect(() => {
    something = 5;
  });`);
    const results: LintResult[] = await lint(noEffectMutation, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/prefer-derived-over-effect
// =============================================================================

describe('svelte5/prefer-derived-over-effect', () => {
  it('reports $effect that only sets a $state variable', async () => {
    const code: string = svelte(`
  let count = $state(0);
  let doubled = $state(0);
  $effect(() => {
    doubled = count * 2;
  });`);
    const results: LintResult[] = await lint(preferDerivedOverEffect, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain("'doubled'");
  });

  it('allows $effect with multiple statements', async () => {
    const code: string = svelte(`
  let count = $state(0);
  let doubled = $state(0);
  $effect(() => {
    console.log('updating');
    doubled = count * 2;
  });`);
    const results: LintResult[] = await lint(preferDerivedOverEffect, code);
    expect(results.length).toBe(0);
  });

  it('allows $derived usage', async () => {
    const code: string = svelte(`
  let count = $state(0);
  let doubled = $derived(count * 2);`);
    const results: LintResult[] = await lint(preferDerivedOverEffect, code);
    expect(results.length).toBe(0);
  });

  it('allows $effect setting non-$state variable', async () => {
    const code: string = svelte(`
  let count = $state(0);
  let local = 0;
  $effect(() => {
    local = count * 2;
  });`);
    const results: LintResult[] = await lint(preferDerivedOverEffect, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/require-bindable-for-bind
// =============================================================================

describe('svelte5/require-bindable-for-bind', () => {
  it('reports bind: on non-$bindable prop', async () => {
    const code: string = svelte('  let { value } = $props();', '<input bind:value />');
    const results: LintResult[] = await lint(requireBindableForBind, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'value'");
  });

  it('allows bind: on $bindable prop', async () => {
    const code: string = svelte(
      '  let { value = $bindable() } = $props();',
      '<input bind:value />',
    );
    const results: LintResult[] = await lint(requireBindableForBind, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-legacy-event-handlers
// =============================================================================

describe('svelte5/no-legacy-event-handlers', () => {
  it('reports on:click directive', async () => {
    const code: string = svelte(
      '  function handleClick() {}',
      '<button on:click={handleClick}>Click</button>',
    );
    const results: LintResult[] = await lint(noLegacyEventHandlers, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain("'on:click'");
  });

  it('allows onclick attribute', async () => {
    const code: string = svelte(
      '  function handleClick() {}',
      '<button onclick={handleClick}>Click</button>',
    );
    const results: LintResult[] = await lint(noLegacyEventHandlers, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-create-event-dispatcher
// =============================================================================

describe('svelte5/no-create-event-dispatcher', () => {
  it('reports import of createEventDispatcher', async () => {
    const code: string = svelte("  import { createEventDispatcher } from 'svelte';");
    const results: LintResult[] = await lint(noCreateEventDispatcher, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('createEventDispatcher');
  });

  it('allows other svelte imports', async () => {
    const code: string = svelte("  import { onMount } from 'svelte';");
    const results: LintResult[] = await lint(noCreateEventDispatcher, code);
    expect(results.length).toBe(0);
  });

  it('allows createEventDispatcher from non-svelte module', async () => {
    const code: string = svelte("  import { createEventDispatcher } from './utils';");
    const results: LintResult[] = await lint(noCreateEventDispatcher, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-legacy-slots
// =============================================================================

describe('svelte5/no-legacy-slots', () => {
  it('reports <slot> element', async () => {
    const code: string = svelte('  let x = 1;', '<slot />');
    const results: LintResult[] = await lint(noLegacySlots, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('<slot>');
  });

  it('reports $$slots usage in script', async () => {
    const code: string = svelte('  if ($$slots.default) { console.log("has slot"); }');
    const results: LintResult[] = await lint(noLegacySlots, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('$$slots');
  });

  it('allows {@render} snippets', async () => {
    const code: string = svelte('  let { children } = $props();', '{@render children?.()}');
    const results: LintResult[] = await lint(noLegacySlots, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/require-snippet-typing
// =============================================================================

describe('svelte5/require-snippet-typing', () => {
  it('reports untyped snippet prop used with @render', async () => {
    const code: string = svelte('  let { children } = $props();', '{@render children()}');
    const results: LintResult[] = await lint(requireSnippetTyping, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain("'children'");
  });

  it('allows typed snippet prop', async () => {
    const code: string = svelte(
      `  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();`,
      '{@render children()}',
    );
    const results: LintResult[] = await lint(requireSnippetTyping, code);
    expect(results.length).toBe(0);
  });

  it('skips non-TypeScript files', async () => {
    const code: string = [
      '<script>',
      '  let { children } = $props();',
      '</script>',
      '',
      '{@render children()}',
    ].join('\n');
    const results: LintResult[] = await lint(requireSnippetTyping, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-rest-props-misuse
// =============================================================================

describe('svelte5/no-rest-props-misuse', () => {
  it('reports $$restProps usage', async () => {
    const code: string = svelte('  const x = $$restProps;');
    const results: LintResult[] = await lint(noRestPropsMisuse, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('$$restProps');
  });

  it('reports $$props usage', async () => {
    const code: string = svelte('  const x = $$props;');
    const results: LintResult[] = await lint(noRestPropsMisuse, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('$$props');
  });

  it('allows $props() rest destructuring', async () => {
    const code: string = svelte('  let { known, ...rest } = $props();');
    const results: LintResult[] = await lint(noRestPropsMisuse, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/prefer-derived-by
// =============================================================================

describe('svelte5/prefer-derived-by', () => {
  it('reports $derived with 3+ chained method calls', async () => {
    const code: string = svelte(
      '  let sorted = $derived(items.filter(Boolean).sort().slice(0, 10));',
    );
    const results: LintResult[] = await lint(preferDerivedBy, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('$derived.by()');
  });

  it('allows $derived with simple expression', async () => {
    const code: string = svelte('  let doubled = $derived(count * 2);');
    const results: LintResult[] = await lint(preferDerivedBy, code);
    expect(results.length).toBe(0);
  });

  it('allows $derived with 2 chained calls', async () => {
    const code: string = svelte('  let filtered = $derived(items.filter(Boolean).sort());');
    const results: LintResult[] = await lint(preferDerivedBy, code);
    expect(results.length).toBe(0);
  });

  it('allows $derived.by()', async () => {
    const code: string = svelte(`
  let sorted = $derived.by(() => {
    const filtered = items.filter(Boolean);
    return filtered.sort().slice(0, 10);
  });`);
    const results: LintResult[] = await lint(preferDerivedBy, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-state-in-module-context
// =============================================================================

describe('svelte5/no-state-in-module-context', () => {
  it('reports $state in module context', async () => {
    const code: string = [
      '<script module>',
      '  let shared = $state(0);',
      '</script>',
      '<script lang="ts">',
      '  let count = $state(0);',
      '</script>',
    ].join('\n');
    const results: LintResult[] = await lint(noStateInModuleContext, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('module context');
  });

  it('allows $state in instance script only', async () => {
    const code: string = svelte('  let count = $state(0);');
    const results: LintResult[] = await lint(noStateInModuleContext, code);
    expect(results.length).toBe(0);
  });

  it('allows module context without $state', async () => {
    const code: string = [
      '<script module>',
      '  export const API_URL = "/api";',
      '</script>',
      '<script lang="ts">',
      '  let count = $state(0);',
      '</script>',
    ].join('\n');
    const results: LintResult[] = await lint(noStateInModuleContext, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/component-naming
// =============================================================================

describe('svelte5/component-naming', () => {
  it('reports non-PascalCase component file', async () => {
    const code: string = svelte('  let x = 1;');
    const results: LintResult[] = await lint(componentNaming, code, '/project/my-component.svelte');
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('PascalCase');
    expect(results[0]?.message).toContain('MyComponent.svelte');
  });

  it('allows PascalCase component file', async () => {
    const code: string = svelte('  let x = 1;');
    const results: LintResult[] = await lint(componentNaming, code, '/project/MyComponent.svelte');
    expect(results.length).toBe(0);
  });

  it('exempts SvelteKit convention files', async () => {
    const code: string = svelte('  let x = 1;');
    const results: LintResult[] = await lint(componentNaming, code, '/project/+page.svelte');
    expect(results.length).toBe(0);
  });

  it('exempts +layout.svelte', async () => {
    const code: string = svelte('  let x = 1;');
    const results: LintResult[] = await lint(componentNaming, code, '/project/+layout.svelte');
    expect(results.length).toBe(0);
  });

  it('reports snake_case component file', async () => {
    const code: string = svelte('  let x = 1;');
    const results: LintResult[] = await lint(componentNaming, code, '/project/user_card.svelte');
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('UserCard.svelte');
  });
});

// =============================================================================
// svelte5/no-inline-styles
// =============================================================================

describe('svelte5/no-inline-styles', () => {
  it('reports hardcoded inline style attribute', async () => {
    const code: string = svelte('  let x = 1;', '<div style="color: red;">text</div>');
    const results: LintResult[] = await lint(noInlineStyles, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('inline styles');
  });

  it('allows style: directive', async () => {
    const code: string = svelte('  let color = "red";', '<div style:color={color}>text</div>');
    const results: LintResult[] = await lint(noInlineStyles, code);
    expect(results.length).toBe(0);
  });

  it('allows dynamic style attribute', async () => {
    const code: string = svelte('  let style = "color: red";', '<div style={style}>text</div>');
    const results: LintResult[] = await lint(noInlineStyles, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/require-each-key
// =============================================================================

describe('svelte5/require-each-key', () => {
  it('reports {#each} without key', async () => {
    const code: string = svelte(
      '  let items = $state([]);',
      '{#each items as item}<div>{item}</div>{/each}',
    );
    const results: LintResult[] = await lint(requireEachKey, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('error');
    expect(results[0]?.message).toContain('key expression');
  });

  it('allows {#each} with key', async () => {
    const code: string = svelte(
      '  let items = $state([]);',
      '{#each items as item (item.id)}<div>{item}</div>{/each}',
    );
    const results: LintResult[] = await lint(requireEachKey, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-reactive-class-properties
// =============================================================================

describe('svelte5/no-reactive-class-properties', () => {
  it('reports $state on class property', async () => {
    const code: string = svelte(`
  class Counter {
    count = $state(0);
  }`);
    const results: LintResult[] = await lint(noReactiveClassProperties, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('class property');
  });

  it('allows $state in regular variable', async () => {
    const code: string = svelte('  let count = $state(0);');
    const results: LintResult[] = await lint(noReactiveClassProperties, code);
    expect(results.length).toBe(0);
  });

  it('allows class property without $state', async () => {
    const code: string = svelte(`
  class Counter {
    count = 0;
  }`);
    const results: LintResult[] = await lint(noReactiveClassProperties, code);
    expect(results.length).toBe(0);
  });
});

// =============================================================================
// svelte5/no-untrack-misuse
// =============================================================================

describe('svelte5/no-untrack-misuse', () => {
  it('reports untrack on literal value', async () => {
    const code: string = svelte(`
  import { untrack } from 'svelte';
  let count = $state(0);
  $effect(() => {
    const x = untrack(() => 5);
  });`);
    const results: LintResult[] = await lint(noUntrackMisuse, code);
    expect(results.length).toBe(1);
    expect(results[0]?.severity).toBe('warning');
    expect(results[0]?.message).toContain('non-reactive');
  });

  it('reports untrack on non-reactive variable', async () => {
    const code: string = svelte(`
  import { untrack } from 'svelte';
  let count = $state(0);
  const config = { theme: 'dark' };
  $effect(() => {
    const y = untrack(() => config.theme);
  });`);
    const results: LintResult[] = await lint(noUntrackMisuse, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('non-reactive');
  });

  it('allows untrack on $state variable', async () => {
    const code: string = svelte(`
  import { untrack } from 'svelte';
  let count = $state(0);
  let previous = $state(0);
  $effect(() => {
    if (count !== untrack(() => previous)) {
      previous = count;
    }
  });`);
    const results: LintResult[] = await lint(noUntrackMisuse, code);
    expect(results.length).toBe(0);
  });

  it('allows untrack on $derived variable', async () => {
    const code: string = svelte(`
  import { untrack } from 'svelte';
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => {
    console.log(untrack(() => doubled));
  });`);
    const results: LintResult[] = await lint(noUntrackMisuse, code);
    expect(results.length).toBe(0);
  });

  it('reports untrack on pure function call', async () => {
    const code: string = svelte(`
  import { untrack } from 'svelte';
  let count = $state(0);
  $effect(() => {
    const z = untrack(() => Math.random());
  });`);
    const results: LintResult[] = await lint(noUntrackMisuse, code);
    expect(results.length).toBe(1);
    expect(results[0]?.message).toContain('Math.random()');
  });
});

// =============================================================================
// Phase 50 — Svelte Template AST Completeness + Error Reporting
// =============================================================================

describe('Phase 50 — error reporting', () => {
  it('invalid Svelte syntax produces a warning diagnostic with descriptive message', async () => {
    const code: string = [
      '<script lang="ts">',
      '  let x = 1;',
      '</script>',
      '',
      '{#each}',
      '<div>test</div>',
      '{/each}',
    ].join('\n');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    const parseErrors: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'svelte5/template-parse-error',
    );
    expect(parseErrors.length).toBe(1);
    expect(parseErrors[0]?.severity).toBe('error');
    expect(parseErrors[0]?.message).toContain('Svelte template parse error');
    expect(parseErrors[0]?.message).toContain('template-based lint rules were skipped');
    expect(parseErrors[0]?.line).toBe(1);
    expect(parseErrors[0]?.column).toBe(1);
  });

  it('valid Svelte file produces no parse error diagnostic', async () => {
    const code: string = svelte('  let x = $state(0);', '<div>{x}</div>');
    const results: LintResult[] = await lint(noLegacyReactiveStatements, code);
    const parseErrors: LintResult[] = results.filter(
      (r: LintResult): boolean => r.ruleId === 'svelte5/template-parse-error',
    );
    expect(parseErrors.length).toBe(0);
  });
});

describe('Phase 50 — AST visitor schema completeness', () => {
  it('all 37 Svelte visitor types are registered in AstVisitorSchema', () => {
    const schemaKeys: string[] = Object.keys(AstVisitorSchema.entries);

    const svelteTypes: string[] = [
      // Original 17 (Phase 49)
      'Fragment',
      'RegularElement',
      'Component',
      'Attribute',
      'BindDirective',
      'OnDirective',
      'StyleDirective',
      'ClassDirective',
      'EachBlock',
      'IfBlock',
      'AwaitBlock',
      'KeyBlock',
      'SnippetBlock',
      'SlotElement',
      'RenderTag',
      'HtmlTag',
      'ExpressionTag',
      // New 20 (Phase 50)
      'Text',
      'Comment',
      'ConstTag',
      'DebugTag',
      'AttachTag',
      'AnimateDirective',
      'LetDirective',
      'TransitionDirective',
      'UseDirective',
      'SpreadAttribute',
      'TitleElement',
      'SvelteBody',
      'SvelteComponent',
      'SvelteDocument',
      'SvelteElement',
      'SvelteFragment',
      'SvelteBoundary',
      'SvelteHead',
      'SvelteSelf',
      'SvelteWindow',
    ];

    expect(svelteTypes.length).toBe(37);
    for (const type of svelteTypes) {
      expect(schemaKeys).toContain(type);
    }
  });
});

describe('Phase 50 — template AST walker coverage', () => {
  it('walker visits all node types in a complex Svelte template', async () => {
    const templateContent: string = [
      '<script lang="ts">',
      '  let items = [{id: 1}];',
      '  let flag = true;',
      '</script>',
      '',
      '<!-- a comment -->',
      '<svelte:head><title>Test Title</title></svelte:head>',
      '<svelte:window bind:innerWidth={w} />',
      '<svelte:body onclick={fn} />',
      '<svelte:document onvisibilitychange={fn} />',
      '',
      '<div class="wrapper" class:active={flag} style:color="red" bind:this={el} use:action transition:fade {...rest}>',
      '  some text content',
      '  {expr}',
      '  {@html raw}',
      '  {@const doubled = items.length * 2}',
      '  {@debug doubled}',
      '  {#if flag}',
      '    <span>conditional</span>',
      '  {/if}',
      '  {#each items as item (item.id)}',
      '    <p animate:flip>{item.name}</p>',
      '  {/each}',
      '  {#key flag}',
      '    <div>keyed</div>',
      '  {/key}',
      '  {#snippet greeting()}',
      '    <em>hello</em>',
      '  {/snippet}',
      '  {@render greeting()}',
      '  <slot />',
      '  <Comp />',
      '  {#await promise then value}',
      '    <b>{value}</b>',
      '  {/await}',
      '  <svelte:element this="div">dynamic</svelte:element>',
      '</div>',
      '',
      '<svelte:boundary onerror={fn}>',
      '  <div>safe</div>',
      '</svelte:boundary>',
    ].join('\n');

    const result: SvelteParseResult = await parseSvelteTemplate(templateContent);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const visitedTypes: Set<string> = new Set<string>();
    walkSvelteNode(result.ast, (node: AstNode): void => {
      visitedTypes.add(node.type);
    });

    // Verify at least 31 distinct Svelte template AST node types are visited
    const expectedTypes: string[] = [
      'Fragment',
      'Text',
      'Comment',
      'RegularElement',
      'Attribute',
      'BindDirective',
      'ClassDirective',
      'StyleDirective',
      'UseDirective',
      'TransitionDirective',
      'AnimateDirective',
      'SpreadAttribute',
      'ExpressionTag',
      'HtmlTag',
      'ConstTag',
      'DebugTag',
      'IfBlock',
      'EachBlock',
      'KeyBlock',
      'SnippetBlock',
      'AwaitBlock',
      'RenderTag',
      'SlotElement',
      'Component',
      'SvelteHead',
      'TitleElement',
      'SvelteWindow',
      'SvelteBody',
      'SvelteDocument',
      'SvelteElement',
      'SvelteBoundary',
    ];

    const visitedArray: string[] = [...visitedTypes];
    for (const type of expectedTypes) {
      expect(visitedArray).toContain(type);
    }
    expect(visitedTypes.size).toBeGreaterThanOrEqual(31);
  });
});
