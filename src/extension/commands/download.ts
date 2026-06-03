/**
 * shelby.download command — Download a blob from Shelby to a local file.
 *
 * Flow: select account → select blob name → choose save path → download with progress.
 */
import * as vscode from 'vscode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, parse as parsePath } from 'node:path';
import { extractBlobArg, pickAccount, showError } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerDownloadCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.download',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (item: any) => {
      try {
        await handleDownload(services, item);
      } catch (error) {
        showError('Shelby download failed', error);
      }
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDownload(services: ShelbyServices, item: any): Promise<void> {
  const { blobService } = services;
  const config = await services.config.resolve();

  if (config.accounts.length === 0) {
    void vscode.window.showWarningMessage(
      'No Shelby accounts configured. Add one in settings (shelby.accounts) or run "Shelby: Configure Account".',
    );
    return;
  }

  // Step 1: Select account (skip if invoked from tree with account info)
  const arg = extractBlobArg(item);
  let accountName: string | undefined = arg.account;

  if (!accountName) {
    accountName = await pickAccount(config);
  }
  if (!accountName) {
    return;
  }

  // Step 2: Get blobs to let user pick one
  const blobs = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Fetching blob list...',
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

  // Step 3: Select blob
  let blobName: string | undefined;
  if (arg.blobName) {
    blobName = arg.blobName;
  } else {
    const blobItems = blobs.map((b) => ({
      label: b.name,
      description: `${(b.sizeBytes / 1024).toFixed(1)} KB — expires ${b.expiresAt.toLocaleDateString()}`,
    }));
    const picked = await vscode.window.showQuickPick(blobItems, {
      placeHolder: 'Select blob to download',
    });
    if (!picked) {
      return;
    }
    blobName = picked.label;
  }

  // Step 4: Save path
  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(blobName),
    saveLabel: 'Download Blob',
  });
  if (!saveUri) {
    return;
  }

  // Step 5: Download with progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Downloading "${blobName}"...`,
      cancellable: false,
    },
    async () => {
      const stream = await blobService.download(
        config, blobName, accountName,
      );

      // Read web ReadableStream into buffer (avoids Node.js stream type issues)
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      // Ensure parent directory exists
      const parentDir = dirname(saveUri.fsPath);
      if (parentDir !== saveUri.fsPath && parentDir !== parsePath(parentDir).root) {
        mkdirSync(parentDir, { recursive: true });
      }

      // Write buffer to file
      const buffer = Buffer.concat(chunks);
      writeFileSync(saveUri.fsPath, buffer);
      void vscode.window.showInformationMessage(
        `"${blobName}" downloaded (${buffer.length} bytes)`,
      );
    },
  );
}

