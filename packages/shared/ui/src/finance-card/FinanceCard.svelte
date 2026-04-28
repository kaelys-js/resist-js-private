<script module lang="ts">
  /**
   * FinanceCard Svelte component — financial summary card with
   * value and trend indicator for dashboards.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  /**
   * Finance stat card following the shadcn-svelte dashboard-01 `section-cards` pattern.
   *
   * Structure: Card.Description (label) → Card.Title (value) → Card.Action (trend badge) → Card.Footer (subtitle).
   *
   * @example
   * ```svelte
   * <FinanceCard label="Total Debt" value="$12,500" valueClass="text-destructive" trend="down" />
   * ```
   */
  export const FinanceCardPropsSchema = v.strictObject({
    /** Muted description text above the value. @values Revenue, Expenses, Net Income */
    label: StrSchema,
    /** Large bold display value. @values $1,234.56, $5,678.90, -$900.00 */
    value: StrSchema,
    /** Optional footer text below the card header. @values +12.5% from last month, -3.2% from last month, No change */
    subtitle: v.optional(StrSchema),
    /** Optional trend badge direction. @values up, down, neutral */
    trend: v.optional(v.picklist(['up', 'down', 'neutral']), 'neutral'),
    /** Optional Tailwind classes for the value. @values text-destructive, text-green-500, text-primary */
    valueClass: v.optional(StrSchema),
  });
  /** Props for the FinanceCard component. */
  export type FinanceCardProps = v.InferOutput<typeof FinanceCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * Financial data card displaying a labeled value with optional trend badge and subtitle.
   *
   * Composes shadcn Card primitives in the dashboard-01 `section-cards` pattern.
   */
  import type { Str } from '@/schemas/common';
  import { safeParse } from '@/utils/result/safe';
  import { Badge } from '../badge/index.js';
  import * as Card from '../card/index.js';
  import { stripSvelteProps } from '../lens/lens-utils.js';

  const { ...restProps }: FinanceCardProps = $props();
  const validated: FinanceCardProps = $derived.by(() => {
    const rawProps: FinanceCardProps = stripSvelteProps(restProps);
    const result = safeParse(FinanceCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as FinanceCardProps;
  });
</script>

<Card.Root class="@container/card" {...restProps}>
  <Card.Header>
    <Card.Description>{validated.label}</Card.Description>
    <Card.Title
      class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl {validated.valueClass ??
        ''}"
    >
      {validated.value}
    </Card.Title>
    {#if validated.trend}
      <Card.Action>
        <Badge variant="outline">
          {#if validated.trend === 'up'}
            <span class="text-green-500">↑</span>
          {:else if validated.trend === 'down'}
            <span class="text-red-500">↓</span>
          {:else}
            <span class="text-muted-foreground">—</span>
          {/if}
        </Badge>
      </Card.Action>
    {/if}
  </Card.Header>
  {#if validated.subtitle}
    <Card.Footer class="flex-col items-start gap-1.5 text-sm">
      <div class="text-muted-foreground">{validated.subtitle}</div>
    </Card.Footer>
  {/if}
</Card.Root>
