import { MonthlyExpenseSchema } from '$lib/schemas/finances';
import { collectionPut, collectionDelete } from '../../_helpers';
export const PUT = collectionPut('monthly-expenses.json', MonthlyExpenseSchema);
export const DELETE = collectionDelete('monthly-expenses.json', MonthlyExpenseSchema);
