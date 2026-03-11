<!-- @convert-to-lens -->
<script lang="ts">
/**
 * A collapsible container that toggles visibility of its content section.
 *
 * Wraps bits-ui Collapsible.Root with a bindable `open` state for controlled expand/collapse behavior.
 */
import { Collapsible as CollapsiblePrimitive } from 'bits-ui';

let {
	/** The underlying DOM element reference. */
	ref = $bindable(null),
	/** Whether the collapsible section is expanded. */
	open = $bindable(false),
	...restProps
}: CollapsiblePrimitive.RootProps = $props();
</script>

<CollapsiblePrimitive.Root bind:ref bind:open data-slot="collapsible" {...restProps} />
