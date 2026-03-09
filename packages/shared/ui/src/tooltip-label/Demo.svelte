<script lang="ts">
import Button from '../button/button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
import * as Tooltip from '../tooltip/index.js';
import TooltipLabel from './TooltipLabel.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Label Only" description="Simple tooltip content with just a text label.">
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button variant="outline">Hover me</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<TooltipLabel label="Bold text" />
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Label + Shortcut" description="Label with a keyboard shortcut badge. The kbd badge is hidden on mobile by default.">
		<Tooltip.Provider>
			<div class="flex items-center gap-4">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Bold</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Bold" shortcutLabel="⌘B" />
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Italic</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Italic" shortcutLabel="⌘I" />
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Undo</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Undo" shortcutLabel="⌘Z" />
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Shortcut Always Visible" description="The shortcutAlwaysVisible prop keeps the kbd badge visible on all screen sizes.">
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button variant="outline">Save</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<TooltipLabel label="Save file" shortcutLabel="⌘S" shortcutAlwaysVisible={true} />
				</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Multiple Shortcut Styles" description="Various keyboard shortcut formats rendered as tooltip labels.">
		<Tooltip.Provider delayDuration={0}>
			<div class="flex items-center gap-4">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="ghost" size="sm">Copy</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Copy" shortcutLabel="⌘C" shortcutAlwaysVisible={true} />
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="ghost" size="sm">Paste</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Paste" shortcutLabel="⌘V" shortcutAlwaysVisible={true} />
					</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="ghost" size="sm">Select All</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<TooltipLabel label="Select All" shortcutLabel="⌘A" shortcutAlwaysVisible={true} />
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	</DemoSection>
</div>
