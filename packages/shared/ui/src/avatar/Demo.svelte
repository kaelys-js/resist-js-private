<script lang="ts">
import * as Avatar from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="With Image" description="Avatar displaying a remote image.">
		<div class="flex items-center gap-4">
			<Avatar.Root>
				<Avatar.Image src="https://github.com/shadcn.png" alt="shadcn" />
				<Avatar.Fallback>CN</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root>
				<Avatar.Image src="https://github.com/huntabyte.png" alt="huntabyte" />
				<Avatar.Fallback>HB</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</DemoSection>

	<DemoSection title="Fallback" description="When no image is provided or it fails to load, the fallback content is shown.">
		<div class="flex items-center gap-4">
			<Avatar.Root>
				<Avatar.Fallback>AB</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root>
				<Avatar.Fallback>WF</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root>
				<Avatar.Image src="https://broken-url.invalid/nope.png" alt="broken" />
				<Avatar.Fallback>?</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</DemoSection>

	<DemoSection title="Sizes" description="Custom sizes via class overrides.">
		<div class="flex items-end gap-4">
			<Avatar.Root class="size-6">
				<Avatar.Fallback class="text-[10px]">S</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root>
				<Avatar.Fallback>MD</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root class="size-12">
				<Avatar.Fallback>LG</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root class="size-16">
				<Avatar.Fallback class="text-lg">XL</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</DemoSection>

	<DemoSection title="Group" description="Multiple avatars stacked in a row.">
		<div class="flex -space-x-2">
			<Avatar.Root class="border-2 border-background">
				<Avatar.Image src="https://github.com/shadcn.png" alt="shadcn" />
				<Avatar.Fallback>CN</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root class="border-2 border-background">
				<Avatar.Image src="https://github.com/huntabyte.png" alt="huntabyte" />
				<Avatar.Fallback>HB</Avatar.Fallback>
			</Avatar.Root>
			<Avatar.Root class="border-2 border-background">
				<Avatar.Fallback>+3</Avatar.Fallback>
			</Avatar.Root>
		</div>
	</DemoSection>
</div>
