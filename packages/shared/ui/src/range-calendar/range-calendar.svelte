<script lang="ts">
import { type DateValue, isEqualMonth } from '@internationalized/date';
import { RangeCalendar as RangeCalendarPrimitive } from 'bits-ui';
import type { Snippet } from 'svelte';
import type { ButtonVariant } from '../button/index.js';
import { cn, type WithoutChildrenOrChild } from '../utils.js';
import RangeCalendarCaption from './range-calendar-caption.svelte';
import RangeCalendarCell from './range-calendar-cell.svelte';
import RangeCalendarDay from './range-calendar-day.svelte';
import RangeCalendarGrid from './range-calendar-grid.svelte';
import RangeCalendarGridBody from './range-calendar-grid-body.svelte';
import RangeCalendarGridHead from './range-calendar-grid-head.svelte';
import RangeCalendarGridRow from './range-calendar-grid-row.svelte';
import RangeCalendarHeadCell from './range-calendar-head-cell.svelte';
import RangeCalendarHeader from './range-calendar-header.svelte';
import RangeCalendarMonth from './range-calendar-month.svelte';
import RangeCalendarMonths from './range-calendar-months.svelte';
import RangeCalendarNav from './range-calendar-nav.svelte';
import RangeCalendarNextButton from './range-calendar-next-button.svelte';
import RangeCalendarPrevButton from './range-calendar-prev-button.svelte';

let {
	ref = $bindable(null),
	/** The selected date range value. */
	value = $bindable(),
	/** Placeholder date used when no selection exists. */
	placeholder = $bindable(),
	/** Format for day-of-week headers. @values long, short, narrow */
	weekdayFormat = 'short',
	class: className,
	/** Button variant for navigation arrows. @values outline, ghost */
	buttonVariant = 'ghost',
	/** Calendar caption display mode. @values dropdown, dropdown-months, dropdown-years, label */
	captionLayout = 'label',
	/** Locale identifier for internationalization. @values en, en-US, en-GB, fr, de, ja, zh */
	locale = 'en-US',
	months: monthsProp,
	/** Array of year values for the dropdown. */
	years,
	monthFormat: monthFormatProp,
	/** Format string for year display. @values numeric, 2-digit */
	yearFormat = 'numeric',
	/** Custom day cell snippet renderer. */
	day,
	/** Whether to disable days outside the current month. */
	disableDaysOutsideMonth = false,
	...restProps
}: WithoutChildrenOrChild<RangeCalendarPrimitive.RootProps> & {
	buttonVariant?: ButtonVariant;
	captionLayout?: 'dropdown' | 'dropdown-months' | 'dropdown-years' | 'label';
	months?: RangeCalendarPrimitive.MonthSelectProps['months'];
	years?: RangeCalendarPrimitive.YearSelectProps['years'];
	monthFormat?: RangeCalendarPrimitive.MonthSelectProps['monthFormat'];
	yearFormat?: RangeCalendarPrimitive.YearSelectProps['yearFormat'];
	day?: Snippet<[{ day: DateValue; outsideMonth: boolean }]>;
} = $props();

const monthFormat = $derived.by(() => {
	if (monthFormatProp) return monthFormatProp;
	if (captionLayout.startsWith('dropdown')) return 'short';
	return 'long';
});
</script>

<RangeCalendarPrimitive.Root
	bind:ref
	bind:value
	bind:placeholder
	{weekdayFormat}
	{disableDaysOutsideMonth}
	class={cn(
		"bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
		className
	)}
	{locale}
	{monthFormat}
	{yearFormat}
	{...restProps}
>
	{#snippet children({ months, weekdays })}
		<RangeCalendarMonths>
			<RangeCalendarNav>
				<RangeCalendarPrevButton variant={buttonVariant} />
				<RangeCalendarNextButton variant={buttonVariant} />
			</RangeCalendarNav>
			{#each months as month, monthIndex (month)}
				<RangeCalendarMonth>
					<RangeCalendarHeader>
						<RangeCalendarCaption
							{captionLayout}
							months={monthsProp}
							{monthFormat}
							{years}
							{yearFormat}
							month={month.value}
							bind:placeholder
							{locale}
							{monthIndex}
						/>
					</RangeCalendarHeader>

					<RangeCalendarGrid>
						<RangeCalendarGridHead>
							<RangeCalendarGridRow class="select-none">
								{#each weekdays as weekday (weekday)}
									<RangeCalendarHeadCell>
										{weekday.slice(0, 2)}
									</RangeCalendarHeadCell>
								{/each}
							</RangeCalendarGridRow>
						</RangeCalendarGridHead>
						<RangeCalendarGridBody>
							{#each month.weeks as weekDates (weekDates)}
								<RangeCalendarGridRow class="mt-2 w-full">
									{#each weekDates as date (date)}
										<RangeCalendarCell {date} month={month.value}>
											{#if day}
												{@render day({
													day: date,
													outsideMonth: !isEqualMonth(date, month.value),
												})}
											{:else}
												<RangeCalendarDay />
											{/if}
										</RangeCalendarCell>
									{/each}
								</RangeCalendarGridRow>
							{/each}
						</RangeCalendarGridBody>
					</RangeCalendarGrid>
				</RangeCalendarMonth>
			{/each}
		</RangeCalendarMonths>
	{/snippet}
</RangeCalendarPrimitive.Root>
