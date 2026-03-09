<script lang="ts">
import { Skeleton } from '@/ui/skeleton/index.js';
import * as Sidebar from '@/ui/sidebar/index.js';
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
			<Skeleton class="size-8 shrink-0 rounded-lg" />
			<div class="grid flex-1 gap-1 group-data-[collapsible=icon]:hidden">
				<Skeleton class="h-4 w-24" />
				<Skeleton class="h-3 w-32" />
			</div>
		</div>
	</Sidebar.MenuItem>
</Sidebar.Menu>
