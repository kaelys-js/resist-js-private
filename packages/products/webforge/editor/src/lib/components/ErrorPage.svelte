<script lang="ts">
import ErrorPage from '@/ui/error-page/ErrorPage.svelte';
import type { Str, Num } from '@/schemas/common';
import type { Result } from '@/schemas/result/result';
import { localeStore, t } from '$lib/i18n.svelte';
import { log } from '@/utils/core/logger';
import { announce } from '$lib/utils/announce.svelte';

let { status, message, errorId }: { status: Num; message: Str; errorId?: Str } = $props();

const titleKey: Record<Num, () => Str> = {
	400: () => t(localeStore.t.errors.badRequest, 'Bad request'),
	403: () => t(localeStore.t.errors.forbidden, 'Access denied'),
	404: () => t(localeStore.t.errors.notFound, 'Page not found'),
	500: () => t(localeStore.t.errors.serverError, 'Something went wrong'),
};

const descriptionKey: Record<Num, () => Str> = {
	400: () =>
		t(
			localeStore.t.errors.badRequestDescription,
			"Something in that request didn't look right. Double-check and try again.",
		),
	403: () =>
		t(
			localeStore.t.errors.forbiddenDescription,
			"You don't have permission to access this page. Try signing in with a different account.",
		),
	404: () =>
		t(
			localeStore.t.errors.notFoundDescription,
			'We looked everywhere, but this page seems to have wandered off. It may have been moved or deleted.',
		),
	500: () =>
		t(
			localeStore.t.errors.serverErrorDescription,
			"Oops! Something broke on our end. We're looking into it — please try again in a moment.",
		),
};

const title: Str = $derived(
	(titleKey[status] ?? (() => t(localeStore.t.errors.genericTitle, 'Error')))(),
);

const description: Str = $derived(
	(
		descriptionKey[status] ??
		(() =>
			t(
				localeStore.t.errors.genericDescription,
				'Something unexpected happened while loading this page.',
			))
	)(),
);

const errorIdLabel: Str = $derived.by(() => {
	if (!errorId) return '';
	// Locale DeepReadonly workaround — parametric locale function needs cast
	const result: Result<Str> = (localeStore.t.errors.errorId as (p: { id: Str }) => Result<Str>)({
		id: errorId,
	});
	if (!result.ok) {
		log.warn(`Locale errors.errorId error: ${result.error.code}`);
	}
	// UI boundary — locale error logged, fallback used
	return result.ok ? result.data : `Reference: ${errorId}`;
});

const labels: {
	goHome: Str;
	tryAgain: Str;
	copied: Str;
	copyFailed: Str;
	errorIdLabel: Str;
	copyErrorIdAriaLabel: Str;
	clickToCopy: Str;
} = $derived({
	goHome: t(localeStore.t.errors.goHome, 'Go to homepage'),
	tryAgain: t(localeStore.t.errors.tryAgain, 'Try again'),
	copied: t(localeStore.t.errors.copied, 'Copied!'),
	copyFailed: t(localeStore.t.errors.copyFailed, 'Copy failed'),
	errorIdLabel,
	copyErrorIdAriaLabel: t(localeStore.t.errors.copyErrorId, 'Copy error ID to clipboard'),
	clickToCopy: t(localeStore.t.errors.clickToCopy, 'Click to copy'),
});
</script>

<ErrorPage {status} {message} {errorId} {title} {description} {labels} {announce} />
