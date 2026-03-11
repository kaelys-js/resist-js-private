<script lang="ts">
import * as v from 'valibot';
import { browser } from '$app/environment';
import { safeParse } from '@/utils/result/safe';

/**
 * Client-side validation error test.
 *
 * Guarded by `browser` so the throw only happens during client-side hydration,
 * not during SSR. This exercises the client-side handleError pipeline — the
 * hook should detect the AppError, preserve its code (VALIDATION.SCHEMA_FAILED),
 * validation details, and full cause chain in the browser console output.
 */
if (browser) {
	const TestSchema = v.strictObject({
		name: v.pipe(v.string(), v.minLength(1)),
		age: v.pipe(v.number(), v.minValue(0), v.maxValue(150)),
		email: v.pipe(v.string(), v.email()),
	});

	const result = safeParse(TestSchema, { name: '', age: -5, email: 'not-an-email' });
	if (!result.ok) {
		throw result.error;
	}
}
</script>

<p>Loading client-side validation test...</p>
