/** shelby.switchNetwork command — Quickly switch Shelby network. */
import * as vscode from 'vscode';

export function registerSwitchNetworkCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.switchNetwork', async () => {
    const current = vscode.workspace.getConfiguration('shelby').get<string>('network', 'shelbynet');

    const pick = await vscode.window.showQuickPick(
      [
        { label: 'shelbynet', description: 'Shelby Shelbynet (recommended)' },
        { label: 'testnet', description: 'Aptos Testnet' },
        { label: 'mainnet', description: 'Aptos Mainnet' },
        { label: 'devnet', description: 'Aptos Devnet' },
      ],
      { placeHolder: `Current: ${current}` },
    );
    if (!pick) return;

    await vscode.workspace.getConfiguration('shelby').update(
      'network',
      pick.label,
      vscode.ConfigurationTarget.Global,
    );

    void vscode.window.showInformationMessage(`Switched to ${pick.label}.`);
  });
}
