<script lang="ts">
  /**
   * Compatibility tooltip — shows a CircleCheck/CircleAlert icon with a tooltip
   * containing the full R0–R17 rule table on hover.
   *
   * Used in All Components, Category, and Sidebar views. Replaces 7 duplicated
   * inline tooltip blocks across the codebase.
   */
  import type { Num, Str } from '@/schemas/common';
  import type { LensCompatibility } from '@/ui/lens/lens-utils.js';
  import * as Tooltip from '@/ui/tooltip/index.js';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import CompatRuleList from './CompatRuleList.svelte';

  /** Compatibility tooltip props. */
  const {
    compat,
    ruleNames,
    borderTop = false,
  }: {
    /** Lens compatibility result for a single component. @values compatByName.get(name) */
    compat: LensCompatibility | undefined;
    /** Ordered rule name strings (R0–R17). @values LENS_RULE_NAMES */
    ruleNames: readonly Str[];
    /** When true, render with a top border separator (sidebar style). @values true, false */
    borderTop?: boolean;
  } = $props();

  /** Whether all compatibility rules pass. */
  const isCompat: boolean = $derived(compat?.compatible === true);

  /** Set of failing rule indices. */
  const failedRules: Set<Num> = $derived(
    new Set((compat?.violations ?? []).map((vi) => vi.rule as Num)),
  );
</script>

<Tooltip.Provider disableHoverableContent={false}>
  <Tooltip.Root delayDuration={200}>
    <Tooltip.Trigger>
      {#snippet child({ props: compatTip })}
        <span {...compatTip}>
          {#if isCompat}
            <CircleCheck class="size-4 text-emerald-500" />
          {:else}
            <CircleAlert class="size-4 text-amber-500" />
          {/if}
        </span>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content
      sideOffset={2}
      class="w-96 max-w-[min(24rem,90vw)] max-h-[min(24rem,80vh)] overflow-y-auto p-0"
    >
      {#if borderTop}
        <div class="border-t border-border">
          <CompatRuleList {ruleNames} violations={failedRules} />
        </div>
      {:else if isCompat}
        <p class="px-3 py-2 text-xs">All compatibility rules pass</p>
      {:else if compat}
        <CompatRuleList {ruleNames} violations={failedRules} />
      {:else}
        <p class="px-3 py-2 text-xs">Compatibility data unavailable</p>
      {/if}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
