<script lang="ts">
import { ok, type Result } from '@/schemas/result';
import { NumSchema, type Num } from '@/schemas/common';

const result: Result<Num> = ok(NumSchema, 42);
const message: string = result.ok ? `Result: ${String(result.data)}` : 'Error';
</script>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
	<h1 class="text-4xl font-bold">WebForge Editor</h1>
	<p class="text-muted-foreground">{message}</p>
</main>
