import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { StrSchema, NumSchema } from '@/schemas/common';
import { safeParse } from '@/utils/result/safe';
import { messageTemplate, renderMessage, buildLocale } from './template';

// =============================================================================
// messageTemplate
// =============================================================================

describe('messageTemplate', () => {
  it('creates a schema that accepts plain strings (no params)', () => {
    const schema = messageTemplate();
    const result = safeParse(schema, 'Hello, world!');
    expect(result.ok).toBe(true);
  });

  it('creates a schema that validates placeholder presence', () => {
    const schema = messageTemplate({ name: StrSchema });
    const result = safeParse(schema, 'Hello, {name}!');
    expect(result.ok).toBe(true);
  });

  it('rejects string missing required placeholder', () => {
    const schema = messageTemplate({ name: StrSchema });
    const result = safeParse(schema, 'Hello, world!');
    expect(result.ok).toBe(false);
  });

  it('rejects string with extra placeholders', () => {
    const schema = messageTemplate({ name: StrSchema });
    const result = safeParse(schema, 'Hello, {name} at {location}!');
    expect(result.ok).toBe(false);
  });

  it('accepts string with multiple required placeholders', () => {
    const schema = messageTemplate({ first: StrSchema, last: StrSchema });
    const result = safeParse(schema, '{first} {last}');
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// renderMessage
// =============================================================================

describe('renderMessage', () => {
  it('renders plain string with no placeholders', () => {
    const result = renderMessage('Hello, world!', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Hello, world!');
    }
  });

  it('renders single placeholder', () => {
    const result = renderMessage('Hello, {name}!', { name: 'Alice' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Hello, Alice!');
    }
  });

  it('renders multiple placeholders', () => {
    const result = renderMessage('{greeting}, {name}!', { greeting: 'Hi', name: 'Bob' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Hi, Bob!');
    }
  });

  it('renders same placeholder multiple times', () => {
    const result = renderMessage('{name} is {name}', { name: 'Alice' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice is Alice');
    }
  });

  it('handles numeric values', () => {
    const result = renderMessage('Count: {count}', { count: 42 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Count: 42');
    }
  });

  it('renders ICU plural block', () => {
    const result = renderMessage(
      '{count, plural, one {# item} other {# items}}',
      { count: 1 },
      'en',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('1 item');
    }
  });

  it('renders ICU plural block with other', () => {
    const result = renderMessage(
      '{count, plural, one {# item} other {# items}}',
      { count: 5 },
      'en',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('5 items');
    }
  });

  it('renders ICU plural block with =0', () => {
    const result = renderMessage(
      '{count, plural, =0 {no items} one {# item} other {# items}}',
      { count: 0 },
      'en',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('no items');
    }
  });

  it('renders ICU select block', () => {
    const result = renderMessage(
      '{gender, select, male {He} female {She} other {They}} said hello',
      { gender: 'female' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('She said hello');
    }
  });

  it('renders ICU select block with other fallback', () => {
    const result = renderMessage('{role, select, admin {Admin} user {User} other {Guest}}', {
      role: 'unknown',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Guest');
    }
  });

  it('renders number format block', () => {
    const result = renderMessage('{price, number}', { price: 1234.56 }, 'en-US');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('1,234');
    }
  });

  it('renders date format block', () => {
    const result = renderMessage(
      '{when, date, medium}',
      { when: new Date('2026-06-15T00:00:00Z') },
      'en-US',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain('Jun');
    }
  });

  it('renders escaped single quotes as literal text', () => {
    const result = renderMessage("It''s a test", {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("It's a test");
    }
  });

  it('renders escaped braces via single quotes', () => {
    const result = renderMessage("Use '{name}' literally", { name: 'Alice' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Use {name} literally');
    }
  });

  it('applies upper case modifier via pipe syntax', () => {
    const result = renderMessage('{name|upper}', { name: 'alice' }, 'en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('ALICE');
    }
  });

  it('applies lower case modifier via pipe syntax', () => {
    const result = renderMessage('{name|lower}', { name: 'ALICE' }, 'en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('alice');
    }
  });

  it('applies capitalize case modifier via pipe syntax', () => {
    const result = renderMessage('{name|capitalize}', { name: 'alice' }, 'en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe('Alice');
    }
  });

  it('handles escaped single quotes (double single quote = literal quote)', () => {
    const result = renderMessage("It''s a test", {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toContain("'");
    }
  });
});

// =============================================================================
// buildLocale
// =============================================================================

describe('buildLocale', () => {
  it('transforms plain strings into callable functions', () => {
    const Schema = v.strictObject({
      greeting: v.string(),
      farewell: v.string(),
    });
    const raw = { greeting: 'Hello', farewell: 'Goodbye' };

    const result = buildLocale(Schema, raw);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const built = result.data as Record<string, () => { ok: boolean; data?: string }>;
    const greetResult = built.greeting!();
    expect(greetResult.ok).toBe(true);
    if (greetResult.ok) {
      expect(greetResult.data).toBe('Hello');
    }
  });

  it('transforms messageTemplate strings into parameterized functions', () => {
    const Schema = v.strictObject({
      greeting: messageTemplate({ name: StrSchema }),
    });
    const raw = { greeting: 'Hello, {name}!' };

    const result = buildLocale(Schema, raw);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const built = result.data as unknown as Record<
      string,
      (params: Record<string, unknown>) => { ok: boolean; data?: string }
    >;
    const greetResult = built.greeting!({ name: 'Alice' });
    expect(greetResult.ok).toBe(true);
    if (greetResult.ok) {
      expect(greetResult.data).toBe('Hello, Alice!');
    }
  });

  it('handles nested schema objects', () => {
    const Schema = v.strictObject({
      errors: v.strictObject({
        notFound: v.string(),
        timeout: v.string(),
      }),
    });
    const raw = {
      errors: {
        notFound: 'Not found',
        timeout: 'Request timed out',
      },
    };

    const result = buildLocale(Schema, raw);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const built = result.data as {
      errors: Record<string, () => { ok: boolean; data?: string }>;
    };
    const notFoundResult = built.errors.notFound!();
    expect(notFoundResult.ok).toBe(true);
    if (notFoundResult.ok) {
      expect(notFoundResult.data).toBe('Not found');
    }
  });

  it('applies context substitution at build time', () => {
    const Schema = v.strictObject({
      welcome: v.string(),
    });
    const raw = { welcome: 'Welcome to {appName}' };
    const context = { appName: 'TestApp' };

    const result = buildLocale(Schema, raw, context);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const built = result.data as Record<string, () => { ok: boolean; data?: string }>;
    const welcomeResult = built.welcome!();
    expect(welcomeResult.ok).toBe(true);
    if (welcomeResult.ok) {
      expect(welcomeResult.data).toBe('Welcome to TestApp');
    }
  });

  it('returns error for non-object schema', () => {
    const result = buildLocale(v.string(), 'not an object' as unknown as Record<string, unknown>);
    expect(result.ok).toBe(false);
  });

  it('passes locale to Intl formatters', () => {
    const Schema = v.strictObject({
      count: messageTemplate({ n: NumSchema }),
    });
    const raw = { count: '{n, number}' };

    const result = buildLocale(Schema, raw, undefined, 'de-DE');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const built = result.data as unknown as Record<
      string,
      (params: Record<string, unknown>) => { ok: boolean; data?: string }
    >;
    const countResult = built.count!({ n: 1234.5 });
    expect(countResult.ok).toBe(true);
    if (countResult.ok) {
      expect(countResult.data).toContain('1.234');
    }
  });
});
