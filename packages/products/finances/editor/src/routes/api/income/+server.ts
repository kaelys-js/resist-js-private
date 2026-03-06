import { IncomeSourceSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('income.json', IncomeSourceSchema);
export const POST = collectionPost('income.json', IncomeSourceSchema);
