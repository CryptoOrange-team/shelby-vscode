/**
 * shelby.openBrowser command — Open the Shelby Blob Browser webview panel.
 */
import * as vscode from 'vscode';
import type { ShelbyServices } from '../../extension';

export function registerOpenBrowserCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.openBrowser', () => {
    services.webviewPanel?.show();
  });
}
