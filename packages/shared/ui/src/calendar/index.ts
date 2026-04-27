/**
 * Barrel re-export for the calendar compound component — exposes
 * Root / Caption / Cell / Day / Grid (+ GridBody / GridHead /
 * GridRow / HeadCell) / Header / Heading / Month / Months /
 * MonthSelect / Nav / NextButton / PrevButton / YearSelect
 * sub-components under both internal aliases and the
 * `Calendar*` public names.
 *
 * @module
 */

import Root from './calendar.svelte';
import Caption from './calendar-caption.svelte';
import Cell from './calendar-cell.svelte';
import Day from './calendar-day.svelte';
import Grid from './calendar-grid.svelte';
import GridBody from './calendar-grid-body.svelte';
import GridHead from './calendar-grid-head.svelte';
import GridRow from './calendar-grid-row.svelte';
import HeadCell from './calendar-head-cell.svelte';
import Header from './calendar-header.svelte';
import Heading from './calendar-heading.svelte';
import Month from './calendar-month.svelte';
import MonthSelect from './calendar-month-select.svelte';
import Months from './calendar-months.svelte';
import Nav from './calendar-nav.svelte';
import NextButton from './calendar-next-button.svelte';
import PrevButton from './calendar-prev-button.svelte';
import YearSelect from './calendar-year-select.svelte';

export {
  Day,
  Cell,
  Grid,
  Header,
  Months,
  GridRow,
  Heading,
  GridBody,
  GridHead,
  HeadCell,
  NextButton,
  PrevButton,
  Nav,
  Month,
  YearSelect,
  MonthSelect,
  Caption,
  //
  Root as Calendar,
};
