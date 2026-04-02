/**
 * Tests for Tree Item Classes
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 3
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { SectionItem, ToolStatusItem, FileDiagnosticItem, PlaceholderItem } from './tree-items';
import { en } from '../../locale/en';
import { COMMANDS } from '../brand';

// =============================================================================
// SectionItem
// =============================================================================

describe('SectionItem', () => {
  it('sets collapsibleState to Collapsed', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('stores toolKey for provider matching', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.toolKey).toBe('lint');
  });

  it('sets contextValue to resist.section', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.contextValue).toBe('resist.section');
  });

  it('uses checklist icon for lint', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('checklist');
  });

  it('uses symbol-color icon for format', () => {
    const item = new SectionItem('Formatting', 'format');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('symbol-color');
  });

  it('uses beaker icon for test', () => {
    const item = new SectionItem('Testing', 'test');
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('beaker');
  });

  it('sets label from constructor', () => {
    const item = new SectionItem('Linting', 'lint');
    expect(item.label).toBe('Linting');
  });
});

// =============================================================================
// ToolStatusItem
// =============================================================================

describe('ToolStatusItem', () => {
  it('shows Ready label and pass-filled icon for ready state', () => {
    const item = new ToolStatusItem('ready');
    expect(item.label).toBe(en.panel.stateReady);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('pass-filled');
  });

  it('shows Running label and sync~spin icon for running state', () => {
    const item = new ToolStatusItem('running');
    expect(item.label).toBe(en.panel.stateRunning);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('sync~spin');
  });

  it('shows Error label and error icon for error state', () => {
    const item = new ToolStatusItem('error');
    expect(item.label).toBe(en.panel.stateError);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('error');
  });

  it('shows Disabled label and circle-slash icon for disabled state', () => {
    const item = new ToolStatusItem('disabled');
    expect(item.label).toBe(en.panel.stateDisabled);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('circle-slash');
  });

  it('shows Not installed label and circle-slash icon for not-installed state', () => {
    const item = new ToolStatusItem('not-installed');
    expect(item.label).toBe(en.panel.stateNotInstalled);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('circle-slash');
  });

  it('sets contextValue to resist.toolError when error', () => {
    const item = new ToolStatusItem('error');
    expect(item.contextValue).toBe('resist.toolError');
  });

  it('sets contextValue to resist.toolStatus for non-error states', () => {
    const readyItem = new ToolStatusItem('ready');
    expect(readyItem.contextValue).toBe('resist.toolStatus');

    const runningItem = new ToolStatusItem('running');
    expect(runningItem.contextValue).toBe('resist.toolStatus');
  });

  it('sets restart command when in error state', () => {
    const item = new ToolStatusItem('error');
    expect(item.command).toBeDefined();
    expect(item.command?.command).toBe(COMMANDS.restart);
  });

  it('has no command for non-error states', () => {
    const item = new ToolStatusItem('ready');
    expect(item.command).toBeUndefined();
  });

  it('sets collapsibleState to None', () => {
    const item = new ToolStatusItem('ready');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });
});

// =============================================================================
// FileDiagnosticItem
// =============================================================================

describe('FileDiagnosticItem', () => {
  const uri = vscode.Uri.file('/workspace/src/index.ts');

  it('sets label to basename of file path', () => {
    const item = new FileDiagnosticItem(uri, 2, 3);
    expect(item.label).toBe('index.ts');
  });

  it('sets description with error and warning counts', () => {
    const item = new FileDiagnosticItem(uri, 2, 3);
    expect(item.description).toBe('2 errors, 3 warnings');
  });

  it('sets resourceUri for file icon', () => {
    const item = new FileDiagnosticItem(uri, 1, 0);
    expect(item.resourceUri).toBe(uri);
  });

  it('sets contextValue to resist.fileDiagnostic', () => {
    const item = new FileDiagnosticItem(uri, 1, 0);
    expect(item.contextValue).toBe('resist.fileDiagnostic');
  });

  it('sets command to open file in editor', () => {
    const item = new FileDiagnosticItem(uri, 1, 0);
    expect(item.command).toBeDefined();
    expect(item.command?.command).toBe('vscode.open');
    expect(item.command?.arguments).toEqual([uri]);
  });

  it('sets collapsibleState to None', () => {
    const item = new FileDiagnosticItem(uri, 1, 0);
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });
});

// =============================================================================
// PlaceholderItem
// =============================================================================

describe('PlaceholderItem', () => {
  it('sets label from message', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.label).toBe('No issues found');
  });

  it('uses info icon', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.iconPath).toBeInstanceOf(vscode.ThemeIcon);
    expect((item.iconPath as vscode.ThemeIcon).id).toBe('info');
  });

  it('sets collapsibleState to None', () => {
    const item = new PlaceholderItem('No issues found');
    expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });
});
