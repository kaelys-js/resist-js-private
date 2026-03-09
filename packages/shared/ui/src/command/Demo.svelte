<script lang="ts">
import * as Command from './index.js';
import Button from '../button/button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import SettingsIcon from '@lucide/svelte/icons/settings';
import UserIcon from '@lucide/svelte/icons/user';
import SmileIcon from '@lucide/svelte/icons/smile';
import CalculatorIcon from '@lucide/svelte/icons/calculator';

let dialogOpen: boolean = $state(false);
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Inline Command" description="A command palette rendered inline with grouped items and search filtering.">
		<Command.Root class="max-w-md rounded-lg border shadow-md">
			<Command.Input placeholder="Type a command or search..." />
			<Command.List>
				<Command.Empty>No results found.</Command.Empty>
				<Command.Group heading="Suggestions">
					<Command.Item>
						<CalendarIcon />
						<span>Calendar</span>
					</Command.Item>
					<Command.Item>
						<SmileIcon />
						<span>Search Emoji</span>
					</Command.Item>
					<Command.Item>
						<CalculatorIcon />
						<span>Calculator</span>
					</Command.Item>
				</Command.Group>
				<Command.Separator />
				<Command.Group heading="Settings">
					<Command.Item>
						<UserIcon />
						<span>Profile</span>
						<Command.Shortcut>Ctrl+P</Command.Shortcut>
					</Command.Item>
					<Command.Item>
						<SettingsIcon />
						<span>Settings</span>
						<Command.Shortcut>Ctrl+,</Command.Shortcut>
					</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.Root>
	</DemoSection>

	<DemoSection title="Command Dialog" description="A command palette that opens inside a dialog overlay. Click the button or press Ctrl+K.">
		<Button variant="outline" onclick={() => (dialogOpen = true)}>
			Open Command Palette
		</Button>
		<Command.Dialog bind:open={dialogOpen}>
			<Command.Input placeholder="Type a command or search..." />
			<Command.List>
				<Command.Empty>No results found.</Command.Empty>
				<Command.Group heading="Suggestions">
					<Command.Item>
						<CalendarIcon />
						<span>Calendar</span>
					</Command.Item>
					<Command.Item>
						<SmileIcon />
						<span>Search Emoji</span>
					</Command.Item>
					<Command.Item>
						<CalculatorIcon />
						<span>Calculator</span>
					</Command.Item>
				</Command.Group>
				<Command.Separator />
				<Command.Group heading="Settings">
					<Command.Item>
						<UserIcon />
						<span>Profile</span>
						<Command.Shortcut>Ctrl+P</Command.Shortcut>
					</Command.Item>
					<Command.Item>
						<SettingsIcon />
						<span>Settings</span>
						<Command.Shortcut>Ctrl+,</Command.Shortcut>
					</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.Dialog>
	</DemoSection>

	<DemoSection title="Empty State" description="When the search query matches nothing, the empty slot is displayed.">
		<Command.Root class="max-w-md rounded-lg border shadow-md" value="zzz-nonexistent">
			<Command.Input placeholder="Search..." value="zzz-nonexistent" />
			<Command.List>
				<Command.Empty>No results found. Try a different search term.</Command.Empty>
				<Command.Group heading="Items">
					<Command.Item value="alpha">Alpha</Command.Item>
					<Command.Item value="beta">Beta</Command.Item>
					<Command.Item value="gamma">Gamma</Command.Item>
				</Command.Group>
			</Command.List>
		</Command.Root>
	</DemoSection>
</div>
