<script lang="ts">
import * as Dialog from './index.js';
import Button from '../button/button.svelte';
import Input from '../input/input.svelte';
import Label from '../label/label.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic Dialog" description="A simple dialog with a title, description, and close button.">
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Dialog</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Are you sure?</Dialog.Title>
					<Dialog.Description>
						This action cannot be undone. This will permanently delete your account and
						remove your data from our servers.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Dialog.Close>
						{#snippet children()}
							<Button variant="outline">Cancel</Button>
						{/snippet}
					</Dialog.Close>
					<Button>Continue</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</DemoSection>

	<DemoSection title="Form Dialog" description="A dialog containing a form with input fields for editing a profile.">
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet children()}
					<Button variant="outline">Edit Profile</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Edit Profile</Dialog.Title>
					<Dialog.Description>
						Make changes to your profile here. Click save when you're done.
					</Dialog.Description>
				</Dialog.Header>
				<div class="grid gap-4 py-4">
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Name</Label>
						<Input class="col-span-3" placeholder="Enter your name" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Username</Label>
						<Input class="col-span-3" placeholder="@username" />
					</div>
				</div>
				<Dialog.Footer>
					<Button>Save changes</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</DemoSection>

	<DemoSection title="No Close Button" description="Dialog with showCloseButton set to false — no X icon in the corner.">
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet children()}
					<Button variant="outline">Open (No X)</Button>
				{/snippet}
			</Dialog.Trigger>
			<Dialog.Content showCloseButton={false}>
				<Dialog.Header>
					<Dialog.Title>Custom Close</Dialog.Title>
					<Dialog.Description>
						This dialog hides the default close button. Use the button below to dismiss.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Dialog.Close>
						{#snippet children()}
							<Button variant="outline">Dismiss</Button>
						{/snippet}
					</Dialog.Close>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</DemoSection>
</div>
