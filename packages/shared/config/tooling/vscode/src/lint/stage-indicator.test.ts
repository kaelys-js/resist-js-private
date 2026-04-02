/**
 * Tests for Build/Stage Visual Feedback.
 *
 * @module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { StageIndicator } from './stage-indicator';
import { BRAND_NAME } from '../shared/brand';

// =============================================================================
// Tests
// =============================================================================

describe('StageIndicator', () => {
  let indicator: StageIndicator;
  let statusBarItem: any;
  let channel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    statusBarItem = {
      text: '$(check) Resist',
      tooltip: '',
      command: undefined,
      backgroundColor: undefined,
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };
    channel = { appendLine: vi.fn(), show: vi.fn(), dispose: vi.fn(), name: BRAND_NAME };
    indicator = new StageIndicator(statusBarItem, channel);
  });

  afterEach(() => {
    indicator.dispose();
  });

  it('defaults to lint stage', () => {
    expect(indicator.getStage()).toBe('lint');
  });

  it('updates status bar text for non-default stage', () => {
    indicator.update('build');

    expect(statusBarItem.text).toContain('build');
    expect(indicator.getStage()).toBe('build');
  });

  it('does not modify text for default stage', () => {
    const originalText = statusBarItem.text;
    indicator.update('lint');

    // Text should NOT be modified for default stage
    expect(statusBarItem.text).toBe(originalText);
  });

  it('shows quick pick with available stages', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue('build' as any);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    await indicator.showQuickPick();

    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
    expect(indicator.getStage()).toBe('build');
  });

  it('does nothing when quick pick is cancelled', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue(undefined as any);

    await indicator.showQuickPick();

    expect(indicator.getStage()).toBe('lint');
  });

  it('logs stage change to channel', async () => {
    vi.mocked(vscode.window.showQuickPick).mockResolvedValue('ci' as any);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(),
      update: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
    } as any);

    await indicator.showQuickPick();

    const logCalls = channel.appendLine.mock.calls.map((c: any) => c[0]);
    expect(logCalls.some((msg: string) => msg.includes('ci'))).toBe(true);
  });

  it('disposes without error', () => {
    indicator.dispose();
    expect(true).toBe(true);
  });
});
