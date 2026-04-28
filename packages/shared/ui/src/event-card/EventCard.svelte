<!-- @convert-to-lens -->
<script module lang="ts">
  /**
   * EventCard Svelte component — event listing card with date,
   * title, location, and call-to-action. Placeholder shell
   * awaiting full implementation; ships with a class prop for
   * root-level styling overrides.
   *
   * @module
   */
  import * as v from 'valibot';
  import { StrSchema } from '@/schemas/common';

  export const EventCardPropsSchema = v.strictObject({
    /** Additional CSS classes for the root element. @values custom-class */
    class: v.optional(StrSchema),
  });
  /** Public component props for EventCard. */
  export type EventCardProps = v.InferOutput<typeof EventCardPropsSchema>;
</script>

<script lang="ts">
  /**
   * EventCard — placeholder component awaiting full implementation.
   *
   * @example
   * ```svelte
   * <EventCard />
   * ```
   */
  import type { Snippet } from 'svelte';
  import { safeParse } from '@/utils/result/safe';
  import { stripSvelteProps } from '../lens/lens-utils.js';
  import { cn } from '../utils.js';

  type Props = EventCardProps & {
    /** Content to render inside the component. */
    children?: Snippet;
  };

  const allProps: Props = $props();
  const validated: EventCardProps = $derived.by(() => {
    const rawProps: EventCardProps = stripSvelteProps(allProps);
    const result = safeParse(EventCardPropsSchema, rawProps);
    if (!result.ok) {
      throw result.error;
    }
    // DeepReadonly from safeParse is safe to cast — props are read-only in templates
    return result.data as EventCardProps;
  });
</script>

<div data-slot="event-card" class={cn(validated.class)}>
  {@render allProps.children?.()}
</div>
