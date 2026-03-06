import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/monthly-expenses');
	const json: { ok: boolean; data?: unknown } = await res.json();
	return { expenses: json.ok ? json.data : [] };
};
