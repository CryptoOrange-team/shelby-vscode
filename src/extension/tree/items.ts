/**
 * TreeItem subclasses for the Shelby blob explorer.
 */
import * as vscode from 'vscode';
import { formatSize } from '../utils';
import { TreeItemContext } from '../../types/extension';
import type { AccountConfig, BlobInfo, ConnectionStatus } from '../../types/shelby';

/** An individual configured account */
export class AccountItem extends vscode.TreeItem {
  readonly accountName: string;

  constructor(account: AccountConfig) {
    super(account.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.accountName = account.name;
    this.contextValue = TreeItemContext.ACCOUNT;
    this.description = account.address.slice(0, 12) + '...';
    this.iconPath = new vscode.ThemeIcon('account');
    this.tooltip = `Address: ${account.address}\nHas key: ${account.privateKey ? 'Yes' : 'No'}`;
  }
}

/** A single blob entry (leaf node) */
export class BlobItem extends vscode.TreeItem {
  readonly blobAccount: string;
  readonly blobName: string;

  constructor(blob: BlobInfo) {
    super(blob.name, vscode.TreeItemCollapsibleState.None);
    this.blobAccount = blob.account;
    this.blobName = blob.name;
    this.contextValue = TreeItemContext.BLOB;
    this.description = formatSize(blob.sizeBytes);
    this.iconPath = new vscode.ThemeIcon('file');
    this.tooltip = [
      `Name: ${blob.name}`,
      `Size: ${formatSize(blob.sizeBytes)}`,
      `Created: ${blob.createdAt.toLocaleString()}`,
      `Expires: ${blob.expiresAt.toLocaleString()}`,
    ].join('\n');
    this.command = {
      command: 'shelby.download',
      title: 'Download Blob',
      arguments: [{ account: blob.account, blobName: blob.name }],
    };
  }
}

/** Status indicator shown at the bottom of the tree */
export class StatusItem extends vscode.TreeItem {
  constructor(network: string, status: ConnectionStatus) {
    super(`Network: ${network}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = TreeItemContext.STATUS;

    switch (status) {
      case 'connected':
        this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'));
        this.description = 'connected';
        break;
      case 'disconnected':
        this.iconPath = new vscode.ThemeIcon('circle-slash');
        this.description = 'disconnected';
        break;
      case 'error':
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        this.description = 'error';
        break;
    }
    this.tooltip = 'Shelby network status';
  }
}
