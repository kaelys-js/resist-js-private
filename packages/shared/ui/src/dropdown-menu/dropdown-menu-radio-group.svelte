<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

let {
	ref = $bindable(null),
	/** The selected radio item value. */
	value = $bindable(),
	...restProps
}: DropdownMenuPrimitive.RadioGroupProps = $props();
</script>

<DropdownMenuPrimitive.RadioGroup
	bind:ref
	bind:value
	data-slot="dropdown-menu-radio-group"
	{...restProps}
/>
