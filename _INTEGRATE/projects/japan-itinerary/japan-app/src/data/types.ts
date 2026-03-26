import type * as v from 'valibot';
import type * as s from './schemas';

export type City = v.InferOutput<typeof s.CitySchema>;
export type BookingStatus = v.InferOutput<typeof s.BookingStatusSchema>;
export type Stop = v.InferOutput<typeof s.StopSchema>;
export type Day = v.InferOutput<typeof s.DaySchema>;
export type TripMeta = v.InferOutput<typeof s.TripMetaSchema>;
export type Booking = v.InferOutput<typeof s.BookingSchema>;
export type PaidEntry = v.InferOutput<typeof s.PaidEntrySchema>;
export type BudgetItem = v.InferOutput<typeof s.BudgetItemSchema>;
export type BudgetCategory = v.InferOutput<typeof s.BudgetCategorySchema>;
export type ChecklistItem = v.InferOutput<typeof s.ChecklistItemSchema>;
export type ChecklistSection = v.InferOutput<typeof s.ChecklistSectionSchema>;

export type ChecklistState = v.InferOutput<typeof s.ChecklistStateSchema>;
export type BookingState = v.InferOutput<typeof s.BookingStateSchema>;
export type ExpenseState = v.InferOutput<typeof s.ExpenseStateSchema>;
