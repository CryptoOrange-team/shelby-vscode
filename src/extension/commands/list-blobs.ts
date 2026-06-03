/**
 * shelby.listBlobs command — List blobs for an account.
 *
 * Shows blobs in a QuickPick list and refreshes the tree view.
 */
import * as vscode from 'vscode';
import { extractBlobArg, showError } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerListBlobsCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.listBlobs',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (item: any) => {
      try {
        await handleListBlobs(services, item);
      } catch (error) {
        showError('Shelby', error);
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleListBlobs(services: ShelbyServices, item: any): Promise<void> {
  const { blobService } = services;
  const config = await services.config.resolve();

  if (config.accounts.length === 0) {
    void vscode.window.showWarningMessage(
      'No Shelby accounts configured.',
    );
    return;
  }

  let accountName: string | undefined;
  const arg = extractBlobArg(item);
  accountName = arg.account;

  if (!accountName) {
    const items = config.accounts.map((a) => ({
      label: a.name,
      description: a.address.slice(0, 12) + '...',
    }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select account to list blobs',
    });
    if (!picked) {
      return;
    }
    accountName = picked.label;
  }

  const blobs = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Fetching blobs for "${accountName}"...`,
      cancellable: false,
    },
    async () => blobService.listBlobs(config, accountName),
  );

  if (blobs.length === 0) {
    void vscode.window.showInformationMessage(
      `No blobs found for account "${accountName}".`,
    );
    return;
  }

  // Show in QuickPick
  const blobItems = blobs.map((b) => ({
    label: b.name,
    description: `${(b.sizeBytes / 1024).toFixed(1)} KB`,
    detail: `Expires: ${b.expiresAt.toLocaleString()}`,
  }));

  const picked = await vscode.window.showQuickPick(blobItems, {
    placeHolder: `${blobs.length} blob(s) — select to download or Esc to dismiss`,
  });

  if (picked) {
    // Offer to download the selected blob
    const action = await vscode.window.showInformationMessage(
      `Download "${picked.label}"?`,
      'Download',
      'Cancel',
    );
    if (action === 'Download') {
      await vscode.commands.executeCommand('shelby.download', {
        account: accountName,
        blobName: picked.label,
      });
    }
  }

  // Refresh tree
  services.treeProvider?.refresh();
}
