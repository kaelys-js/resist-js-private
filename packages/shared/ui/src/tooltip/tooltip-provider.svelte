<script lang="ts">
  /**
   * TooltipProvider Svelte component — Bits UI provider that
   * shares delay / skip-delay timing across descendant
   * Tooltips.
   *
   * @module
   */
  import { Tooltip as TooltipPrimitive } from 'bits-ui';

  let { ...restProps }: TooltipPrimitive.ProviderProps = $props();
</script>

<TooltipPrimitive.Provider {...restProps} />
