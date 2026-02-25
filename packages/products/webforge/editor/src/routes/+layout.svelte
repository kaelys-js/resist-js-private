<script lang="ts">
import '../app.css';
const { children } = $props();
</script>

<div class="dark">
	{@render children()}
</div>
