<script lang="ts">
import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

let {
	ref = $bindable(null),
	/** Array of checked item values. */
	value = $bindable([]),
	...restProps
}: DropdownMenuPrimitive.CheckboxGroupProps = $props();
</script>

<DropdownMenuPrimitive.CheckboxGroup
	bind:ref
	bind:value
	data-slot="dropdown-menu-checkbox-group"
	{...restProps}
/>
