<script lang="ts">
import type { Str, Bool } from '@/schemas/common';
import * as Dialog from '@/ui/dialog/index.js';
import { Button } from '@/ui/button/index.js';

/**
 * Props for the ConfirmDialog component.
 *
 * A delete/destructive confirmation dialog using shadcn Dialog.
 * Shows a title, description, and Cancel/Confirm buttons.
 *
 * @property open - Bindable boolean controlling dialog visibility.
 * @property title - Dialog title text.
 * @property description - Descriptive text explaining the action to confirm.
 * @property onConfirm - Callback invoked when the destructive Confirm button is clicked.
 */
type Props = {
	open: Bool;
	title: Str;
	description: Str;
	onConfirm: () => void;
};

let { open = $bindable(false), title, description, onConfirm }: Props = $props();

function handleConfirm(): void {
	onConfirm();
	open = false;
}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button variant="destructive" onclick={handleConfirm}>Confirm</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
