/**
 * shelby.verifyIntegrity command — Verify blob integrity via Merkle proof.
 */
import * as vscode from 'vscode';
import { extractBlobArg, showError } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerVerifyIntegrityCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.verifyIntegrity',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (item: any) => {
      try {
        await handleVerify(services, item);
      } catch (error) {
        showError('Shelby verify failed', error);
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleVerify(services: ShelbyServices, item: any): Promise<void> {
  const config = await services.config.resolve();

  const arg = extractBlobArg(item);
  let accountName: string | undefined = arg.account;
  let blobName: string | undefined = arg.blobName;

  if (!blobName) {
    if (config.accounts.length === 0) {
      void vscode.window.showWarningMessage('No accounts configured.');
      return;
    }
    const blobs = await services.blobService.listBlobs(config, config.defaultAccount);
    if (blobs.length === 0) {
      void vscode.window.showInformationMessage('No blobs found to verify.');
      return;
    }
    const pick = await vscode.window.showQuickPick(
      blobs.map((b) => ({
        label: b.name,
        description: `Expires: ${b.expiresAt.toLocaleDateString()}`,
      })),
      { placeHolder: 'Select blob to verify integrity' },
    );
    if (!pick) return;
    blobName = pick.label;
  }

  accountName ??= config.defaultAccount;
  if (!blobName || !accountName) {
    void vscode.window.showWarningMessage('No blob or account specified.');
    return;
  }
  const name = blobName;
  const acct = accountName;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Verifying "${name}"...` },
    async () => {
      const result = await services.blobService.verify(config, name, acct);
      if (result.valid) {
        void vscode.window.showInformationMessage(
          `✅ "${name}" — integrity verified. Merkle root: ${result.root?.slice(0, 16)}...`,
        );
      } else {
        void vscode.window.showErrorMessage(
          `❌ "${name}" — integrity check FAILED: ${result.error ?? 'Unknown error'}`,
        );
      }
    },
  );
}
