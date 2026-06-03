/**
 * shelby.copyUrl command — Copy Shelby blob URL to clipboard.
 */
import * as vscode from 'vscode';
import { extractBlobArg, formatSize } from '../utils';
import type { ShelbyServices } from '../../extension';

const URL_TEMPLATES: Record<string, (addr: string, name: string) => string> = {
  'shelby://': (addr, name) => `shelby://${addr}/${name}`,
  'https://shelby.xyz/blob/': (addr, name) => `https://shelby.xyz/blob/${addr}/${name}`,
  'https://explorer.shelby.xyz/blob/': (addr, name) => `https://explorer.shelby.xyz/blob/${addr}/${name}`,
};

export function registerCopyUrlCommand(
  services: ShelbyServices,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'shelby.copyUrl',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (item: any) => {
      const config = await services.config.resolve();
      const cfg = vscode.workspace.getConfiguration('shelby');
      const urlFormat = cfg.get<string>('urlFormat', 'shelby://');
      const urlBuilder = URL_TEMPLATES[urlFormat] ?? URL_TEMPLATES['shelby://'] ?? ((addr: string, name: string) => `shelby://${addr}/${name}`);

      const arg = extractBlobArg(item);
      let blobName: string | undefined = arg.blobName;
      let accountAddr: string | undefined = arg.account;

      if (!blobName || !accountAddr) {
        if (!config.defaultAccount || config.accounts.length === 0) {
          void vscode.window.showWarningMessage('No accounts or blobs available.');
          return;
        }
        const blobs = await services.blobService.listBlobs(config, config.defaultAccount);
        if (blobs.length === 0) {
          void vscode.window.showInformationMessage('No blobs found.');
          return;
        }
        const pick = await vscode.window.showQuickPick(
          blobs.map((b) => ({ label: b.name, description: formatSize(b.sizeBytes) })),
          { placeHolder: 'Select blob to copy URL' },
        );
        if (!pick) return;
        blobName = pick.label;
        const srcAccount = config.accounts.find((a) => a.name === config.defaultAccount);
        accountAddr = srcAccount?.address;
        if (!accountAddr) {
          void vscode.window.showWarningMessage('Default account not found in configuration.');
          return;
        }
      }

      if (!blobName || !accountAddr) return;
      const url = urlBuilder(accountAddr, blobName);
      await vscode.env.clipboard.writeText(url);
      void vscode.window.showInformationMessage(`Copied: ${url}`);
    },
  );
}
