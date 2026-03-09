<script lang="ts">
import * as DropdownMenu from './index.js';
import Button from '../button/button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
import UserIcon from '@lucide/svelte/icons/user';
import SettingsIcon from '@lucide/svelte/icons/settings';
import LogOutIcon from '@lucide/svelte/icons/log-out';
import TrashIcon from '@lucide/svelte/icons/trash';
import MailIcon from '@lucide/svelte/icons/mail';

let showStatusBar: boolean = $state(true);
let showActivityBar: boolean = $state(false);
let showPanel: boolean = $state(true);
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic Menu" description="A simple dropdown menu with items, shortcuts, and a separator.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet children()}
					<Button variant="outline">Open Menu</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				<DropdownMenu.Label>My Account</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					Profile
					<DropdownMenu.Shortcut>Ctrl+P</DropdownMenu.Shortcut>
				</DropdownMenu.Item>
				<DropdownMenu.Item>
					Settings
					<DropdownMenu.Shortcut>Ctrl+,</DropdownMenu.Shortcut>
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					Log out
					<DropdownMenu.Shortcut>Ctrl+Q</DropdownMenu.Shortcut>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</DemoSection>

	<DemoSection title="With Icons" description="Menu items decorated with Lucide icons and a destructive variant.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet children()}
					<Button variant="outline">Actions</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				<DropdownMenu.Item>
					<UserIcon />
					Profile
				</DropdownMenu.Item>
				<DropdownMenu.Item>
					<MailIcon />
					Messages
				</DropdownMenu.Item>
				<DropdownMenu.Item>
					<SettingsIcon />
					Settings
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive">
					<TrashIcon />
					Delete Account
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</DemoSection>

	<DemoSection title="Checkbox Items" description="Toggle-able checkbox items inside a dropdown menu.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet children()}
					<Button variant="outline">View Options</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				<DropdownMenu.Label>Appearance</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.CheckboxItem bind:checked={showStatusBar}>
					Status Bar
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem bind:checked={showActivityBar}>
					Activity Bar
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.CheckboxItem bind:checked={showPanel}>
					Panel
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		<p class="mt-2 text-xs text-muted-foreground">
			Status Bar: {showStatusBar} | Activity Bar: {showActivityBar} | Panel: {showPanel}
		</p>
	</DemoSection>

	<DemoSection title="Grouped Items" description="Menu items organized into named groups with headings.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet children()}
					<Button variant="outline">Grouped Menu</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Account</DropdownMenu.GroupHeading>
					<DropdownMenu.Item>
						<UserIcon />
						Profile
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<SettingsIcon />
						Settings
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>Danger Zone</DropdownMenu.GroupHeading>
					<DropdownMenu.Item variant="destructive">
						<LogOutIcon />
						Log out
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</DemoSection>

	<DemoSection title="Submenu" description="A dropdown menu with a nested submenu for additional options.">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet children()}
					<Button variant="outline">With Submenu</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				<DropdownMenu.Item>New File</DropdownMenu.Item>
				<DropdownMenu.Item>Open File</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<DropdownMenu.Item>
							<MailIcon />
							Email
						</DropdownMenu.Item>
						<DropdownMenu.Item>Copy Link</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</DemoSection>
</div>
