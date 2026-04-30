<!-- @convert-to-lens -->
<script lang="ts" module>
  /**
   * ToggleGroup root Svelte component — Bits UI `ToggleGroup`
   * wrapper that publishes shared variant + spacing context to
   * descendant `ToggleGroupItem` components.
   *
   * @module
   */
  import { getContext, setContext } from 'svelte';
  import type { VariantProps } from 'tailwind-variants';
  import { toggleVariants } from '../toggle/index.js';

  type ToggleVariants = VariantProps<typeof toggleVariants>;

  type ToggleGroupContext = {
    /** Gap spacing between toggle items in pixels. @values 0, 1, 2, 4 */
    spacing?: number;
  } & ToggleVariants;

  /**
   * Publishes the ToggleGroup's variant + spacing context so
   * descendant ToggleGroupItem components {ToggleGroupContext} {ToggleGroupContext} {ToggleGroupContext} {ToggleGroupContext} {ToggleGroupContext} inherit consistent
   * styling.
   *
   * @param props - The variant + spacing context to publish
   */
  export function setToggleGroupCtx(props: ToggleGroupContext) {
    setContext('toggleGroup', props);
  }

  /**
   * Reads the parent ToggleGroup's variant + spacing context for
   * use inside a descendant ToggleGroupItem.
   *
   * @returns The parent ToggleGroup's resolved context
   */
  export function getToggleGroupCtx() {
    return getContext<Required<ToggleGroupContext>>('toggleGroup');
  }
</script>

<script lang="ts">
  import { ToggleGroup as ToggleGroupPrimitive } from 'bits-ui';
  import { cn } from '../utils.js';

  let {
    ref = $bindable(null),
    /** The selected toggle value(s). */
    value = $bindable(),
    class: className,
    /** Toggle group item size preset. @values default, sm, lg */
    size = 'default',
    /** Gap spacing between toggle items in pixels. @values 0, 1, 2, 4 */
    spacing = 0,
    /** Toggle group style variant. @values default, outline */
    variant = 'default',
    ...restProps
  }: ToggleGroupPrimitive.RootProps & ToggleVariants & { spacing?: number } = $props();

  setToggleGroupCtx({
    variant,
    size,
    spacing,
  });
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<ToggleGroupPrimitive.Root
  bind:value={value as never}
  bind:ref
  data-slot="toggle-group"
  data-variant={variant}
  data-size={size}
  data-spacing={spacing}
  style={`--gap: ${spacing}`}
  class={cn(
    'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs',
    className,
  )}
  {...restProps}
/>
