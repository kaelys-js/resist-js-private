import * as v from 'valibot';

// --- Enums ---
export const CitySchema = v.picklist([
  'Tokyo',
  'Kyoto',
  'Osaka',
  'Nara',
  'Travel',
  'Nara/Osaka',
]);

export const BookingStatusSchema = v.picklist([
  'need_to_book',
  'booked',
  'na',
]);

// --- Stop ---
export const StopSchema = v.object({
  time: v.string(),
  location: v.string(),
  directions: v.string(),
  tips: v.string(),
  cost: v.nullable(v.number()),
  costLabel: v.optional(v.nullable(v.string())),
  mapQuery: v.optional(v.string()),
});

// --- Day ---
export const DaySchema = v.object({
  dayNumber: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(15)),
  date: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
  weekday: v.picklist(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  city: CitySchema,
  theme: v.string(),
  highlights: v.array(v.string()),
  stops: v.array(StopSchema),
  dinner: v.nullable(v.string()),
  lunch: v.nullable(v.string()),
  notes: v.nullable(v.string()),
  alsoConsider: v.optional(v.array(StopSchema)),
});

// --- Flight ---
const FlightSchema = v.object({
  code: v.string(),
  airline: v.literal('Zipair'),
  from: v.string(),
  to: v.string(),
  departDate: v.string(),
  departTime: v.string(),
  arriveDate: v.string(),
  arriveTime: v.string(),
  duration: v.string(),
  aircraft: v.optional(v.string()),
  terminal: v.optional(v.string()),
});

// --- Trip meta ---
export const TripMetaSchema = v.object({
  title: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  totalDays: v.literal(15),
  flights: v.object({
    outbound: FlightSchema,
    return: FlightSchema,
  }),
});

// --- Booking ---
export const BookingSchema = v.object({
  id: v.string(),
  name: v.string(),
  icon: v.string(),
  whenToBook: v.string(),
  estimatedCost: v.string(),
  costCurrency: v.picklist(['JPY', 'CAD']),
  platform: v.string(),
  platformUrl: v.optional(v.string()),
  notes: v.nullable(v.string()),
  defaultStatus: BookingStatusSchema,
  urgent: v.boolean(),
});

// --- Paid entry ---
export const PaidEntrySchema = v.object({
  name: v.string(),
  cost: v.union([v.number(), v.string()]),
  mustPreBook: v.boolean(),
});

// --- Budget ---
export const BudgetItemSchema = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.number(),
  currency: v.picklist(['JPY', 'CAD']),
  dayRef: v.optional(v.array(v.number())),
});

export const BudgetCategorySchema = v.object({
  id: v.string(),
  name: v.string(),
  icon: v.string(),
  estimatedRange: v.object({ low: v.number(), high: v.number() }),
  currency: v.picklist(['JPY', 'CAD']),
  items: v.array(BudgetItemSchema),
});

// --- Checklist ---
export const ChecklistItemSchema = v.object({
  id: v.string(),
  text: v.string(),
  subtitle: v.nullable(v.string()),
});

export const ChecklistSectionSchema = v.object({
  id: v.string(),
  title: v.string(),
  items: v.array(ChecklistItemSchema),
});

// --- Persisted state schemas ---
export const ChecklistStateSchema = v.record(v.string(), v.boolean());

export const BookingStateSchema = v.record(v.string(), BookingStatusSchema);

export const ExpenseStateSchema = v.record(
  v.string(),
  v.object({
    paid: v.boolean(),
    actualAmount: v.optional(v.number()),
  }),
);
