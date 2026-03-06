import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [settingsRes, inflationRes] = await Promise.all([
		fetch('/api/settings'),
		fetch('/api/inflation'),
	]);
	const settingsJson: { ok: boolean; data?: unknown } = await settingsRes.json();
	const inflationJson: { ok: boolean; data?: unknown } = await inflationRes.json();
	return {
		settings: settingsJson.ok
			? settingsJson.data
			: { birthDate: '1989-04-03', retirementAge: 65, defaultInflationRate: 0.02 },
		inflation: inflationJson.ok ? inflationJson.data : [],
	};
};
