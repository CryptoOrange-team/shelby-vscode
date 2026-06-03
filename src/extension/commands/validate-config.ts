/**
 * shelby.validateConfig command — Validate the current Shelby configuration.
 *
 * Runs validation and shows results in a QuickPick list.
 */
import * as vscode from 'vscode';
import { validateConfig } from '../../core/validation';
import type { ShelbyServices } from '../../extension';

export function registerValidateConfigCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.validateConfig', async () => {
    const config = await services.config.resolve();
    const diagnostics = validateConfig(config);

    if (diagnostics.length === 0) {
      void vscode.window.showInformationMessage(
        '✅ Shelby configuration is valid.',
      );
      return;
    }

    const items = diagnostics.map((d) => ({
      label: d.severity === 'error' ? '$(error)' : '$(warning)',
      description: d.field,
      detail: d.message,
    }));

    void vscode.window.showQuickPick(items, {
      placeHolder: `${diagnostics.length} issue(s) found`,
    });
  });
}
