/**
 * shelby.connect / shelby.disconnect commands.
 */
import * as vscode from 'vscode';
import type { ShelbyServices } from '../../extension';

export function registerConnectCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.connect', async () => {
    const config = await services.config.resolve();
    if (!config.apiKey) {
      const action = await vscode.window.showWarningMessage(
        'No API key configured. Run "Shelby: Initialize Config"?',
        'Configure', 'Cancel',
      );
      if (action === 'Configure') {
        await vscode.commands.executeCommand('shelby.init');
      }
      return;
    }

    // Verify network reachability
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Connecting to Shelby...' },
      async () => {
        const reachable = await services.client.canInitialize();
        if (reachable) {
          services.connection.setConnected(true);
          void vscode.window.showInformationMessage(
            `Connected to Shelby ${config.network}.`,
          );
        } else {
          services.connection.setConnected(false);
          void vscode.window.showErrorMessage(
            `Cannot reach Shelby ${config.network}. Check your API key and network.`,
          );
        }
      },
    );
  });
}

export function registerDisconnectCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.disconnect', () => {
    services.connection.setConnected(false);
    void vscode.window.showInformationMessage('Disconnected from Shelby.');
  });
}
