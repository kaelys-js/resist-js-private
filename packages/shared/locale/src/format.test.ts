import { describe, expect, it } from 'vitest';
import type { Num, Str } from '@/schemas/common';
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
    const result = formatNumber(1_234_567, 'en-US', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('1,234,567');
  });

  it('formats decimal with en-US locale', () => {
    const result = formatNumber(1234.56, 'en-US', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('1,234');
  });

  it('formats with de-DE locale', () => {
    const result = formatNumber(1234.56, 'de-DE', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('1.234');
  });

  it('applies custom options', () => {
    const result = formatNumber(0.42, 'en-US', { style: 'percent' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('42');
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
    if (result.ok) expect(result.data).toContain('1.234,56');
  });

  it('formats JPY (no decimals)', () => {
    const result = formatCurrency(1234, 'ja-JP', 'JPY');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('1,234');
  });
});

// =============================================================================
// formatDate
// =============================================================================

describe('formatDate', () => {
  const testDate = new Date('2026-02-23T00:00:00Z');

  it('formats with short style', () => {
    const result = formatDate(testDate, 'en-US', 'short', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('2');
  });

  it('formats with long style', () => {
    const result = formatDate(testDate, 'en-US', 'long', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('February');
  });

  it('formats with custom options', () => {
    const result = formatDate(testDate, 'en-US', undefined, { year: 'numeric', month: '2-digit' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('02');
  });

  it('accepts Unix timestamp', () => {
    const result = formatDate(testDate.getTime(), 'en-US', 'short', undefined);
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatTime
// =============================================================================

describe('formatTime', () => {
  const testDate = new Date('2026-02-23T14:30:45Z');

  it('formats with short style', () => {
    const result = formatTime(testDate, 'en-US', 'short', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats with medium style', () => {
    const result = formatTime(testDate, 'en-US', 'medium', undefined);
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatRelativeTime
// =============================================================================

describe('formatRelativeTime', () => {
  it('formats past time', () => {
    const result = formatRelativeTime(-3, 'day', 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('3 days ago');
  });

  it('formats future time', () => {
    const result = formatRelativeTime(2, 'hour', 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('in 2 hours');
  });

  it('formats with auto numeric (yesterday)', () => {
    const result = formatRelativeTime(-1, 'day', 'en', 'auto', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('yesterday');
  });

  it('rejects invalid unit', () => {
    const result = formatRelativeTime(-1, 'decade' as never, 'en', undefined, undefined);
    expect(result.ok).toBe(false);
  });
});

// =============================================================================
// formatList
// =============================================================================

describe('formatList', () => {
  it('formats conjunction list (and)', () => {
    const result = formatList(['Alice', 'Bob', 'Charlie'], 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('Alice, Bob, and Charlie');
  });

  it('formats disjunction list (or)', () => {
    const result = formatList(['Alice', 'Bob', 'Charlie'], 'en', 'disjunction', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('Alice, Bob, or Charlie');
  });

  it('formats two items', () => {
    const result = formatList(['Alice', 'Bob'], 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('Alice and Bob');
  });

  it('formats single item', () => {
    const result = formatList(['Alice'], 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('Alice');
  });
});

// =============================================================================
// formatDateRange
// =============================================================================

describe('formatDateRange', () => {
  it('formats date range across months', () => {
    const start = new Date('2026-01-15T00:00:00Z');
    const end = new Date('2026-02-20T00:00:00Z');
    const result = formatDateRange(start, end, 'en-US', 'medium', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Jan');
      expect(result.data).toContain('Feb');
    }
  });

  it('formats date range same month', () => {
    const start = new Date('2026-03-01T00:00:00Z');
    const end = new Date('2026-03-15T00:00:00Z');
    const result = formatDateRange(start, end, 'en-US', 'medium', undefined);
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// formatDisplayName
// =============================================================================

describe('formatDisplayName', () => {
  it('formats language display name', () => {
    const result = formatDisplayName('en', 'en', 'language', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('English');
  });

  it('formats region display name', () => {
    const result = formatDisplayName('US', 'en', 'region', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe('United States');
  });

  it('formats currency display name', () => {
    const result = formatDisplayName('USD', 'en', 'currency', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('Dollar');
  });
});

// =============================================================================
// formatPercent
// =============================================================================

describe('formatPercent', () => {
  it('formats 0.5 as 50%', () => {
    const result = formatPercent(0.5, 'en-US', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('50');
  });

  it('formats 0 as 0%', () => {
    const result = formatPercent(0, 'en-US', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('0');
  });

  it('formats 1 as 100%', () => {
    const result = formatPercent(1, 'en-US', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('100');
  });
});

// =============================================================================
// formatUnit
// =============================================================================

describe('formatUnit', () => {
  it('formats kilometer', () => {
    const result = formatUnit(42, 'kilometer', 'en', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('42');
  });

  it('formats kilogram with long display', () => {
    const result = formatUnit(5, 'kilogram', 'en', 'long', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('kilogram');
  });
});

// =============================================================================
// formatDuration
// =============================================================================

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    const result = formatDuration({ hours: 2, minutes: 30 }, 'en', undefined);
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
      undefined,
    );
    expect(result.ok).toBe(true);
  });

  it('formats with short style', () => {
    const result = formatDuration({ hours: 1, minutes: 15 }, 'en', 'short');
    expect(result.ok).toBe(true);
  });

  it('skips zero-value fields', () => {
    const result = formatDuration({ hours: 0, minutes: 45 }, 'en', undefined);
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
    if (result.ok) expect(result.data.minimumFractionDigits).toBe(2);
  });

  it('parses percent as style percent', () => {
    const result = parseNumberSkeleton('percent');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.style).toBe('percent');
  });

  it('parses compact-short', () => {
    const result = parseNumberSkeleton('compact-short');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.notation).toBe('compact');
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
    if (result.ok) expect(result.data.year).toBe('numeric');
  });

  it('parses MM as month: 2-digit', () => {
    const result = parseDateTimeSkeleton('MM');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.month).toBe('2-digit');
  });

  it('parses dd as day: 2-digit', () => {
    const result = parseDateTimeSkeleton('dd');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.day).toBe('2-digit');
  });

  it('returns ok for empty skeleton', () => {
    const result = parseDateTimeSkeleton('');
    expect(result.ok).toBe(true);
  });

  it('parses yy as year: 2-digit', () => {
    const result = parseDateTimeSkeleton('yy');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.year).toBe('2-digit');
  });

  it('parses MMM as month: short', () => {
    const result = parseDateTimeSkeleton('MMM');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.month).toBe('short');
  });

  it('parses MMMM as month: long', () => {
    const result = parseDateTimeSkeleton('MMMM');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.month).toBe('long');
  });

  it('parses M as month: numeric', () => {
    const result = parseDateTimeSkeleton('M');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.month).toBe('numeric');
  });

  it('parses EEEE as weekday: long', () => {
    const result = parseDateTimeSkeleton('EEEE');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.weekday).toBe('long');
  });

  it('parses E as weekday: short', () => {
    const result = parseDateTimeSkeleton('E');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.weekday).toBe('short');
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
    if (result.ok) expect(result.data.minute).toBe('2-digit');
  });

  it('parses ss as second: 2-digit', () => {
    const result = parseDateTimeSkeleton('ss');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.second).toBe('2-digit');
  });

  it('parses z as timeZoneName: short', () => {
    const result = parseDateTimeSkeleton('z');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.timeZoneName).toBe('short');
  });

  it('parses zzzz as timeZoneName: long', () => {
    const result = parseDateTimeSkeleton('zzzz');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.timeZoneName).toBe('long');
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
    if (result.ok) expect(result.data.notation).toBe('scientific');
  });

  it('parses engineering', () => {
    const result = parseNumberSkeleton('engineering');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.notation).toBe('engineering');
  });

  it('parses sign-always', () => {
    const result = parseNumberSkeleton('sign-always');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.signDisplay).toBe('always');
  });

  it('parses sign-never', () => {
    const result = parseNumberSkeleton('sign-never');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.signDisplay).toBe('never');
  });

  it('parses sign-except-zero', () => {
    const result = parseNumberSkeleton('sign-except-zero');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.signDisplay).toBe('exceptZero');
  });

  it('parses sign-auto', () => {
    const result = parseNumberSkeleton('sign-auto');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.signDisplay).toBe('auto');
  });

  it('parses group-off', () => {
    const result = parseNumberSkeleton('group-off');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.useGrouping).toBe(false);
  });

  it('parses integer', () => {
    const result = parseNumberSkeleton('integer');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.maximumFractionDigits).toBe(0);
  });

  it('parses .## as max fraction digits', () => {
    const result = parseNumberSkeleton('.##');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.maximumFractionDigits).toBe(2);
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
    if (result.ok) expect(result.data.minimumFractionDigits).toBe(2);
  });
});

// =============================================================================
// Error path coverage
// =============================================================================

describe('error paths', () => {
  it('formatNumber returns error for invalid value', () => {
    const result = formatNumber('abc' as unknown as Num, 'en', undefined);
    expect(result.ok).toBe(false);
  });

  it('formatCurrency returns error for invalid value', () => {
    const result = formatCurrency('abc' as unknown as Num, 'en', 'USD');
    expect(result.ok).toBe(false);
  });

  it('formatTime with undefined style defaults to medium', () => {
    const result = formatTime(new Date('2026-02-23T14:30:00'), 'en-US', undefined, undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain(':30');
  });

  it('formatDate with both style and options undefined uses empty options', () => {
    const result = formatDate(new Date('2026-02-23'), 'en-US', undefined, undefined);
    expect(result.ok).toBe(true);
  });

  it('formatDateRange with both style and options undefined', () => {
    const result = formatDateRange(
      new Date('2026-01-15'),
      new Date('2026-02-23'),
      'en-US',
      undefined,
      undefined,
    );
    expect(result.ok).toBe(true);
  });

  it('formatRelativeTime returns error for invalid numeric', () => {
    const result = formatRelativeTime(1, 'day', 'en', 'invalid' as unknown as undefined, undefined);
    expect(result.ok).toBe(false);
  });

  it('formatRelativeTime returns error for invalid style', () => {
    const result = formatRelativeTime(1, 'day', 'en', undefined, 'invalid' as unknown as undefined);
    expect(result.ok).toBe(false);
  });

  it('formatDisplayName with short style', () => {
    const result = formatDisplayName('en', 'en', 'language', 'short');
    expect(result.ok).toBe(true);
  });

  it('formatPercent with custom options', () => {
    const result = formatPercent(0.256, 'en-US', { minimumFractionDigits: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('25.6');
  });

  it('formatList with narrow style', () => {
    const result = formatList(['a', 'b'], 'en', 'conjunction', 'narrow');
    expect(result.ok).toBe(true);
  });
});
