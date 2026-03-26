# Finances Dashboard — Design Document

**Date:** 2026-03-06
**Status:** Draft
**Scope:** New product (`@finances/editor`) at `packages/products/finances/editor/`
**Skill:** build-editor

---

## 1. Overview

Personal finance dashboard to track all expenses, income, debt, and lifetime costs from March 6, 2026 until age 65 (April 3, 2054 — ~28 years). Near-1:1 copy of `@webforge/editor` with game-specific code replaced by finance domain equivalents.

**What stays identical:** Dev toolbar (finance-specific feature flags), user system, hooks (client + server), vitals/perfume.js, error reporting, logging, i18n infrastructure, all shadcn-svelte UI components, Tailwind/themes/app.css, mode-watcher, Cloudflare adapter, wrangler, PWA, CSP, e2e test infra.

**What changes:** Scenes/project → finance data, game schemas → finance schemas, Babylon.js/runtime/plugin-api removed, sidebar nav → finance nav, feature flags → finance flags, app-meta → finance branding, new branding SVG.

---

## 2. Data Model

### User Profile
- Born: April 3, 1989
- Turns 65: April 3, 2054
- Time horizon: ~28 years (2026-2054)

### Data Categories & Schemas

All schemas use `v.strictObject()`, JSDoc on every field, `v.InferOutput` for types.

#### Settings
```
SettingsSchema {
  birthDate: Str        // ISO date string '1989-04-03'
  retirementAge: Num    // Default 65
  defaultInflationRate: Num  // Default 0.02 (2%)
}
```

#### Debts
```
DebtItemSchema {
  id: Str               // UUID
  name: Str             // e.g. 'Tangerine LOC'
  balance: Num          // Current balance
  isEstimate: Bool      // Whether amount is approximate
  notes: Str            // Optional context
}
```

#### Income Sources
```
IncomeSourceSchema {
  id: Str
  name: Str             // e.g. 'EI Payments'
  amount: Num           // Dollar amount
  frequency: picklist(['one-time', 'biweekly', 'monthly', 'annual'])
  startDate: Str        // ISO date
  endDate: optional(Str) // When income ends (null = indefinite)
  notes: Str
}
```

#### Purchases
```
PurchaseSchema {
  id: Str
  name: Str             // e.g. 'Amazon Order #1'
  amount: Num
  date: optional(Str)   // When purchase happens/happened
  category: picklist(['upcoming', 'planned'])
  notes: Str
}
```

#### Lifetime Expenses (recurring at intervals)
```
LifetimeExpenseSchema {
  id: Str
  name: Str             // e.g. 'Passport'
  totalBudget: Num      // Cost per renewal
  cycleYears: Num       // Renewal frequency
  lastRenewal: optional(Str)  // When last renewed
  nextDue: optional(Str)      // When next due
  notes: Str
}
```

#### Lifetime Replacements (items with custom replacement cycles)
```
LifetimeReplacementSchema {
  id: Str
  name: Str             // e.g. 'Cell Phone'
  totalBudget: Num      // Budget per replacement
  cycleYears: Num       // User-defined replacement cycle
  notes: Str
}
```

#### Monthly Expenses
```
MonthlyExpenseSchema {
  id: Str
  name: Str             // e.g. 'Rent'
  amount: Num           // Monthly amount
  isEstimate: Bool      // Whether amount is approximate
  billingCycle: picklist(['monthly', 'bimonthly'])
  category: picklist(['fixed', 'estimated'])
  notes: Str
}
```

#### Travel
```
TravelSchema {
  id: Str
  name: Str             // e.g. 'Japan #2'
  budget: Num           // Trip budget
  isEstimate: Bool
  planned: Bool         // Whether trip is planned/confirmed
  notes: Str
}
```

#### Inflation Config
```
InflationConfigSchema {
  category: Str         // Category name
  rate: Num             // Annual inflation rate (0.02 = 2%)
}
```

---

## 3. Architecture

### Data Flow

```
JSON files (src/lib/server/data/*.json)
  │
  ├── +page.server.ts (load functions)
  │     └── dataService.readCollection() → Result<T[]>
  │           └── safeParse(schema, jsonData) → validated data
  │
  ├── +page.svelte (render)
  │     └── $props().data → tables, charts, stat cards
  │
  └── API routes (src/routes/api/**/+server.ts)
        ├── GET → dataService.readCollection()
        ├── POST → validate + dataService.writeCollection()
        ├── PUT → validate + dataService.writeCollection()
        └── DELETE → filter + dataService.writeCollection()
```

### Data Service

```typescript
// src/lib/server/data/service.ts
type FinanceDataService = {
  read<T>(filename: Str, schema: Schema): Promise<Result<readonly T[]>>;
  write<T>(filename: Str, schema: Schema, data: T[]): Promise<Result<Void>>;
  readSettings(filename: Str, schema: Schema): Promise<Result<T>>;
  writeSettings(filename: Str, schema: Schema, data: T): Promise<Result<Void>>;
};
```

### Calculation Engine

```
src/lib/engine/projections.ts
  ├── calculateAnnualCost(item, type) → Result<Num>
  │     Monthly: amount × 12 (bimonthly: × 6)
  │     Lifetime/replacement: totalBudget ÷ cycleYears
  │     One-time: full amount in target year
  │
  ├── applyInflation(base, rate, years) → Result<Num>
  │     base × (1 + rate)^years
  │
  ├── projectYearlyExpenses(data, settings, inflation) → Result<YearlyProjection[]>
  │     Returns array of { year, categories: {...}, total } for 2026-2054
  │
  └── calculateLifetimeTotals(data, settings, inflation) → Result<LifetimeSummary>
        Per-item total over entire horizon

src/lib/engine/income.ts
  ├── projectIncome(sources, settings) → Result<YearlyIncome[]>
  │     EI: biweekly → mapped to specific dates
  │     One-time: placed in year they occur
  │     Monthly/annual: recurring with optional end date
  │
  └── calculateNetPosition(income, expenses, debts, assets) → Result<NetPosition>
```

---

## 4. Component Tree

### Layout Shell (adapted from webforge editor)

```
+layout.svelte
├── ModeWatcher (dark/light theme)
├── PaneGroup (resizable sidebar)
│   ├── Pane (sidebar)
│   │   └── AppSidebar.svelte
│   │       ├── SidebarHeader → AppLogo + "Finances"
│   │       ├── SidebarContent
│   │       │   ├── NavFinance (NEW) — nav items:
│   │       │   │   ├── Home (LayoutDashboard icon) → /
│   │       │   │   ├── Income (TrendingUp icon) → /income
│   │       │   │   ├── Debt (CreditCard icon) → /debt
│   │       │   │   ├── Monthly (Calendar icon) → /monthly
│   │       │   │   ├── Purchases (ShoppingBag icon) → /purchases
│   │       │   │   ├── Travel (Plane icon) → /travel
│   │       │   │   └── Lifetime (Clock icon) → /lifetime
│   │       │   └── NavSecondary — Settings, Help
│   │       └── SidebarFooter → NavUser (user dropdown)
│   ├── Handle (resize)
│   └── Pane (main content)
│       ├── SiteHeader (breadcrumbs + mode toggle)
│       └── {children} (page content)
└── DevToolbar (finance feature flags)
```

### Shared Components

```
StatCard.svelte
  props: { label: Str, value: Str, subtitle?: Str, trend?: 'up' | 'down' | 'neutral' }
  Uses: shadcn Card

DataTable.svelte
  props: { columns: Column[], data: T[], onEdit: (item) => void, onDelete: (item) => void }
  Uses: shadcn Table with row actions

ItemDialog.svelte
  props: { open: Bool, title: Str, fields: Field[], item?: T, onSave: (data) => void }
  Uses: shadcn Dialog + form inputs

ConfirmDialog.svelte
  props: { open: Bool, title: Str, description: Str, onConfirm: () => void }
  Uses: shadcn AlertDialog
```

### Page Components

```
/ (Overview)
├── StatCard × 5 (debt, monthly burn, annual, years to 65, lifetime total)
├── Layerchart StackedBar (annual expenses by category, 2026-2054)
├── Layerchart Line (income vs expenses)
├── Debt progress bars
└── Net position summary

/debt
├── Total debt header
├── DataTable (debts)
└── ItemDialog (add/edit debt)

/income
├── DataTable (income sources)
├── Layerchart Line (income projection)
├── EI schedule display
└── ItemDialog (add/edit income)

/monthly
├── Total monthly + annual headers
├── DataTable grouped by category (fixed/estimated)
├── Layerchart Pie (expense breakdown)
└── ItemDialog (add/edit expense)

/purchases
├── Section: Upcoming Purchases
│   ├── DataTable (purchases)
│   └── ItemDialog (add/edit purchase)
└── Section: Lifetime Replacements
    ├── DataTable (replacements with annual/lifetime cost columns)
    └── ItemDialog (add/edit replacement)

/travel
├── Total travel budget header
├── DataTable (trips)
└── ItemDialog (add/edit trip)

/lifetime
├── Grand total header
├── Inflation toggle (adjusted vs nominal)
├── Per-category inflation config (inline edit)
├── Year-by-year breakdown table (2026-2054)
├── Layerchart Area (cumulative cost curve)
└── Per-item lifetime cost table

/settings
├── Birth date + retirement age
├── Default inflation rate
├── Per-category inflation overrides
└── Theme selection
```

---

## 5. Feature Flags (DevToolbar)

Replace webforge game flags with:

| Flag | Default | Description |
|------|---------|-------------|
| showCharts | true | Show layerchart visualizations |
| showInflation | true | Apply inflation to projections |
| showProjections | true | Show year-by-year projections |
| showNetPosition | true | Show income vs expenses analysis |
| showDevToolbar | false | Dev toolbar visibility |
| sidebarOpen | true | Sidebar open/closed |
| sidebarLogo | true | Show logo in sidebar |
| sidebarAppName | true | Show app name in sidebar |

---

## 6. Seed Data

Pre-populated from user input:

| Category | Count | Seeded Total |
|----------|-------|-------------|
| Debts | 8 items | ~$12,795 |
| Income | 5 sources | ~$36,088+ |
| Purchases | 3 items | ~$10,000 |
| Lifetime Expenses | 4 items | varies |
| Monthly (fixed) | 5 items | $3,405/mo |
| Monthly (estimated) | 9 items | $821/mo |
| Lifetime Replacements | 17 items | $55,600 budgets |
| Travel | 17 trips | $52,000 |

---

## 7. Accessibility

- All tables have proper ARIA roles and labels
- Charts have text alternatives (aria-label with summary data)
- Forms use proper labels and error messages
- Keyboard navigation for all CRUD operations
- Dark/light mode respects prefers-color-scheme
- Reduced motion respected for chart animations
