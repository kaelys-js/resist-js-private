import { IncomeSourceSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('income.json', IncomeSourceSchema);
export const DELETE = collectionDelete('income.json', IncomeSourceSchema);
