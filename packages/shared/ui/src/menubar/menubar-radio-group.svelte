<script lang="ts">
import { Menubar as MenubarPrimitive } from 'bits-ui';

let {
	ref = $bindable(null),
	/** The selected radio item value. @values option-1, option-2, option-3 */
	value = $bindable(''),
	...restProps
}: MenubarPrimitive.RadioGroupProps = $props();
</script>

<MenubarPrimitive.RadioGroup bind:ref bind:value data-slot="menubar-radio-group" {...restProps} />
