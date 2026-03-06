import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/income');
	const json: { ok: boolean; data?: unknown } = await res.json();
	return { income: json.ok ? json.data : [] };
};
