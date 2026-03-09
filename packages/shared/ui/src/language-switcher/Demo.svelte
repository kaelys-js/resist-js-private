<script lang="ts">
import type { Str } from '@/schemas/common';
import LanguageSwitcher from './LanguageSwitcher.svelte';
import * as DropdownMenu from '../dropdown-menu/index.js';
import DemoSection from '../demo-section/DemoSection.svelte';

let currentLocale: Str = $state('en');
</script>

<div class="flex flex-col gap-6">
	<DemoSection
		title="Inside Dropdown Menu"
		description="Language switcher rendered as a sub-menu inside a dropdown. Click the trigger to open."
	>
		<div class="flex justify-center">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<button
						class="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-accent"
					>
						Preferences
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start">
					<LanguageSwitcher
						locale={currentLocale}
						switchLanguage={(code: Str) => {
							currentLocale = code;
						}}
						languages={[
							{ code: 'en', endonym: 'English', exonym: 'English' },
							{ code: 'ja', endonym: '日本語', exonym: 'Japanese' },
							{ code: 'de', endonym: 'Deutsch', exonym: 'German' },
							{ code: 'fr', endonym: 'Français', exonym: 'French' },
							{ code: 'es', endonym: 'Español', exonym: 'Spanish' },
							{ code: 'ko', endonym: '한국어', exonym: 'Korean' },
							{ code: 'zh', endonym: '中文', exonym: 'Chinese' },
							{ code: 'pt', endonym: 'Português', exonym: 'Portuguese' },
						]}
						labels={{
							language: 'Language',
							searchLanguages: 'Search languages...',
							clearSearch: 'Clear search',
							noLanguagesFound: 'No languages found',
							noResultsHint: 'Try a different search term',
						}}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		<p class="mt-3 text-center text-xs text-muted-foreground">
			Current locale: <code class="rounded bg-muted px-1 py-0.5">{currentLocale}</code>
		</p>
	</DemoSection>
</div>
