<script lang="ts">
  /**
   * RangeCalendarCaption Svelte component — header label for
   * the calendar, rendered either as plain text or as
   * month/year dropdowns depending on `captionLayout`.
   *
   * @module
   */
  import { DateFormatter, type DateValue, getLocalTimeZone } from '@internationalized/date';
  import type { ComponentProps } from 'svelte';
  import type RangeCalendar from './range-calendar.svelte';
  import RangeCalendarMonthSelect from './range-calendar-month-select.svelte';
  import RangeCalendarYearSelect from './range-calendar-year-select.svelte';

  let {
    /** Calendar caption display mode. @values dropdown, dropdown-months, dropdown-years, label */
    captionLayout,
    /** Array of month data objects for the calendar grid. */
    months,
    /** Format string for month display. @values long, short, narrow, numeric, 2-digit */
    monthFormat,
    /** Array of year values for the dropdown. */
    years,
    /** Format string for year display. @values numeric, 2-digit */
    yearFormat,
    /** The displayed month reference date. */
    month,
    /** Locale identifier for internationalization. @values en, en-US, en-GB, fr, de, ja, zh */
    locale,
    /** Placeholder date used when no selection exists. */
    placeholder = $bindable(),
    /** Index of the current month being displayed. @values 0, 1, 2, 3 */
    monthIndex = 0,
  }: {
    captionLayout: ComponentProps<typeof RangeCalendar>['captionLayout'];
    months: ComponentProps<typeof RangeCalendarMonthSelect>['months'];
    monthFormat: ComponentProps<typeof RangeCalendarMonthSelect>['monthFormat'];
    years: ComponentProps<typeof RangeCalendarYearSelect>['years'];
    yearFormat: ComponentProps<typeof RangeCalendarYearSelect>['yearFormat'];
    month: DateValue;
    placeholder: DateValue | undefined;
    locale: string;
    monthIndex: number;
  } = $props();

  function formatYear(date: DateValue) {
    const dateObj = date.toDate(getLocalTimeZone());
    if (typeof yearFormat === 'function') {
      return yearFormat(dateObj.getFullYear());
    }
    return new DateFormatter(locale, { year: yearFormat }).format(dateObj);
  }

  function formatMonth(date: DateValue) {
    const dateObj = date.toDate(getLocalTimeZone());
    if (typeof monthFormat === 'function') {
      return monthFormat(dateObj.getMonth() + 1);
    }
    return new DateFormatter(locale, { month: monthFormat }).format(dateObj);
  }
</script>

{#snippet MonthSelect()}
  <RangeCalendarMonthSelect
    {months}
    {monthFormat}
    value={month.month}
    onchange={(e) => {
      if (!placeholder) return;
      const v = Number.parseInt(e.currentTarget.value);
      const newPlaceholder = placeholder.set({ month: v });
      placeholder = newPlaceholder.subtract({ months: monthIndex });
    }}
  />
{/snippet}

{#snippet YearSelect()}
  <RangeCalendarYearSelect {years} {yearFormat} value={month.year} />
{/snippet}

{#if captionLayout === 'dropdown'}
  {@render MonthSelect()}
  {@render YearSelect()}
{:else if captionLayout === 'dropdown-months'}
  {@render MonthSelect()}
  {#if placeholder}
    {formatYear(placeholder)}
  {/if}
{:else if captionLayout === 'dropdown-years'}
  {#if placeholder}
    {formatMonth(placeholder)}
  {/if}
  {@render YearSelect()}
{:else}
  {formatMonth(month)} {formatYear(month)}
{/if}
