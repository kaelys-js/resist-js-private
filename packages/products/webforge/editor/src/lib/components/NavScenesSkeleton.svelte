<script lang="ts">
import { Skeleton } from '$lib/components/ui/skeleton/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import type { Num } from '@/schemas/common';

const skeletonCount: Num = 3;
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>
		<Skeleton class="h-4 w-16" />
	</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each Array(skeletonCount) as _}
			<Sidebar.MenuItem>
				<div class="flex items-center gap-2 px-2 py-1.5">
					<Skeleton class="size-4 rounded" />
					<Skeleton class="h-4 w-24" />
				</div>
			</Sidebar.MenuItem>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
