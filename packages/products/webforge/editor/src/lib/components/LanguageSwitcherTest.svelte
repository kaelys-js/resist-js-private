<script lang="ts">
import * as DropdownMenu from '@/ui/dropdown-menu/index.js';
import TestProviders from './TestProviders.svelte';
import LanguageSwitcher from './LanguageSwitcher.svelte';
</script>

<TestProviders>
	<DropdownMenu.Root open={true}>
		<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			<LanguageSwitcher />
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</TestProviders>
