<script lang="ts">
  /**
   * Compatibility rule table — displays the R0–R17 pass/fail breakdown
   * in a table format matching the Browser Support page pattern.
   *
   * Shared by CompatTooltip (tooltip content) and the component detail page
   * (amber banner). Renders a `<table>` with Rule, Name, and Status columns.
   */
  import type { Num, Str } from '@/schemas/common';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleX from '@lucide/svelte/icons/circle-x';

  /** Compatibility rule table props. */
  const {
    ruleNames,
    violations,
    showAllRules = true,
  }: {
    /** Ordered rule name strings. @values LENS_RULE_NAMES */
    ruleNames: readonly Str[];
    /** Set of rule indices that have violations. @values new Set([0, 1, 5]) */
    violations: Set<Num>;
    /** When true, show all rules (pass + fail). When false, show only failures. @values true, false */
    showAllRules?: boolean;
  } = $props();
</script>

<div class="overflow-hidden rounded-lg border bg-card">
  <table class="w-full text-xs">
    <thead>
      <tr class="border-b bg-muted/50">
        <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Rule</th>
        <th class="px-3 py-1.5 text-left font-medium text-muted-foreground">Name</th>
        <th class="px-3 py-1.5 text-right font-medium text-muted-foreground">Status</th>
      </tr>
    </thead>
    <tbody>
      {#each ruleNames as ruleName, ruleIdx (ruleIdx)}
        {@const failed = violations.has(ruleIdx as Num)}
        {#if showAllRules || failed}
          <tr class="border-b transition-colors last:border-b-0 hover:bg-muted/40">
            <td class="px-3 py-1.5 font-mono text-muted-foreground">R{ruleIdx}</td>
            <td class="px-3 py-1.5">{ruleName}</td>
            <td class="px-3 py-1.5 text-right">
              {#if failed}
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-600 dark:text-red-400"
                >
                  <CircleX class="size-3" />
                  Fail
                </span>
              {:else}
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 font-medium text-green-600 dark:text-green-400"
                >
                  <CircleCheck class="size-3" />
                  Pass
                </span>
              {/if}
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
</div>
