/**
 * Build/Stage Visual Feedback
 *
 * Shows the current lint stage in the status bar with click-to-change.
 * When the stage is non-default, appends it to the status bar text.
 *
 * @module
 */

import * as vscode from 'vscode';
import { log } from '../shared/output';
import { en } from '../locale/en';
import { format } from '../locale/schema';
import { CONFIG_SECTION } from '../shared/brand';

/** Available lint stages. */
const STAGES: readonly string[] = ['lint', 'check', 'pre-commit', 'build', 'ci', 'test'];

/** The default stage (no visual indicator needed). */
const DEFAULT_STAGE = 'lint';

/**
 * Manages the lint stage indicator in the status bar.
 *
 * Shows the current stage appended to the Resist status bar text
 * when a non-default stage is active. Provides a quick pick to
 * change the active stage.
 */
export class StageIndicator implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly channel?: vscode.OutputChannel;
  private currentStage: string = DEFAULT_STAGE;

  /**
   * Creates a new StageIndicator.
   *
   * @param statusBarItem - The status bar item to update
   * @param channel - Optional output channel for logging
   */
  constructor(statusBarItem: vscode.StatusBarItem, channel?: vscode.OutputChannel) {
    this.statusBarItem = statusBarItem;
    this.channel = channel;
  }

  /**
   * Updates the status bar to reflect the current stage.
   *
   * @param stage - The active stage name
   */
  update(stage: string): void {
    this.currentStage = stage;

    if (stage !== DEFAULT_STAGE) {
      this.statusBarItem.text = format(en.stageIndicator.currentStage, { stage });
    }
  }

  /**
   * Shows a quick pick to change the active stage.
   *
   * Updates the `resist.lint.stage` setting when a selection is made.
   */
  async showQuickPick(): Promise<void> {
    const selected: string | undefined = (await vscode.window.showQuickPick(
      STAGES.map((s) => s),
      {
        placeHolder: en.stageIndicator.selectStage,
      },
    )) as string | undefined;

    if (selected === undefined) {
      return;
    }

    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(CONFIG_SECTION);
    await config.update('lint.stage', selected, vscode.ConfigurationTarget.Workspace);

    this.update(selected);

    if (this.channel) {
      log(this.channel, format(en.stageIndicator.stageChanged, { stage: selected }));
    }
  }

  /**
   * Returns the current stage.
   *
   * @returns The current stage name
   */
  getStage(): string {
    return this.currentStage;
  }

  /**
   * Disposes the indicator.
   */
  dispose(): void {
    // No-op — status bar item is managed by the extension
  }
}
