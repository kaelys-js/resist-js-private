/**
 * Tests for Output Channel Logging
 *
 * Plan: docs/plans/2026-03-31-vscode-phase-55.md TASK 14
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOutputChannel, log, logError, logCommand, logTiming } from '../output';
import * as vscode from 'vscode';

describe('Output Channel', () => {
  let channel: vscode.OutputChannel;

  beforeEach(() => {
    vi.clearAllMocks();
    channel = createOutputChannel();
  });

  it('createOutputChannel creates channel named Resist', () => {
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('Resist');
  });

  it('log() appends timestamped message', () => {
    log(channel, 'hello world');
    expect(channel.appendLine).toHaveBeenCalledOnce();
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] hello world$/);
  });

  it('logError() appends timestamped ERROR message', () => {
    logError(channel, 'something broke');
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] ERROR: something broke$/);
  });

  it('logCommand() appends timestamped command with args', () => {
    logCommand(channel, 'resist-lint', ['--format=json', 'file.ts']);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] \$ resist-lint --format=json file.ts$/);
  });

  it('logTiming() appends timestamped timing message', () => {
    logTiming(channel, 'Linted file.ts', 42);
    const line = (channel.appendLine as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(line).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Linted file.ts: 42ms$/);
  });
});
