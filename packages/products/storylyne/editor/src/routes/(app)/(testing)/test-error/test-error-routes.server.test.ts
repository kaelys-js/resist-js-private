/**
 * Tests for the test-error route load functions.
 *
 * Each route's `load()` throws an error (SvelteKit `error()` for 400/403/404/500,
 * raw `throw` for unexpected, and a Valibot validation throw for validation).
 * These tests verify the throw shape and exit-status code.
 *
 * Runs in storylyne-editor-server project (node env).
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { load as load400 } from './400/+page.server';
import { load as load403 } from './403/+page.server';
import { load as load404 } from './404/+page.server';
import { load as load500 } from './500/+page.server';
import { load as loadUnexpected } from './unexpected/+page.server';
import { load as loadValidation } from './validation/+page.server';

/** Minimal stub event — load() in these routes ignores the event entirely. */
const STUB_EVENT = {} as Parameters<typeof load400>[0];

describe('test-error route load() — throws shape', () => {
  it('400 throws SvelteKit HttpError with status 400 and message "Bad Request"', () => {
    let thrown: unknown = null;
    try {
      (load400 as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).not.toBeNull();
    expect((thrown as { status?: number }).status).toBe(400);
    expect((thrown as { body?: { message: string } }).body?.message).toBe('Bad Request');
  });

  it('403 throws SvelteKit HttpError with status 403 and message "Forbidden"', () => {
    let thrown: unknown = null;
    try {
      (load403 as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { status?: number }).status).toBe(403);
    expect((thrown as { body?: { message: string } }).body?.message).toBe('Forbidden');
  });

  it('404 throws SvelteKit HttpError with status 404 and message "Not found"', () => {
    let thrown: unknown = null;
    try {
      (load404 as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { status?: number }).status).toBe(404);
    expect((thrown as { body?: { message: string } }).body?.message).toBe('Not found');
  });

  it('500 throws SvelteKit HttpError with status 500 and message "Internal server error"', () => {
    let thrown: unknown = null;
    try {
      (load500 as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect((thrown as { status?: number }).status).toBe(500);
    expect((thrown as { body?: { message: string } }).body?.message).toBe('Internal server error');
  });

  it('unexpected throws raw Error with the simulated-crash message', () => {
    let thrown: unknown = null;
    try {
      (loadUnexpected as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Unexpected test error — this simulates a server crash');
  });

  it('validation throws an AppError carrying validation details', () => {
    let thrown: unknown = null;
    try {
      (loadValidation as (e: typeof STUB_EVENT) => void)(STUB_EVENT);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).not.toBeNull();
    /* AppError is the resist-js domain error — has a `code` property like
     * 'VALIDATION.SCHEMA_FAILED'. */
    const codeOrMsg: string = (thrown as { code?: string }).code ?? (thrown as Error).message ?? '';
    expect(typeof codeOrMsg).toBe('string');
    expect(codeOrMsg.length).toBeGreaterThan(0);
  });
});
