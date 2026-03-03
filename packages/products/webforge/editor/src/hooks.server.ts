import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '@/locale/direction';
import { resolveLocale } from '$lib/server/locale-detection';

export const handle: Handle = ({ event, resolve }) => {
	const cookie: string = event.cookies.get('locale') ?? '';
	const header: string | null = event.request.headers.get('accept-language');
	const locale: string = resolveLocale(cookie, header);

	event.locals.locale = locale;
	const dirResult = getTextDirection(locale);
	const dir: string = dirResult.ok ? dirResult.data : 'ltr';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', locale).replace('%dir%', dir),
	});
};
