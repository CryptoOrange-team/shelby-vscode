/**
 * shelby.upload command — Upload a file as a blob to Shelby.
 *
 * Flow: file selection → blob name → account → expiration → upload with progress.
 */
import * as vscode from 'vscode';
import { pickAccount, showError } from '../utils';
import type { ShelbyServices } from '../../extension';

export function registerUploadCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.upload',
    async (args?: { uri?: vscode.Uri }) => {
      try {
        await handleUpload(services, args);
      } catch (error) {
        showError('Shelby upload failed', error);
      }
    },
  );
}

async function handleUpload(
  services: ShelbyServices,
  args?: { uri?: vscode.Uri },
): Promise<void> {
  const { blobService } = services;
  const config = await services.config.resolve();

  // Step 1: Get file data
  let data: Uint8Array;
  let selectedPath: string | undefined;

  if (args?.uri) {
    selectedPath = args.uri.fsPath;
    data = await vscode.workspace.fs.readFile(args.uri);
  } else {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select file to upload',
    });
    if (!uris || uris.length === 0) return;
    if (uris[0] === undefined) return;
    selectedPath = uris[0].fsPath;
    data = await vscode.workspace.fs.readFile(uris[0]);
  }

  if (data.length === 0) {
    void vscode.window.showWarningMessage('The selected file is empty.');
    return;
  }

  // Step 2: Blob name — default to selected file's name
  const defaultName = selectedPath ? (selectedPath.split(/[/\\]/).pop() ?? 'blob') : 'blob';

  const blobName = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter a name for this blob',
    value: defaultName,
    validateInput: (value) =>
      value.trim().length === 0 ? 'Blob name cannot be empty' : null,
  });
  if (!blobName) return;

  // Step 3: Select account
  const accountName = await pickAccount(config);
  if (!accountName) return;

  // Step 4: Expiration
  const expirationStr = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Expiration in days',
    value: String(config.defaultExpirationDays),
    validateInput: (value) => {
      const days = Number(value);
      if (isNaN(days) || !isFinite(days) || days < 1) {
        return 'Enter a valid number of days (minimum 1)';
      }
      return null;
    },
  });
  if (!expirationStr) return;

  const expirationDays = Number(expirationStr);

  // Step 5: Upload with progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Uploading "${blobName}" to Shelby...`,
      cancellable: false,
    },
    async () => {
      await blobService.upload(
        config, data, blobName.trim(), accountName, expirationDays,
      );
    },
  );

  void vscode.window.showInformationMessage(
    `"${blobName}" uploaded (${data.length} bytes)`,
  );

  services.treeProvider?.refresh();
}
