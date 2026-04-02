/**
 * Tests for Menu Synchronization
 *
 * Verifies that the status bar popup menu and the sidebar panel "..."
 * overflow expose the same set of lint commands. If a command is added
 * to one but not the other, these tests catch the divergence.
 *
 * Plan: .claude/plans/keen-noodling-newt.md TASK 8
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMANDS } from '../brand';

// =============================================================================
// Helpers
// =============================================================================

/**
 * The set of lint command IDs that must appear in BOTH the status bar
 * popup QuickPick AND the sidebar panel view/title overflow menu.
 *
 * When adding a new lint command, add it here to enforce sync.
 */
const SHARED_MENU_COMMANDS: string[] = [
  COMMANDS.toggleEnable,
  COMMANDS.restart,
  COMMANDS.lintFile,
  COMMANDS.lintWorkspace,
  COMMANDS.lintStaged,
  COMMANDS.lintUncommitted,
  COMMANDS.lintFix,
  COMMANDS.previewFixes,
  COMMANDS.removeUnusedImports,
  COMMANDS.filterByCategory,
  COMMANDS.clearFilter,
  COMMANDS.changeStage,
  COMMANDS.listRules,
  COMMANDS.debugToggle,
  COMMANDS.showOutput,
  COMMANDS.clearOutput,
];

/** Reads package.json and extracts lint submenu command IDs.
 * @returns Array of command ID strings from the Linting submenu. */
function getLintingSubmenuCommands(): string[] {
  const pkgPath = resolve(__dirname, '../../../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    contributes: {
      menus: {
        'resist.panel.linting': Array<{ command: string; group?: string }>;
      };
    };
  };

  const submenu = pkg.contributes.menus['resist.panel.linting'] ?? [];

  return submenu.map((entry) => entry.command);
}

/** Reads commands.ts and extracts command IDs from the statusBarMenu handler.
 * @returns Array of command ID strings from the status bar menu. */
function getStatusBarMenuCommands(): string[] {
  const cmdPath = resolve(__dirname, '../../lint/commands.ts');
  const source = readFileSync(cmdPath, 'utf8');

  // The handler maps labels to COMMANDS.xxx — extract the COMMANDS references
  // Pattern: COMMANDS.someName (after the label-to-command mapping)
  const mappingMatch = source.match(
    /const\s+commandMap[\s\S]*?:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/,
  );

  if (!mappingMatch?.[1]) {
    throw new Error('Could not find commandMap in commands.ts');
  }

  const commandRefs: string[] = [];
  const refPattern = /COMMANDS\.(\w+)/g;
  let match: RegExpExecArray | null;

  while ((match = refPattern.exec(mappingMatch[1])) !== null) {
    const key = match[1]! as keyof typeof COMMANDS;

    if (key in COMMANDS) {
      commandRefs.push(COMMANDS[key]);
    }
  }

  return commandRefs;
}

// =============================================================================
// Tests
// =============================================================================

describe('Menu synchronization', () => {
  it('linting submenu contains all shared menu commands', () => {
    const overflowCommands = getLintingSubmenuCommands();

    for (const cmd of SHARED_MENU_COMMANDS) {
      expect(overflowCommands, `Missing in linting submenu: ${cmd}`).toContain(cmd);
    }
  });

  it('status bar popup contains all shared menu commands', () => {
    const statusBarCommands = getStatusBarMenuCommands();

    for (const cmd of SHARED_MENU_COMMANDS) {
      expect(statusBarCommands, `Missing in status bar popup: ${cmd}`).toContain(cmd);
    }
  });

  it('linting submenu has no extra commands beyond shared set', () => {
    const overflowCommands = getLintingSubmenuCommands();

    for (const cmd of overflowCommands) {
      expect(SHARED_MENU_COMMANDS, `Extra in linting submenu: ${cmd}`).toContain(cmd);
    }
  });

  it('shared menu commands list has 16 entries', () => {
    expect(SHARED_MENU_COMMANDS).toHaveLength(16);
  });
});
