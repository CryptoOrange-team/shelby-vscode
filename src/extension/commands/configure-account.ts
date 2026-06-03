/**
 * shelby.configureAccount command — Add or remove accounts.
 * Private keys stored in OS-level SecretStorage, not plaintext settings.
 */
import * as vscode from 'vscode';
import { SecretsManager } from '../../core/secrets-manager';
import { hexValidator } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerConfigureAccountCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.configureAccount', async () => {
    const action = await vscode.window.showQuickPick(
      [
        { label: 'Add Account', description: 'Add a new Shelby account' },
        { label: 'Remove Account', description: 'Remove a stored account' },
      ],
      { placeHolder: 'Account management' },
    );
    if (!action) return;

    if (action.label === 'Remove Account') {
      await removeAccount(services.secrets);
    } else {
      await addAccount();
    }
  });
}

async function addAccount(): Promise<void> {
  const name = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Display name for this account',
    placeHolder: 'my-account',
    validateInput: (v) => v.trim().length === 0 ? 'Name is required' : null,
  });
  if (!name) return;

  const address = await vscode.window.showInputBox({
    prompt: 'Aptos account address (hex)',
    placeHolder: '0x...',
    validateInput: hexValidator('Address'),
  });
  if (!address) return;

  const privateKey = await vscode.window.showInputBox({
    prompt: 'Account private key (hex) — stored in OS-encrypted SecretStorage',
    placeHolder: '0x...',
    password: true,
    validateInput: hexValidator('Private key', 64),
  });
  if (!privateKey) return;

  // Keys auto-migrated to OS-level SecretStorage on extension activation.
  const cfg = vscode.workspace.getConfiguration('shelby');
  const existing = cfg.get<Array<{ name: string; address: string; privateKey?: string }>>('accounts', []);
  if (existing.some((a) => a.name === name.trim())) {
    void vscode.window.showWarningMessage(`Account "${name}" already exists.`);
    return;
  }

  const updated = [...existing, { name: name.trim(), address: address.trim(), privateKey: privateKey.trim() }];
  await cfg.update('accounts', updated, vscode.ConfigurationTarget.Global);

  if (existing.length === 0) {
    await cfg.update('defaultAccount', name.trim(), vscode.ConfigurationTarget.Global);
  }

  void vscode.window.showInformationMessage(
    `Account "${name.trim()}" added. Private key stored in OS-level SecretStorage.`,
  );
}

import type { SecretsAPI } from '../../core/secrets-manager';

async function removeAccount(secrets: SecretsAPI): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('shelby');
  const existing = cfg.get<Array<{ name: string; address: string }>>('accounts', []);

  if (existing.length === 0) {
    void vscode.window.showInformationMessage('No accounts to remove.');
    return;
  }

  const pick = await vscode.window.showQuickPick(
    existing.map((a) => ({ label: a.name, description: a.address.slice(0, 12) + '...' })),
    { placeHolder: 'Select account to remove' },
  );
  if (!pick) return;

  const confirm = await vscode.window.showWarningMessage(
    `Remove account "${pick.label}"? This will delete the private key from SecretStorage.`,
    { modal: true },
    'Remove',
  );
  if (confirm !== 'Remove') return;

  // Remove from settings
  const updated = existing.filter((a) => a.name !== pick.label);
  await cfg.update('accounts', updated, vscode.ConfigurationTarget.Global);

  // Clean up orphaned key from OS SecretStorage
  await SecretsManager.deleteKey(secrets, pick.label);

  // Clear default if removed
  const defaultAcct = cfg.get<string>('defaultAccount', '');
  if (defaultAcct === pick.label) {
    await cfg.update('defaultAccount', updated.length > 0 ? updated[0]?.name ?? '' : '', vscode.ConfigurationTarget.Global);
  }

  void vscode.window.showInformationMessage(`Account "${pick.label}" removed.`);
}
