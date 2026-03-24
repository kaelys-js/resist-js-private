import { describe, expect, it } from 'vitest';
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
    const result = formatPercent(0.5, 'en-US');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('50');
  });

  it('formats 0 as 0%', () => {
    const result = formatPercent(0, 'en-US');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('0');
  });

  it('formats 1 as 100%', () => {
    const result = formatPercent(1, 'en-US');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('100');
  });
});

// =============================================================================
// formatUnit
// =============================================================================

describe('formatUnit', () => {
  it('formats kilometer', () => {
    const result = formatUnit(42, 'kilometer', 'en', undefined);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toContain('42');
  });

  it('formats kilogram with long display', () => {
    const result = formatUnit(5, 'kilogram', 'en', 'long');
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
});
