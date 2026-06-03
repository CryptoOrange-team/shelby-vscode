/**
 * shelby.refreshTree command — Refresh the Shelby tree view.
 */
import * as vscode from 'vscode';
import type { ShelbyServices } from '../../extension';

export function registerRefreshTreeCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.refreshTree', () => {
    services.treeProvider?.refresh();
    void vscode.window.showInformationMessage('Shelby explorer refreshed.');
  });
}
