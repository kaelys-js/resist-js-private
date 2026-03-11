<!-- @convert-to-lens -->
<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";

	let {
		/** Whether the alert dialog is open. */
		open = $bindable(false),
		...restProps
	}: AlertDialogPrimitive.RootProps = $props();
</script>

<AlertDialogPrimitive.Root bind:open {...restProps} />
