import { MonthlyExpenseSchema } from '$lib/schemas/finances';
import { collectionGet, collectionPost } from '../_helpers';
export const GET = collectionGet('monthly-expenses.json', MonthlyExpenseSchema);
export const POST = collectionPost('monthly-expenses.json', MonthlyExpenseSchema);
