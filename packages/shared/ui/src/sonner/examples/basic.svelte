<script lang="ts">
import { toast } from 'svelte-sonner';
import Button from '@/ui/button/button.svelte';
import Sonner from '@/ui/sonner/sonner.svelte';
</script>

<div class="flex flex-wrap gap-2">
	<Button variant="outline" onclick={() => toast('Event has been created.')}>
		Default
	</Button>
	<Button variant="outline" onclick={() => toast.success('Successfully saved!')}>
		Success
	</Button>
	<Button variant="outline" onclick={() => toast.error('Something went wrong.')}>
		Error
	</Button>
</div>
<Sonner />
