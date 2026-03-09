<script lang="ts">
import type { Bool, Str } from '@/schemas/common';
import ErrorPage from './ErrorPage.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';

/**
 * Simulates a clipboard failure for the copy-failure demo.
 *
 * @param _text - Ignored — always returns failure
 * @returns A resolved promise with `false` (copy failed)
 */
const failingCopy = (_text: Str): Promise<Bool> =>
	new Promise<Bool>((resolve) => {
		resolve(false);
	});
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="404 Not Found" description="Standard not-found error page with home button.">
		<ErrorPage
			status={404}
			message="Not Found"
			title="Page not found"
			description="The page you are looking for does not exist or has been moved."
			labels={{
				goHome: 'Go to homepage',
				tryAgain: 'Try again',
				copied: 'Copied!',
				copyFailed: 'Copy failed',
				errorIdLabel: '',
				copyErrorIdAriaLabel: '',
				clickToCopy: '',
			}}
		/>
	</DemoSection>

	<DemoSection
		title="500 Server Error"
		description="Server error page with both home and retry buttons."
	>
		<ErrorPage
			status={500}
			message="Internal Server Error"
			title="Something went wrong"
			description="An unexpected error occurred on the server. Please try again later."
			labels={{
				goHome: 'Go to homepage',
				tryAgain: 'Try again',
				copied: 'Copied!',
				copyFailed: 'Copy failed',
				errorIdLabel: '',
				copyErrorIdAriaLabel: '',
				clickToCopy: '',
			}}
		/>
	</DemoSection>

	<DemoSection
		title="403 Forbidden"
		description="Access denied error page."
	>
		<ErrorPage
			status={403}
			message="Forbidden"
			title="Access denied"
			description="You do not have permission to view this resource."
			labels={{
				goHome: 'Go to homepage',
				tryAgain: 'Try again',
				copied: 'Copied!',
				copyFailed: 'Copy failed',
				errorIdLabel: '',
				copyErrorIdAriaLabel: '',
				clickToCopy: '',
			}}
		/>
	</DemoSection>

	<DemoSection
		title="Copy Failure"
		description="Error page where clipboard copy fails — shows red X and 'Copy failed' state."
	>
		<ErrorPage
			status={500}
			message="Internal Server Error"
			errorId="err-fail-demo"
			title="Something went wrong"
			description="Click the error ID below to see the failure state."
			labels={{
				goHome: 'Go to homepage',
				tryAgain: 'Try again',
				copied: 'Copied!',
				copyFailed: 'Copy failed',
				errorIdLabel: 'Reference: err-fail-demo',
				copyErrorIdAriaLabel: 'Copy error ID to clipboard',
				clickToCopy: 'Click to copy (will fail)',
			}}
			copyOverride={failingCopy}
		/>
	</DemoSection>

	<DemoSection
		title="With Error ID"
		description="Error page displaying a copyable error reference ID for support."
	>
		<ErrorPage
			status={500}
			message="Internal Server Error"
			errorId="err-a1b2c3d4"
			title="Something went wrong"
			description="An unexpected error occurred. Please share the reference ID with support."
			labels={{
				goHome: 'Go to homepage',
				tryAgain: 'Try again',
				copied: 'Copied!',
				copyFailed: 'Copy failed',
				errorIdLabel: 'Reference: err-a1b2c3d4',
				copyErrorIdAriaLabel: 'Copy error ID to clipboard',
				clickToCopy: 'Click to copy',
			}}
		/>
	</DemoSection>
</div>
