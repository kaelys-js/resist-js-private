<script lang="ts">
import type { Str } from '@/schemas/common';
import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
import SiteHeader from './SiteHeader.svelte';
import type { ServerUser } from '$lib/server/data/types';

const defaultUser: ServerUser = {
	id: 'user-1',
	displayName: 'Test User',
	email: 'test@example.com',
	avatarUrl: '',
};

let {
	disabledFlags = [],
	user = defaultUser,
}: { disabledFlags?: Str[]; user?: ServerUser | null } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
	<SiteHeader {user} />
</FeatureFlagsTestProviders>
