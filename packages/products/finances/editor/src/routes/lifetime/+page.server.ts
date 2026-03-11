import type { PageServerLoad } from './$types';

/** Shape returned by all finance API routes. */
type ApiResponse = {
  ok: boolean;
  data?: unknown;
};

export const load: PageServerLoad = async ({ fetch }) => {
  const [
    monthlyRes,
    lifetimeExpRes,
    replacementsRes,
    travelRes,
    purchasesRes,
    settingsRes,
    inflationRes,
  ] = await Promise.all([
    fetch('/api/monthly-expenses'),
    fetch('/api/lifetime-expenses'),
    fetch('/api/lifetime-replacements'),
    fetch('/api/travel'),
    fetch('/api/purchases'),
    fetch('/api/settings'),
    fetch('/api/inflation'),
  ]);
  const [monthly, lifetimeExp, replacements, travel, purchases, settings, inflation] =
    (await Promise.all([
      monthlyRes.json(),
      lifetimeExpRes.json(),
      replacementsRes.json(),
      travelRes.json(),
      purchasesRes.json(),
      settingsRes.json(),
      inflationRes.json(),
    ])) as ApiResponse[];
  return {
    monthlyExpenses: monthly.ok ? monthly.data : [],
    lifetimeExpenses: lifetimeExp.ok ? lifetimeExp.data : [],
    lifetimeReplacements: replacements.ok ? replacements.data : [],
    travel: travel.ok ? travel.data : [],
    purchases: purchases.ok ? purchases.data : [],
    settings: settings.ok
      ? settings.data
      : { birthDate: '1989-04-03', retirementAge: 65, defaultInflationRate: 0.02 },
    inflation: inflation.ok ? inflation.data : [],
  };
};
