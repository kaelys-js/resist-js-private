import type { PageServerLoad } from './$types';

/** Shape returned by all finance API routes. */
type ApiResponse = {
  ok: boolean;
  data?: unknown;
};

export const load: PageServerLoad = async ({ fetch }) => {
  const [
    debtsRes,
    incomeRes,
    monthlyRes,
    purchasesRes,
    replacementsRes,
    travelRes,
    settingsRes,
    inflationRes,
    lifetimeExpRes,
  ] = await Promise.all([
    fetch('/api/debts'),
    fetch('/api/income'),
    fetch('/api/monthly-expenses'),
    fetch('/api/purchases'),
    fetch('/api/lifetime-replacements'),
    fetch('/api/travel'),
    fetch('/api/settings'),
    fetch('/api/inflation'),
    fetch('/api/lifetime-expenses'),
  ]);
  const [
    debts,
    income,
    monthly,
    purchases,
    replacements,
    travel,
    settings,
    inflation,
    lifetimeExpenses,
  ] = (await Promise.all([
    debtsRes.json(),
    incomeRes.json(),
    monthlyRes.json(),
    purchasesRes.json(),
    replacementsRes.json(),
    travelRes.json(),
    settingsRes.json(),
    inflationRes.json(),
    lifetimeExpRes.json(),
  ])) as ApiResponse[];
  return {
    debts: debts.ok ? debts.data : [],
    income: income.ok ? income.data : [],
    monthlyExpenses: monthly.ok ? monthly.data : [],
    purchases: purchases.ok ? purchases.data : [],
    lifetimeReplacements: replacements.ok ? replacements.data : [],
    travel: travel.ok ? travel.data : [],
    settings: settings.ok
      ? settings.data
      : { birthDate: '1989-04-03', retirementAge: 65, defaultInflationRate: 0.02 },
    inflation: inflation.ok ? inflation.data : [],
    lifetimeExpenses: lifetimeExpenses.ok ? lifetimeExpenses.data : [],
  };
};
