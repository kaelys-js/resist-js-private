import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [purchasesRes, replacementsRes] = await Promise.all([
		fetch('/api/purchases'),
		fetch('/api/lifetime-replacements'),
	]);
	const purchasesJson: { ok: boolean; data?: unknown } = await purchasesRes.json();
	const replacementsJson: { ok: boolean; data?: unknown } = await replacementsRes.json();
	return {
		purchases: purchasesJson.ok ? purchasesJson.data : [],
		replacements: replacementsJson.ok ? replacementsJson.data : [],
	};
};
