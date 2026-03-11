import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('/api/travel');
  const json: { ok: boolean; data?: unknown } = await res.json();
  return { trips: json.ok ? json.data : [] };
};
