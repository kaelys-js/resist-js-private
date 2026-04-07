import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Num } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import {
  formatNumber,
  formatCurrency,
  formatDate,
  formatTime,
  formatRelativeTime,
  formatList,
  formatDateRange,
  formatDisplayName,
  formatPercent,
  formatUnit,
  formatDuration,
  parseNumberSkeleton,
  parseDateTimeSkeleton,
  DateTimeStyleSchema,
  RelativeTimeUnitSchema,
  RelativeTimeNumericSchema,
  RelativeTimeStyleSchema,
  ListFormatTypeSchema,
  ListFormatStyleSchema,
  DisplayNameTypeSchema,
  DisplayNameStyleSchema,
  UnitDisplaySchema,
  DurationStyleSchema,
  DurationInputSchema,
} from './format';

// =============================================================================
// Schema validation
// =============================================================================

describe('DateTimeStyleSchema', () => {
  it.each(['short', 'medium', 'long', 'full'])('accepts %s', (style) => {
    const result = safeParse(DateTimeStyleSchema, style);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid style', () => {
    expect(safeParse(DateTimeStyleSchema, 'compact').ok).toBe(false);
  });
});

describe('RelativeTimeUnitSchema', () => {
  it.each([
    'second',
    'minute',
    'hour',
    'day',
    'week',
    'month',
    'quarter',
    'year',
  ])('accepts %s', (unit) => {
    expect(safeParse(RelativeTimeUnitSchema, unit).ok).toBe(true);
  });

  it('rejects invalid unit', () => {
    expect(safeParse(RelativeTimeUnitSchema, 'decade').ok).toBe(false);
  });
});

describe('RelativeTimeNumericSchema', () => {
  it.each(['always', 'auto'])('accepts %s', (val) => {
    expect(safeParse(RelativeTimeNumericSchema, val).ok).toBe(true);
  });
});

describe('RelativeTimeStyleSchema', () => {
  it.each(['long', 'short', 'narrow'])('accepts %s', (val) => {
    expect(safeParse(RelativeTimeStyleSchema, val).ok).toBe(true);
  });
});

describe('ListFormatTypeSchema', () => {
  it.each(['conjunction', 'disjunction', 'unit'])('accepts %s', (val) => {
    expect(safeParse(ListFormatTypeSchema, val).ok).toBe(true);
  });
});

describe('ListFormatStyleSchema', () => {
  it.each(['long', 'short', 'narrow'])('accepts %s', (val) => {
    expect(safeParse(ListFormatStyleSchema, val).ok).toBe(true);
  });
});

describe('DisplayNameTypeSchema', () => {
  it.each([
    'language',
    'region',
    'currency',
    'script',
    'calendar',
    'dateTimeField',
  ])('accepts %s', (val) => {
    expect(safeParse(DisplayNameTypeSchema, val).ok).toBe(true);
  });
});

describe('DisplayNameStyleSchema', () => {
  it.each(['long', 'short', 'narrow'])('accepts %s', (val) => {
    expect(safeParse(DisplayNameStyleSchema, val).ok).toBe(true);
  });
});

describe('UnitDisplaySchema', () => {
  it.each(['long', 'short', 'narrow'])('accepts %s', (val) => {
    expect(safeParse(UnitDisplaySchema, val).ok).toBe(true);
  });
});

describe('DurationStyleSchema', () => {
  it.each(['long', 'short', 'narrow', 'digital'])('accepts %s', (val) => {
    expect(safeParse(DurationStyleSchema, val).ok).toBe(true);
  });
});

describe('DurationInputSchema', () => {
  it('accepts valid duration with all fields', () => {
    const result = safeParse(DurationInputSchema, {
      hours: 1,
      minutes: 30,
      seconds: 45,
    });
    expect(result.ok).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = safeParse(DurationInputSchema, {});
    expect(result.ok).toBe(true);
  });

  it('rejects unknown fields (strictObject)', () => {
    const result = safeParse(DurationInputSchema, { hours: 1, extra: 'nope' });
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// formatNumber
// =============================================================================

describe('formatNumber', () => {
  it('formats integer with en-US locale', () => {
    const result = formatNumber(1_234_567, 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1,234,567');
    }
  });

  it('formats decimal with en-US locale', () => {
    const result = formatNumber(1234.56, 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1,234');
    }
  });

  it('formats with de-DE locale', () => {
    const result = formatNumber(1234.56, 'de-DE', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1.234');
    }
  });

  it('applies custom options', () => {
    const result = formatNumber(0.42, 'en-US', { options: { style: 'percent' } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('42');
    }
  });
});

// =============================================================================
// formatCurrency
// =============================================================================

describe('formatCurrency', () => {
  it('formats USD', () => {
    const result = formatCurrency(1234.56, 'en-US', 'USD');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1,234.56');
      expect(result.data).toContain('$');
    }
  });

  it('formats EUR with de-DE locale', () => {
    const result = formatCurrency(1234.56, 'de-DE', 'EUR');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1.234,56');
    }
  });

  it('formats JPY (no decimals)', () => {
    const result = formatCurrency(1234, 'ja-JP', 'JPY');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1,234');
    }
  });
});

// =============================================================================
// formatDate
// =============================================================================

describe('formatDate', () => {
  const testDate = new Date('2026-02-23T00:00:00Z');

  it('formats with short style', () => {
    const result = formatDate(testDate, 'en-US', { style: 'short' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('2');
    }
  });

  it('formats with long style', () => {
    const result = formatDate(testDate, 'en-US', { style: 'long' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('February');
    }
  });

  it('formats with custom options', () => {
    const result = formatDate(testDate, 'en-US', {
      options: { year: 'numeric', month: '2-digit' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('02');
    }
  });

  it('accepts Unix timestamp', () => {
    const result = formatDate(testDate.getTime(), 'en-US', { style: 'short' });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatTime
// =============================================================================

describe('formatTime', () => {
  const testDate = new Date('2026-02-23T14:30:45Z');

  it('formats with short style', () => {
    const result = formatTime(testDate, 'en-US', { style: 'short' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatch(/\d{1,2}:\d{2}/);
    }
  });

  it('formats with medium style', () => {
    const result = formatTime(testDate, 'en-US', { style: 'medium' });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatRelativeTime
// =============================================================================

describe('formatRelativeTime', () => {
  it('formats past time', () => {
    const result = formatRelativeTime(-3, 'day', 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('3 days ago');
    }
  });

  it('formats future time', () => {
    const result = formatRelativeTime(2, 'hour', 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('in 2 hours');
    }
  });

  it('formats with auto numeric (yesterday)', () => {
    const result = formatRelativeTime(-1, 'day', 'en', { numeric: 'auto' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('yesterday');
    }
  });

  it('rejects invalid unit', () => {
    const result = formatRelativeTime(-1, 'decade' as never, 'en', {});
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// formatList
// =============================================================================

describe('formatList', () => {
  it('formats conjunction list (and)', () => {
    const result = formatList(['Alice', 'Bob', 'Charlie'], 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice, Bob, and Charlie');
    }
  });

  it('formats disjunction list (or)', () => {
    const result = formatList(['Alice', 'Bob', 'Charlie'], 'en', { type: 'disjunction' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice, Bob, or Charlie');
    }
  });

  it('formats two items', () => {
    const result = formatList(['Alice', 'Bob'], 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice and Bob');
    }
  });

  it('formats single item', () => {
    const result = formatList(['Alice'], 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice');
    }
  });
});

// =============================================================================
// formatDateRange
// =============================================================================

describe('formatDateRange', () => {
  it('formats date range across months', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const end = new Date('2026-02-20T00:00:00Z');
    const result = formatDateRange(start, end, 'en-US', { style: 'medium' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Jan');
      expect(result.data).toContain('Feb');
    }
  });

  it('formats date range same month', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const end = new Date('2026-03-15T00:00:00Z');
    const result = formatDateRange(start, end, 'en-US', { style: 'medium' });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatDisplayName
// =============================================================================

describe('formatDisplayName', () => {
  it('formats language display name', () => {
    const result = formatDisplayName('en', 'en', 'language', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('English');
    }
  });

  it('formats region display name', () => {
    const result = formatDisplayName('US', 'en', 'region', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('United States');
    }
  });

  it('formats currency display name', () => {
    const result = formatDisplayName('USD', 'en', 'currency', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Dollar');
    }
  });
});

// =============================================================================
// formatPercent
// =============================================================================

describe('formatPercent', () => {
  it('formats 0.5 as 50%', () => {
    const result = formatPercent(0.5, 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('50');
    }
  });

  it('formats 0 as 0%', () => {
    const result = formatPercent(0, 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('0');
    }
  });

  it('formats 1 as 100%', () => {
    const result = formatPercent(1, 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('100');
    }
  });
});

// =============================================================================
// formatUnit
// =============================================================================

describe('formatUnit', () => {
  it('formats kilometer', () => {
    const result = formatUnit(42, 'kilometer', 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('42');
    }
  });

  it('formats kilogram with long display', () => {
    const result = formatUnit(5, 'kilogram', 'en', { unitDisplay: 'long' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('kilogram');
    }
  });
});

// =============================================================================
// formatDuration
// =============================================================================

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    const result = formatDuration({ hours: 2, minutes: 30 }, 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('2');
      expect(result.data).toContain('30');
    }
  });

  it('formats all fields', () => {
    const result = formatDuration(
      { years: 1, months: 2, weeks: 3, days: 4, hours: 5, minutes: 6, seconds: 7 },
      'en',
      {},
    );
    expect(result.ok).toBe(true);
  });

  it('formats with short style', () => {
    const result = formatDuration({ hours: 1, minutes: 15 }, 'en', { style: 'short' });
    expect(result.ok).toBe(true);
  });

  it('skips zero-value fields', () => {
    const result = formatDuration({ hours: 0, minutes: 45 }, 'en', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('45');
    }
  });
});

// =============================================================================
// parseNumberSkeleton
// =============================================================================

describe('parseNumberSkeleton', () => {
  it('parses .00 as minimumFractionDigits', () => {
    const result = parseNumberSkeleton('.00');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.minimumFractionDigits).toBe(2);
    }
  });

  it('parses percent as style percent', () => {
    const result = parseNumberSkeleton('percent');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.style).toBe('percent');
    }
  });

  it('parses compact-short', () => {
    const result = parseNumberSkeleton('compact-short');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notation).toBe('compact');
    }
  });

  it('returns ok for empty skeleton', () => {
    const result = parseNumberSkeleton('');
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// parseDateTimeSkeleton
// =============================================================================

describe('parseDateTimeSkeleton', () => {
  it('parses yyyy as year: numeric', () => {
    const result = parseDateTimeSkeleton('yyyy');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.year).toBe('numeric');
    }
  });

  it('parses MM as month: 2-digit', () => {
    const result = parseDateTimeSkeleton('MM');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.month).toBe('2-digit');
    }
  });

  it('parses dd as day: 2-digit', () => {
    const result = parseDateTimeSkeleton('dd');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.day).toBe('2-digit');
    }
  });

  it('returns ok for empty skeleton', () => {
    const result = parseDateTimeSkeleton('');
    expect(result.ok).toBe(true);
  });

  it('parses yy as year: 2-digit', () => {
    const result = parseDateTimeSkeleton('yy');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.year).toBe('2-digit');
    }
  });

  it('parses MMM as month: short', () => {
    const result = parseDateTimeSkeleton('MMM');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.month).toBe('short');
    }
  });

  it('parses MMMM as month: long', () => {
    const result = parseDateTimeSkeleton('MMMM');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.month).toBe('long');
    }
  });

  it('parses M as month: numeric', () => {
    const result = parseDateTimeSkeleton('M');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.month).toBe('numeric');
    }
  });

  it('parses EEEE as weekday: long', () => {
    const result = parseDateTimeSkeleton('EEEE');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weekday).toBe('long');
    }
  });

  it('parses E as weekday: short', () => {
    const result = parseDateTimeSkeleton('E');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weekday).toBe('short');
    }
  });

  it('parses h as hour 12h numeric', () => {
    const result = parseDateTimeSkeleton('h');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hour).toBe('numeric');
      expect(result.data.hourCycle).toBe('h12');
    }
  });

  it('parses HH as hour 24h 2-digit', () => {
    const result = parseDateTimeSkeleton('HH');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hour).toBe('2-digit');
      expect(result.data.hourCycle).toBe('h23');
    }
  });

  it('parses mm as minute: 2-digit', () => {
    const result = parseDateTimeSkeleton('mm');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.minute).toBe('2-digit');
    }
  });

  it('parses ss as second: 2-digit', () => {
    const result = parseDateTimeSkeleton('ss');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.second).toBe('2-digit');
    }
  });

  it('parses z as timeZoneName: short', () => {
    const result = parseDateTimeSkeleton('z');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.timeZoneName).toBe('short');
    }
  });

  it('parses zzzz as timeZoneName: long', () => {
    const result = parseDateTimeSkeleton('zzzz');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.timeZoneName).toBe('long');
    }
  });

  it('ignores unknown symbols', () => {
    const result = parseDateTimeSkeleton('yyyyXXdd');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.year).toBe('numeric');
      expect(result.data.day).toBe('2-digit');
    }
  });
});

// =============================================================================
// Additional parseNumberSkeleton token coverage
// =============================================================================

describe('parseNumberSkeleton — extended tokens', () => {
  it('parses currency/USD', () => {
    const result = parseNumberSkeleton('currency/USD');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.style).toBe('currency');
      expect(result.data.currency).toBe('USD');
    }
  });

  it('parses unit/kilometer', () => {
    const result = parseNumberSkeleton('unit/kilometer');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.style).toBe('unit');
      expect(result.data.unit).toBe('kilometer');
    }
  });

  it('parses measure-unit/celsius', () => {
    const result = parseNumberSkeleton('measure-unit/celsius');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.style).toBe('unit');
      expect(result.data.unit).toBe('celsius');
    }
  });

  it('parses compact-long', () => {
    const result = parseNumberSkeleton('compact-long');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notation).toBe('compact');
      expect(result.data.compactDisplay).toBe('long');
    }
  });

  it('parses scientific', () => {
    const result = parseNumberSkeleton('scientific');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notation).toBe('scientific');
    }
  });

  it('parses engineering', () => {
    const result = parseNumberSkeleton('engineering');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notation).toBe('engineering');
    }
  });

  it('parses sign-always', () => {
    const result = parseNumberSkeleton('sign-always');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.signDisplay).toBe('always');
    }
  });

  it('parses sign-never', () => {
    const result = parseNumberSkeleton('sign-never');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.signDisplay).toBe('never');
    }
  });

  it('parses sign-except-zero', () => {
    const result = parseNumberSkeleton('sign-except-zero');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.signDisplay).toBe('exceptZero');
    }
  });

  it('parses sign-auto', () => {
    const result = parseNumberSkeleton('sign-auto');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.signDisplay).toBe('auto');
    }
  });

  it('parses group-off', () => {
    const result = parseNumberSkeleton('group-off');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.useGrouping).toBe(false);
    }
  });

  it('parses integer', () => {
    const result = parseNumberSkeleton('integer');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.maximumFractionDigits).toBe(0);
    }
  });

  it('parses .## as max fraction digits', () => {
    const result = parseNumberSkeleton('.##');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.maximumFractionDigits).toBe(2);
    }
  });

  it('parses .00## as mixed fraction digits', () => {
    const result = parseNumberSkeleton('.00##');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.minimumFractionDigits).toBe(2);
      expect(result.data.maximumFractionDigits).toBe(4);
    }
  });

  it('ignores unknown tokens', () => {
    const result = parseNumberSkeleton('unknown-token .00');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.minimumFractionDigits).toBe(2);
    }
  });
});

// =============================================================================
// Error path coverage
// =============================================================================

describe('error paths', () => {
  it('formatNumber returns error for invalid value', () => {
    const result = formatNumber('abc' as unknown as Num, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('formatCurrency returns error for invalid value', () => {
    const result = formatCurrency('abc' as unknown as Num, 'en', 'USD');
    expect(result.ok).toBe(false);
  });

  it('formatTime with undefined style defaults to medium', () => {
    const result = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain(':30');
    }
  });

  it('formatDate with both style and options undefined uses empty options', () => {
    const result = formatDate(new Date('2026-02-23'), 'en-US', {});
    expect(result.ok).toBe(true);
  });

  it('formatDateRange with both style and options undefined', () => {
    const result = formatDateRange(new Date('2026-01-15'), new Date('2026-02-23'), 'en-US', {});
    expect(result.ok).toBe(true);
  });

  it('formatRelativeTime returns error for invalid numeric', () => {
    const result = formatRelativeTime(1, 'day', 'en', { numeric: 'invalid' as never });
    expect(result.ok).toBe(false);
  });

  it('formatRelativeTime returns error for invalid style', () => {
    const result = formatRelativeTime(1, 'day', 'en', { style: 'invalid' as never });
    expect(result.ok).toBe(false);
  });

  it('formatDisplayName with short style', () => {
    const result = formatDisplayName('en', 'en', 'language', { style: 'short' });
    expect(result.ok).toBe(true);
  });

  it('formatPercent with custom options', () => {
    const result = formatPercent(0.256, 'en-US', { options: { minimumFractionDigits: 1 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('25.6');
    }
  });

  it('formatList with narrow style', () => {
    const result = formatList(['a', 'b'], 'en', { type: 'conjunction', style: 'narrow' });
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// Intl exception / catch-block coverage
// =============================================================================

describe('Intl exception catch blocks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formatNumber — Intl.NumberFormat constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('mock NumberFormat error');
    });
    const result = formatNumber(123, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('formatDate — Intl.DateTimeFormat constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('mock DateTimeFormat error');
    });
    const result = formatDate(new Date('2026-01-01'), 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('formatTime — Intl.DateTimeFormat constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('mock DateTimeFormat error');
    });
    const result = formatTime(new Date('2026-01-01T12:00:00'), 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('formatRelativeTime — Intl.RelativeTimeFormat constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'RelativeTimeFormat').mockImplementation(() => {
      throw new Error('mock RelativeTimeFormat error');
    });
    const result = formatRelativeTime(-1, 'day', 'en', {});
    expect(result.ok).toBe(false);
  });

  it('formatList — Intl.ListFormat constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'ListFormat').mockImplementation(() => {
      throw new Error('mock ListFormat error');
    });
    const result = formatList(['a', 'b'], 'en', {});
    expect(result.ok).toBe(false);
  });

  it('formatDateRange — Intl.DateTimeFormat formatRange throws → result.ok === false', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('mock formatRange error');
    });
    const start = new Date('2026-01-01');
    const end = new Date('2026-02-01');
    const result = formatDateRange(start, end, 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('formatDisplayName — Intl.DisplayNames.of returns undefined → result.ok === false', () => {
    vi.spyOn(Intl, 'DisplayNames').mockImplementation(
      () =>
        ({
          of: () => undefined,
          resolvedOptions: () => ({
            locale: 'en',
            type: 'language' as const,
            style: 'long' as const,
          }),
        }) as unknown as Intl.DisplayNames,
    );
    const result = formatDisplayName('ZZZZ', 'en', 'language', {});
    expect(result.ok).toBe(false);
  });

  it('formatDisplayName — Intl.DisplayNames constructor throws → result.ok === false', () => {
    vi.spyOn(Intl, 'DisplayNames').mockImplementation(() => {
      throw new Error('mock DisplayNames error');
    });
    const result = formatDisplayName('en', 'en', 'language', {});
    expect(result.ok).toBe(false);
  });

  it('formatDuration — Intl.DurationFormat unavailable → result.ok === false', () => {
    const intlRecord = Intl as Record<string, unknown>;
    const original = intlRecord.DurationFormat;
    delete intlRecord.DurationFormat;
    try {
      const result = formatDuration({ hours: 1, minutes: 30 }, 'en', {});
      expect(result.ok).toBe(false);
    } finally {
      intlRecord.DurationFormat = original;
    }
  });
});

// =============================================================================
// parseNumberSkeleton — group-min2 token
// =============================================================================

// =============================================================================
// Branch coverage — format.ts uncovered branches
// =============================================================================

describe('formatDisplayName — displayName undefined branch (line 794)', () => {
  const RealDisplayNames = Intl.DisplayNames;

  afterEach(() => {
    (Intl as Record<string, unknown>).DisplayNames = RealDisplayNames;
  });

  it('returns error when Intl.DisplayNames.of() returns undefined', () => {
    // Replace Intl.DisplayNames with a class whose .of() returns undefined
    const FakeDisplayNames = class {
      of(): undefined {
        return undefined;
      }
    };

    (Intl as Record<string, unknown>).DisplayNames = FakeDisplayNames;

    const result = formatDisplayName('INVALID', 'en', 'language', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('LOCALE.FORMAT_FAILED');
    }
  });
});

describe('styleToOptions — unreachable branches through public API', () => {
  // Lines 64, 70, 82, 95: These branches are in the private `styleToOptions` function.
  // The public API validates style/kind via FormatDateOptionsSchema BEFORE calling styleToOptions,
  // so invalid values never reach styleToOptions. These are defensive checks.
  // We verify the closest reachable paths:

  it('formatDate rejects invalid style at options validation level', () => {
    const result = formatDate(new Date(), 'en', { style: 'invalid' as never });
    expect(result.ok).toBe(false);
  });

  it('formatTime rejects invalid style at options validation level', () => {
    const result = formatTime(new Date(), 'en', { style: 'invalid' as never });
    expect(result.ok).toBe(false);
  });

  it('formatDateRange rejects invalid style at options validation level', () => {
    const result = formatDateRange(new Date(), new Date(), 'en', { style: 'invalid' as never });
    expect(result.ok).toBe(false);
  });

  // Confirm all valid style values work for both date and time
  it.each([
    'short',
    'medium',
    'long',
    'full',
  ] as const)('formatDate succeeds with %s style', (style) => {
    const result = formatDate(new Date('2026-01-01'), 'en', { style });
    expect(result.ok).toBe(true);
  });

  it.each([
    'short',
    'medium',
    'long',
    'full',
  ] as const)('formatTime succeeds with %s style', (style) => {
    const result = formatTime(new Date('2026-01-01T12:00:00'), 'en', { style });
    expect(result.ok).toBe(true);
  });

  it.each([
    'short',
    'medium',
    'long',
    'full',
  ] as const)('formatDateRange succeeds with %s style', (style) => {
    const result = formatDateRange(new Date('2026-01-01'), new Date('2026-02-01'), 'en', { style });
    expect(result.ok).toBe(true);
  });
});

describe('parseNumberSkeleton — group-min2', () => {
  it('parses group-min2 as useGrouping: min2', () => {
    const result = parseNumberSkeleton('group-min2');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.useGrouping).toBe('min2');
    }
  });
});

// =============================================================================
// Additional branch coverage — styleToOptions / formatDate / formatTime / etc.
// =============================================================================

describe('formatDate — additional style branches', () => {
  const testDate = new Date('2026-02-23T00:00:00Z');

  it('formats with full style (weekday included)', () => {
    const result = formatDate(testDate, 'en-US', { style: 'full' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // full style includes weekday: 'long'
      expect(result.data).toContain('2026');
      expect(result.data).toContain('February');
    }
  });

  it('formats with medium style', () => {
    const result = formatDate(testDate, 'en-US', { style: 'medium' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Feb');
    }
  });
});

describe('formatTime — additional branches', () => {
  const testDate = new Date('2026-02-23T14:30:45Z');

  it('formats with custom options (options branch, not style)', () => {
    const result = formatTime(testDate, 'en-US', {
      options: { hour: '2-digit', minute: '2-digit', hour12: false },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatch(/\d{2}:\d{2}/);
    }
  });

  it('formats with long style (timeZoneName: short)', () => {
    const result = formatTime(testDate, 'en-US', { style: 'long' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatch(/\d/);
    }
  });

  it('formats with full style (timeZoneName: long)', () => {
    const result = formatTime(testDate, 'en-US', { style: 'full' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatch(/\d/);
    }
  });
});

describe('formatDateRange — additional branches', () => {
  const start = new Date('2026-01-15T00:00:00Z');
  const end = new Date('2026-02-20T00:00:00Z');

  it('formats with custom options (options branch, not style)', () => {
    const result = formatDateRange(start, end, 'en-US', {
      options: { year: 'numeric', month: 'short' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Jan');
      expect(result.data).toContain('Feb');
    }
  });

  it('formats with long style', () => {
    const result = formatDateRange(start, end, 'en-US', { style: 'long' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('January');
      expect(result.data).toContain('February');
    }
  });
});

describe('formatCurrency — invalid currency error', () => {
  it('returns error for invalid currency code', () => {
    const result = formatCurrency(100, 'en-US', 'NOTREAL');
    expect(result.ok).toBe(false);
  });
});

describe('formatUnit — additional branches', () => {
  it('formats with narrow display', () => {
    const result = formatUnit(10, 'meter', 'en', { unitDisplay: 'narrow' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('10');
    }
  });

  it('formats with extra options spread', () => {
    const result = formatUnit(3.14159, 'liter', 'en', {
      unitDisplay: 'long',
      options: { maximumFractionDigits: 1 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('3.1');
    }
  });

  it('returns error for invalid unit string', () => {
    const result = formatUnit(10, '' as never, 'en', {});
    expect(result.ok).toBe(false);
  });
});

describe('formatDuration — additional style branches', () => {
  it('formats with narrow style', () => {
    const result = formatDuration({ hours: 2, minutes: 15 }, 'en', { style: 'narrow' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('2');
    }
  });

  it('formats with digital style', () => {
    const result = formatDuration({ hours: 1, minutes: 30, seconds: 45 }, 'en', {
      style: 'digital',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1');
    }
  });
});

describe('parseDateTimeSkeleton — additional token branches', () => {
  it('parses single d as day: numeric', () => {
    const result = parseDateTimeSkeleton('d');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.day).toBe('numeric');
    }
  });

  it('parses hh as hour 12h 2-digit', () => {
    const result = parseDateTimeSkeleton('hh');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hour).toBe('2-digit');
      expect(result.data.hourCycle).toBe('h12');
    }
  });

  it('parses H as hour 24h numeric', () => {
    const result = parseDateTimeSkeleton('H');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.hour).toBe('numeric');
      expect(result.data.hourCycle).toBe('h23');
    }
  });

  it('parses single m as minute: numeric', () => {
    const result = parseDateTimeSkeleton('m');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.minute).toBe('numeric');
    }
  });

  it('parses single s as second: numeric', () => {
    const result = parseDateTimeSkeleton('s');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.second).toBe('numeric');
    }
  });
});

// =============================================================================
// Input validation failure branch coverage
// =============================================================================

describe('formatNumber — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatNumber(1, 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid value (string)', () => {
    const result = formatNumber('not-a-number' as never, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatNumber(1, 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatCurrency — validation failures', () => {
  it('returns error for invalid value (non-number)', () => {
    const result = formatCurrency('abc' as never, 'en', 'USD');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatCurrency(100, 123 as never, 'USD');
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid currency (non-string)', () => {
    const result = formatCurrency(100, 'en', 123 as never);
    expect(result.ok).toBe(false);
  });
});

describe('formatDate — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatDate(new Date(), 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatDate(new Date(), 123 as never, { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid date value (non-date non-number)', () => {
    const result = formatDate('not-a-date' as never, 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });
});

describe('formatTime — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatTime(new Date(), 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatTime(new Date(), 123 as never, { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid date value (non-date non-number)', () => {
    const result = formatTime('not-a-date' as never, 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });
});

describe('formatRelativeTime — validation failures', () => {
  it('returns error for invalid value (non-number)', () => {
    const result = formatRelativeTime('abc' as never, 'day', 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatRelativeTime(-1, 'day', 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatList — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatList(['a'], 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('throws for invalid items (non-iterable)', () => {
    expect(() => formatList(123 as never, 'en', {})).toThrow(TypeError);
  });

  it('returns error for items containing non-strings', () => {
    const result = formatList([123 as never], 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatList(['a'], 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatDateRange — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatDateRange(new Date(), new Date(), 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatDateRange(new Date(), new Date(), 123 as never, { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid start date (non-date non-number)', () => {
    const result = formatDateRange('bad' as never, new Date(), 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid end date (non-date non-number)', () => {
    const result = formatDateRange(new Date(), 'bad' as never, 'en', { style: 'short' });
    expect(result.ok).toBe(false);
  });
});

describe('formatDisplayName — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatDisplayName('en', 'en', 'language', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid code (non-string)', () => {
    const result = formatDisplayName(123 as never, 'en', 'language', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatDisplayName('en', 123 as never, 'language', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid type (non-string)', () => {
    const result = formatDisplayName('en', 'en', 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatPercent — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatPercent(0.5, 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid value (non-number)', () => {
    const result = formatPercent('abc' as never, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatPercent(0.5, 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatUnit — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatUnit(10, 'meter', 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid value (non-number)', () => {
    const result = formatUnit('abc' as never, 'meter', 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid unit (non-string)', () => {
    const result = formatUnit(10, 123 as never, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatUnit(10, 'meter', 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('formatDuration — validation failures', () => {
  it('returns error for invalid opts (non-object)', () => {
    const result = formatDuration({ hours: 1 }, 'en', 'bad' as never);
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid duration (non-object)', () => {
    const result = formatDuration('abc' as never, 'en', {});
    expect(result.ok).toBe(false);
  });

  it('returns error for invalid locale (non-string)', () => {
    const result = formatDuration({ hours: 1 }, 123 as never, {});
    expect(result.ok).toBe(false);
  });
});

describe('parseNumberSkeleton — validation failures', () => {
  it('returns error for invalid skeleton (non-string)', () => {
    const result = parseNumberSkeleton(123 as never);
    expect(result.ok).toBe(false);
  });
});

describe('parseDateTimeSkeleton — validation failures', () => {
  it('returns error for invalid skeleton (non-string)', () => {
    const result = parseDateTimeSkeleton(123 as never);
    expect(result.ok).toBe(false);
  });
});
