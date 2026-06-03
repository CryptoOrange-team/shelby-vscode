/**
 * shelby.init command — Guide user through initial Shelby configuration.
 *
 * Opens VS Code settings or guides through input boxes to set up
 * the essential Shelby configuration (API key, network, account).
 */
import * as vscode from 'vscode';
import { hexValidator } from '../utils';

export function registerInitConfigCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.init', async () => {
    const action = await vscode.window.showQuickPick(
      [
        {
          label: 'Open VS Code Settings',
          description: 'Configure Shelby settings.json (recommended)',
        },
        {
          label: 'Guided Setup',
          description: 'Step-by-step input for API key, network, and account',
        },
      ],
      { placeHolder: 'How would you like to configure Shelby?' },
    );

    if (!action) {
      return;
    }

    if (action.label === 'Open VS Code Settings') {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'shelby',
      );
    } else {
      await guidedSetup();
    }
  });
}

async function guidedSetup(): Promise<void> {
  // Step 1: API key
  const apiKey = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter your Shelby API key',
    placeHolder: 'sk-...',
    password: true,
  });
  if (apiKey === undefined) {
    return;
  }

  // Step 2: Network
  const network = await vscode.window.showQuickPick(
    [
      { label: 'testnet', description: 'Shelby Testnet (recommended for development)' },
      { label: 'mainnet', description: 'Shelby Mainnet' },
      { label: 'devnet', description: 'Shelby Devnet' },
    ],
    { placeHolder: 'Select Shelby network' },
  );
  if (!network) {
    return;
  }

  // Step 3: Account name
  const accountName = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter a name for your Shelby account',
    placeHolder: 'my-account',
  });
  if (!accountName) {
    return;
  }

  // Step 4: Account address
  const address = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter your Aptos account address (hex)',
    placeHolder: '0x...',
    validateInput: hexValidator('Address'),
  });
  if (!address) {
    return;
  }

  // Step 5: Private key
  const privateKey = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter your account private key (hex)',
    placeHolder: '0x...',
    password: true,
    validateInput: hexValidator('Private key', 64),
  });
  if (!privateKey) {
    return;
  }

  // Write to VS Code settings
  const config = vscode.workspace.getConfiguration('shelby');
  await config.update(
    'apiKey',
    apiKey,
    vscode.ConfigurationTarget.Global,
  );
  await config.update(
    'network',
    network.label,
    vscode.ConfigurationTarget.Global,
  );
  await config.update(
    'accounts',
    [{ name: accountName, address, privateKey }],
    vscode.ConfigurationTarget.Global,
  );
  await config.update(
    'defaultAccount',
    accountName,
    vscode.ConfigurationTarget.Global,
  );

  void vscode.window.showInformationMessage(
    `Shelby configured: network=${network.label}, account=${accountName}.`,
  );
}
