<script lang="ts">
import type { Str, Bool } from '@/schemas/common';
import type { Snippet } from 'svelte';
import * as Dialog from '$lib/components/ui/dialog/index.js';
import { Button } from '$lib/components/ui/button/index.js';

/**
 * Props for the ItemDialog component.
 *
 * A generic add/edit dialog wrapping shadcn Dialog with a form.
 * The `children` snippet is rendered inside the form for custom field content.
 *
 * @property open - Bindable boolean controlling dialog visibility.
 * @property title - Dialog header title text.
 * @property description - Optional description shown below the title.
 * @property children - Snippet rendered inside the form body for custom fields.
 * @property onSave - Callback invoked when the form is submitted.
 * @property saveLabel - Optional label for the save button (defaults to "Save").
 */
type Props = {
	open: Bool;
	title: Str;
	description?: Str;
	children: Snippet;
	onSave: () => void;
	saveLabel?: Str;
};

let {
	open = $bindable(false),
	title,
	description,
	children,
	onSave,
	saveLabel = 'Save',
}: Props = $props();

function handleSubmit(e: SubmitEvent): void {
	e.preventDefault();
	onSave();
}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<form onsubmit={handleSubmit}>
			<div class="grid gap-4 py-4">
				{@render children()}
			</div>
			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={() => (open = false)}>
					Cancel
				</Button>
				<Button type="submit">{saveLabel}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
