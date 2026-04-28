<script lang="ts">
  /**
   * Compatibility tooltip — shows a CircleCheck/CircleAlert icon with a tooltip
   * containing the CompatRuleList table (Lens rules + per-component a11y failures).
   *
   * Used in All Components, Category, and Sidebar views.
   * A11y data is loaded from context and filtered to the specific component.
   * Browser support is global and NOT shown in per-component tooltips.
   *
   * @module
   */
  import type { Num, Str } from '@/schemas/common';
  import type { LensCompatibility } from '@/ui/lens/lens-utils.js';
  import type { A11yRuleResult } from '@/ui/lens/detect-accessibility.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CompatRuleList from './CompatRuleList.svelte';
  import { getContext } from 'svelte';

  /** Compatibility tooltip props. */
  const {
    compat,
    ruleNames,
    componentName = '' as Str,
    borderTop = false,
  }: {
    /** Lens compatibility result for a single component. @values compatByName.get(name) */
    compat: LensCompatibility | undefined;
    /** Ordered rule name strings (R0–R17). @values LENS_RULE_NAMES */
    ruleNames: readonly Str[];
    /** Component directory name for filtering a11y rules. @values 'button', 'badge' */
    componentName?: Str;
    /** When true, render with a top border separator (sidebar style). @values true, false */
    borderTop?: boolean;
  } = $props();

  /** Whether all compatibility rules pass. */
  const isCompat: boolean = $derived(compat?.compatible === true);

  /** Set of failing rule indices. */
  const failedRules: Set<Num> = $derived(
    new Set((compat?.violations ?? []).map((vi) => vi.rule as Num)),
  );

  /** Global accessibility rules from layout context. */
  const allA11yRules: A11yRuleResult[] = getContext<A11yRuleResult[]>('lens-a11y-failures') ?? [];

  /** A11y rules filtered to only those that fail for this specific component, with per-component failCount. */
  const componentA11yRules: A11yRuleResult[] = $derived(
    componentName
      ? allA11yRules
          .filter((rule: A11yRuleResult): boolean =>
            rule.failingFiles.some(
              (f: Str): boolean =>
                f.includes(`/${componentName}/`) || f.includes(`/${componentName}.`),
            ),
          )
          .map(
            (rule: A11yRuleResult): A11yRuleResult => ({
              ...rule,
              failCount: rule.failingFiles.filter(
                (f: Str): boolean =>
                  f.includes(`/${componentName}/`) || f.includes(`/${componentName}.`),
              ).length as typeof rule.failCount,
            }),
          )
      : [],
  );

  /** Whether there are any a11y violations for this component. */
  const hasA11yIssues: boolean = $derived(componentA11yRules.length > 0);
</script>

<Tooltip.Provider disableHoverableContent={false}>
  <Tooltip.Root delayDuration={200}>
    <Tooltip.Trigger>
      {#snippet child({ props: compatTip })}
        <span {...compatTip}>
          {#if isCompat && !hasA11yIssues}
            <CircleCheck class="size-4 text-emerald-500" />
          {:else}
            <CircleAlert class="size-4 text-amber-500" />
          {/if}
        </span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content
      sideOffset={2}
      class="w-96 max-w-[min(24rem,90vw)] max-h-[min(24rem,80vh)] overflow-y-auto rounded-lg p-0"
      arrowClasses="bg-muted"
    >
      {#if borderTop}
        <div class="border-t border-border">
          <CompatRuleList
            {ruleNames}
            violations={failedRules}
            embedded={true}
            a11yRules={componentA11yRules}
          />
        </div>
      {:else if isCompat && !hasA11yIssues}
        <p class="px-3 py-2 text-xs">All compatibility rules pass</p>
      {:else if compat}
        <CompatRuleList
          {ruleNames}
          violations={failedRules}
          embedded={true}
          a11yRules={componentA11yRules}
        />
      {:else}
        <p class="px-3 py-2 text-xs">Compatibility data unavailable</p>
      {/if}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
