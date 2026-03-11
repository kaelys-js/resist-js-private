import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const [incomeRes, settingsRes] = await Promise.all([
    fetch('/api/income'),
    fetch('/api/settings'),
  ]);
  const incomeJson: { ok: boolean; data?: unknown } = await incomeRes.json();
  const settingsJson: { ok: boolean; data?: unknown } = await settingsRes.json();
  return {
    income: incomeJson.ok ? incomeJson.data : [],
    settings: settingsJson.ok
      ? settingsJson.data
      : { birthDate: '1989-04-03', retirementAge: 65, defaultInflationRate: 0.02 },
  };
};
