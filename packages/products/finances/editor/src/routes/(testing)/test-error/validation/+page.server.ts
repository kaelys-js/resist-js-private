/**
 * Test route that simulates a Valibot schema validation error.
 *
 * @module
 */

import * as v from 'valibot';
import { safeParse } from '@/utils/result/safe';
import type { PageServerLoad } from './$types';

/**
 * Test route that simulates a schema validation error via an unexpected throw.
 *
 * Runs a Valibot schema parse against invalid data and throws the resulting
 * AppError directly. This exercises the full handleError pipeline with a real
 * structured error — the hook should detect the AppError, preserve its code
 * (VALIDATION.SCHEMA_FAILED), validation details, and full cause chain.
 *
 * @returns Page data (never reached — always throws)
 */
export const load: PageServerLoad = () => {
  const TestSchema = v.strictObject({
    name: v.pipe(v.string(), v.minLength(1)),
    age: v.pipe(v.number(), v.minValue(0), v.maxValue(150)),
    email: v.pipe(v.string(), v.email()),
  });

  const result = safeParse(TestSchema, { name: '', age: -5, email: 'not-an-email' });
  if (!result.ok) {
    // Throw the actual AppError — not a plain Error wrapper.
    // handleError will detect the AppError shape and preserve its code,
    // validation details, and cause chain instead of wrapping it in INTERNAL.UNEXPECTED.
    throw result.error;
  }

  return {};
};
