<script lang="ts">
import ErrorPage from './ErrorPage.svelte';
import DemoSection from '../demo-section/DemoSection.svelte';
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
				errorIdLabel: '',
				copyErrorIdAriaLabel: '',
				clickToCopy: '',
			}}
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
				errorIdLabel: 'Reference: err-a1b2c3d4',
				copyErrorIdAriaLabel: 'Copy error ID to clipboard',
				clickToCopy: 'Click to copy',
			}}
		/>
	</DemoSection>
</div>
