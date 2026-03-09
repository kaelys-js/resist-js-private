<script lang="ts">
import * as Sheet from './index.js';
import Button from '../button/button.svelte';
import Input from '../input/input.svelte';
import Label from '../label/label.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Right Sheet" description="The default side variant — slides in from the right.">
		<Sheet.Root>
			<Sheet.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Right</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content side="right">
				<Sheet.Header>
					<Sheet.Title>Edit Profile</Sheet.Title>
					<Sheet.Description>
						Make changes to your profile here. Click save when you're done.
					</Sheet.Description>
				</Sheet.Header>
				<div class="grid gap-4 px-4 py-4">
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Name</Label>
						<Input class="col-span-3" placeholder="Enter your name" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label class="text-right">Username</Label>
						<Input class="col-span-3" placeholder="@username" />
					</div>
				</div>
				<Sheet.Footer>
					<Sheet.Close>
						{#snippet children()}
							<Button variant="outline">Cancel</Button>
						{/snippet}
					</Sheet.Close>
					<Button>Save changes</Button>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	</DemoSection>

	<DemoSection title="Left Sheet" description="A sheet that slides in from the left side.">
		<Sheet.Root>
			<Sheet.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Left</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content side="left">
				<Sheet.Header>
					<Sheet.Title>Navigation</Sheet.Title>
					<Sheet.Description>
						Browse the sidebar menu. Select a section to navigate.
					</Sheet.Description>
				</Sheet.Header>
				<nav class="flex flex-col gap-2 px-4 py-4">
					<Button variant="ghost" class="justify-start">Dashboard</Button>
					<Button variant="ghost" class="justify-start">Projects</Button>
					<Button variant="ghost" class="justify-start">Settings</Button>
					<Button variant="ghost" class="justify-start">Help</Button>
				</nav>
			</Sheet.Content>
		</Sheet.Root>
	</DemoSection>

	<DemoSection title="Top Sheet" description="A sheet that slides down from the top.">
		<Sheet.Root>
			<Sheet.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Top</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content side="top">
				<Sheet.Header>
					<Sheet.Title>Announcement</Sheet.Title>
					<Sheet.Description>
						Important notice displayed from the top of the viewport.
					</Sheet.Description>
				</Sheet.Header>
				<div class="px-4 pb-4">
					<p class="text-sm text-muted-foreground">
						A new version is available. Please refresh to get the latest updates.
					</p>
				</div>
			</Sheet.Content>
		</Sheet.Root>
	</DemoSection>

	<DemoSection title="Bottom Sheet" description="A sheet that slides up from the bottom.">
		<Sheet.Root>
			<Sheet.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Bottom</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content side="bottom">
				<Sheet.Header>
					<Sheet.Title>Cookie Preferences</Sheet.Title>
					<Sheet.Description>
						Manage your cookie settings. You can enable or disable different types of
						cookies below.
					</Sheet.Description>
				</Sheet.Header>
				<Sheet.Footer>
					<Sheet.Close>
						{#snippet children()}
							<Button variant="outline">Decline</Button>
						{/snippet}
					</Sheet.Close>
					<Button>Accept All</Button>
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	</DemoSection>
</div>
