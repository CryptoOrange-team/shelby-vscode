/**
 * shelby.deleteBlob command — Delete a blob from Shelby.
 */
import * as vscode from 'vscode';
import { ShelbyError } from '../../types/shelby';
import { extractBlobArg, formatSize } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerDeleteBlobCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.deleteBlob',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (item: any) => {
      try {
        await handleDelete(services, item);
      } catch (error) {
        const message = error instanceof ShelbyError ? error.message : String(error);
        void vscode.window.showErrorMessage(`Shelby: ${message}`);
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDelete(services: ShelbyServices, item: any): Promise<void> {
  const { blobService } = services;
  const config = await services.config.resolve();

  let accountName: string | undefined;
  let blobName: string | undefined;

  const arg = extractBlobArg(item);
  if (arg.account && arg.blobName) {
    accountName = arg.account;
    blobName = arg.blobName;
  } else {
    if (config.accounts.length === 0) {
      void vscode.window.showWarningMessage('No accounts configured.');
      return;
    }

    // Pick account
    const acctPick = await vscode.window.showQuickPick(
      config.accounts.map((a) => ({ label: a.name, description: `${a.address.slice(0, 12)}...` })),
      { placeHolder: 'Select account' },
    );
    if (!acctPick) return;
    accountName = acctPick.label;

    // List and pick blob
    const blobs = await blobService.listBlobs(config, accountName);
    if (blobs.length === 0) {
      void vscode.window.showInformationMessage(`No blobs for "${accountName}".`);
      return;
    }
    const blobPick = await vscode.window.showQuickPick(
      blobs.map((b) => ({ label: b.name, description: formatSize(b.sizeBytes) })),
      { placeHolder: 'Select blob to delete' },
    );
    if (!blobPick) return;
    blobName = blobPick.label;
  }

  if (!blobName || !accountName) return;
  const name = blobName;
  const acct = accountName;

  // Confirm
  const confirm = await vscode.window.showWarningMessage(
    `Delete "${name}" from Shelby? This cannot be undone.`,
    { modal: true },
    'Delete',
  );
  if (confirm !== 'Delete') return;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Deleting "${name}"...` },
    async () => {
      await blobService.delete(config, name, acct);
    },
  );

  void vscode.window.showInformationMessage(`"${name}" deleted.`);
  services.treeProvider?.refresh();
}
