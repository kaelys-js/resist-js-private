import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { InflationConfigSchema } from '$lib/schemas/finances';
import { readCollection, writeCollection } from '$lib/server/data/finance-service';

export const GET = async () => {
  const result = await readCollection('inflation.json', InflationConfigSchema);
  if (!result.ok) return json({ ok: false, error: result.error.message }, { status: 500 });
  return json({ ok: true, data: result.data });
};

export const PUT = async ({ request }: { request: Request }) => {
  const body: unknown = await request.json();
  if (!Array.isArray(body)) return json({ ok: false, error: 'Expected array' }, { status: 400 });
  const items = [];
  for (const item of body) {
    const result = v.safeParse(InflationConfigSchema, item);
    if (!result.success) return json({ ok: false, error: 'Validation failed' }, { status: 400 });
    items.push(result.output);
  }
  const writeResult = await writeCollection('inflation.json', InflationConfigSchema, items);
  if (!writeResult.ok)
    return json({ ok: false, error: writeResult.error.message }, { status: 500 });
  return json({ ok: true, data: items });
};
