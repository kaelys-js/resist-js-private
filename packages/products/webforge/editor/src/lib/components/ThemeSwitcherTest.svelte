<script lang="ts">
import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
import TestProviders from './TestProviders.svelte';
import ThemeSwitcher from './ThemeSwitcher.svelte';
</script>

<TestProviders>
	<DropdownMenu.Root open={true}>
		<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			<ThemeSwitcher />
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</TestProviders>
