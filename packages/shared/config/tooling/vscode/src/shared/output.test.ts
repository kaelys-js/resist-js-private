/**
 * Tests for Output Channel Logging
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 14
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOutputChannel,
  log,
  logError,
  logCommand,
  logTiming,
  logSummary,
  logDiagnosticList,
} from './output';
import * as vscode from 'vscode';
import { BRAND_NAME, BINARY_NAME } from './brand';

describe('Output Channel', () => {
  let channel: vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    channel = createOutputChannel();
  });

  it('createOutputChannel creates channel named Resist', () => {
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith(BRAND_NAME);
  });

  it('log() appends indented timestamped message', () => {
    log(channel, 'hello world');
    expect(channel.appendLine).toHaveBeenCalledOnce();
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toMatch(/^ {2}\[\d{2}:\d{2}:\d{2}\] hello world$/);
  });

  it('logError() appends indented timestamped ERROR message', () => {
    logError(channel, 'something broke');
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toMatch(/^ {2}\[\d{2}:\d{2}:\d{2}\] ERROR: something broke$/);
  });

  it('logCommand() outputs separator, command, and args on separate lines', () => {
    logCommand(channel, BINARY_NAME, ['--format=json', 'file.ts']);
    const calls = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    // Empty line, separator, command, arg1, arg2
    expect(calls.length).toBe(5);
    expect(calls[0]).toBe('');
    expect(calls[1]).toMatch(/^─+$/);
    expect(calls[2]).toMatch(new RegExp(`\\$ ${BINARY_NAME}$`));
    expect(calls[3]).toBe('      --format=json');
    expect(calls[4]).toBe('      file.ts');
  });

  it('logTiming() appends indented timing with parenthesized ms', () => {
    logTiming(channel, 'Linted file.ts', 42);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toMatch(/^ {2}\[\d{2}:\d{2}:\d{2}\] Linted file\.ts \(42ms\)$/);
  });

  it('logSummary() shows error and warning counts', () => {
    logSummary(channel, 3, 1);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain('3 errors, 1 warning');
  });

  it('logSummary() shows "no issues" when counts are zero', () => {
    logSummary(channel, 0, 0);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain('no issues');
  });

  it('logSummary() uses singular form for single error', () => {
    logSummary(channel, 1, 0);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain('1 error');
    expect(line).not.toContain('1 errors');
  });

  it('logDiagnosticList() logs each diagnostic as an indented detail line', () => {
    const diags: vscode.Diagnostic[] = [
      Object.assign(
        new vscode.Diagnostic(new vscode.Range(2, 4, 2, 10), 'Missing return type', 0),
        { code: 'ts/return-type' },
      ),
      Object.assign(new vscode.Diagnostic(new vscode.Range(5, 0, 5, 8), 'Unused variable', 1), {
        code: 'no-unused-vars',
      }),
    ];

    logDiagnosticList(channel, diags, '/src/app.ts');

    const calls = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );

    expect(calls.length).toBe(2);
    expect(calls[0]).toBe('      /src/app.ts:3:5  error  ts/return-type  Missing return type');
    expect(calls[1]).toBe('      /src/app.ts:6:1  warn  no-unused-vars  Unused variable');
  });

  it('logDiagnosticList() truncates multi-line messages to first line', () => {
    const diag = Object.assign(
      new vscode.Diagnostic(new vscode.Range(0, 0, 0, 5), 'First line\n\nExample:\nsome code', 0),
      { code: 'rule/x' },
    );

    logDiagnosticList(channel, [diag], '/test.ts');

    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain('First line');
    expect(line).not.toContain('Example');
  });

  it('logDiagnosticList() maps Information severity to "info" (line 159)', () => {
    const diag = Object.assign(
      new vscode.Diagnostic(new vscode.Range(0, 0, 0, 5), 'Info message', 2),
      { code: 'info-rule' },
    );

    logDiagnosticList(channel, [diag], '/test.ts');

    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain('info');
    expect(line).toContain('info-rule');
  });
});
