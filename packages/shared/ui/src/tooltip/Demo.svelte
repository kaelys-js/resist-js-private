<script lang="ts">
import Button from '../button/button.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
import * as Tooltip from './index.js';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Default (Top)" description="Basic tooltip appearing above the trigger on hover.">
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button variant="outline">Hover me</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>This is a tooltip</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Side Variants" description="Tooltip can be positioned on any side of the trigger element.">
		<div class="flex flex-wrap items-center gap-6">
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="outline" size="sm">Top</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top">Appears on top</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="outline" size="sm">Bottom</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="bottom">Appears on bottom</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="outline" size="sm">Left</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="left">Appears on left</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>

			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="outline" size="sm">Right</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="right">Appears on right</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
	</DemoSection>

	<DemoSection title="With Side Offset" description="Tooltip with extra spacing between trigger and content.">
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button variant="outline">Offset = 8</Button>
				</Tooltip.Trigger>
				<Tooltip.Content sideOffset={8}>Extra spacing from the trigger</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Shared Provider" description="Multiple tooltips sharing a single Provider for faster open on hover-between.">
		<Tooltip.Provider delayDuration={0}>
			<div class="flex items-center gap-4">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Bold</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>Toggle bold</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Italic</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>Toggle italic</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button variant="secondary" size="sm">Underline</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>Toggle underline</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	</DemoSection>

	<DemoSection title="Non-Button Trigger" description="Tooltip can wrap any inline element, not just buttons.">
		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class="cursor-default underline decoration-dotted underline-offset-4">
					<span class="text-sm">Hover this text</span>
				</Tooltip.Trigger>
				<Tooltip.Content>Any element can be a trigger</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</DemoSection>
</div>
