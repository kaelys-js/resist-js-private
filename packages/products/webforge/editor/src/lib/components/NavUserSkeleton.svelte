<script lang="ts">
import { Skeleton } from '$lib/components/ui/skeleton/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="flex items-center gap-2 p-2">
			<Skeleton class="size-8 rounded-lg" />
			<div class="grid flex-1 gap-1">
				<Skeleton class="h-4 w-24" />
				<Skeleton class="h-3 w-32" />
			</div>
		</div>
	</Sidebar.MenuItem>
</Sidebar.Menu>
