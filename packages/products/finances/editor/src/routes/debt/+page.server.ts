import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/debts');
	const json: { ok: boolean; data?: unknown } = await res.json();
	return { debts: json.ok ? json.data : [] };
};
