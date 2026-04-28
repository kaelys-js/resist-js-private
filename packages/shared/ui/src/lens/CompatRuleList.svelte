<script lang="ts">
  /**
   * Compatibility rule table — displays the R0–R23 pass/fail breakdown,
   * plus optional per-component accessibility failures and unsupported browsers.
   *
   * Shared by CompatTooltip (tooltip content) and the component detail page
   * (amber banner). Renders a `<table>` with Rule, Name, and Status columns.
   * Each row shows a colored badge indicating the ruleset (Lens, A11y, Browser).
   *
   * A11y and browser data are passed as optional props, filtered by the caller.
   *
   * @module
   */
  import type { Num, Str } from '@/schemas/common';
  import type { A11yRuleResult } from '@/ui/lens/detect-accessibility.js';
  import type { BrowserSupport } from '@/ui/lens/detect-browser-support.js';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';

  /** Compatibility rule table props. */
  const {
    ruleNames,
    violations,
    showAllRules = true,
    embedded = false,
    a11yRules = [],
    unsupportedBrowsers = [],
  }: {
    /** Ordered rule name strings. @values LENS_RULE_NAMES */
    ruleNames: readonly Str[];
    /** Set of rule indices that have violations. @values new Set([0, 1, 5]) */
    violations: Set<Num>;
    /** When true, show all rules (pass + fail). When false, show only failures. @values true, false */
    showAllRules?: boolean;
    /** When true, skip rounded-lg border (parent provides container styling). @values true, false */
    embedded?: boolean;
    /** Per-component accessibility rule failures (pre-filtered by caller). @values filteredA11yRules */
    a11yRules?: A11yRuleResult[];
    /** Unsupported browsers (global, only for overview page). @values unsupportedBrowsers */
    unsupportedBrowsers?: BrowserSupport[];
  } = $props();
</script>

<div
  class={embedded
    ? 'overflow-hidden bg-card text-card-foreground'
    : 'overflow-hidden rounded-lg border bg-card text-card-foreground'}
>
  <table class="w-full text-xs">
    <thead>
      <tr class="border-b bg-muted/50">
        <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Rule</th>
        <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Name</th>
        <th class="px-3 py-1.5 text-right font-medium text-muted-foreground">Status</th>
      </tr>
    </thead>
    <tbody>
      <!-- Lens rules (R0–R23) -->
      {#each ruleNames as ruleName, ruleIdx (ruleIdx)}
        {@const failed = violations.has(ruleIdx as Num)}
        {#if showAllRules || failed}
          <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
            <td class="px-3 py-1.5 text-muted-foreground">
              <span class="inline-flex items-center gap-1.5">
                <span
                  class="inline-flex whitespace-nowrap rounded bg-blue-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-blue-600 dark:text-blue-400"
                  >Lens</span
                >
                <span class="font-mono">R{ruleIdx}</span>
              </span>
            </td>
            <td class="px-3 py-1.5">{ruleName}</td>
            <td class="px-3 py-1.5 text-right">
              {#if failed}
                <span
                  class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400"
                >
                  <CircleX class="size-3" />
                  Fail
                </span>
              {:else}
                <span
                  class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-600 dark:text-green-400"
                >
                  <CircleCheck class="size-3" />
                  Pass
                </span>
              {/if}
            </td>
          </tr>
        {/if}
      {/each}

      <!-- Accessibility rules (per-component or global) -->
      {#each a11yRules as rule (rule.id)}
        <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
          <td class="px-3 py-1.5 text-muted-foreground">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="inline-flex whitespace-nowrap rounded bg-purple-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-purple-600 dark:text-purple-400"
                >{rule.standard}</span
              >
              <span class="font-mono">{rule.wcag}</span>
            </span>
          </td>
          <td class="px-3 py-1.5">{rule.label}</td>
          <td class="px-3 py-1.5 text-right">
            <span
              class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400"
            >
              <CircleX class="size-3" />
              {rule.failCount} Fail
            </span>
          </td>
        </tr>
      {/each}

      <!-- Unsupported browsers (global only) -->
      {#each unsupportedBrowsers as browser (browser.name)}
        <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
          <td class="px-3 py-1.5 text-muted-foreground">
            <span class="inline-flex items-center gap-1.5">
              <span
                class="inline-flex whitespace-nowrap rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-600 dark:text-amber-400"
                >Browser</span
              >
            </span>
          </td>
          <td class="px-3 py-1.5">{browser.name} — {browser.notes}</td>
          <td class="px-3 py-1.5 text-right">
            <span
              class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400"
            >
              <CircleX class="size-3" />
              Unsupported
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
