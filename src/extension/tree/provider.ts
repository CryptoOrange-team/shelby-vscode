/**
 * ShelbyTreeDataProvider — TreeDataProvider for the Shelby blob explorer sidebar.
 *
 * Tree hierarchy:
 *   AccountsRootItem   (always shown)
 *     AccountItem[]    (one per configured account)
 *       BlobItem[]     (individual blobs — leaf nodes)
 *   StatusItem         (network connection status)
 */
import * as vscode from 'vscode';
import { ConfigManager } from '../../core/config-manager';
import type { BlobService } from '../../core/blob-service';
import type { ShelbyConfig } from '../../types/shelby';
import { AccountItem, BlobItem, StatusItem } from './items';
import type { ConnectionState } from '../../extension';

export class ShelbyTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | null | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly blobService: BlobService;
  private config: ShelbyConfig;
  private connection: ConnectionState | null = null;

  constructor(blobService: BlobService, config: ShelbyConfig) {
    this.blobService = blobService;
    this.config = config;
  }

  /** Inject connection state for accurate status display */
  setConnection(connection: ConnectionState): void {
    this.connection = connection;
  }

  /** Refresh the entire tree, optionally with a new config snapshot */
  refresh(newConfig?: ShelbyConfig): void {
    if (newConfig) {
      this.config = newConfig;
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!element) {
      return this.getRootChildren();
    }

    if (element instanceof AccountItem) {
      return this.getAccountChildren(element);
    }

    return [];
  }

  private getRootChildren(): vscode.TreeItem[] {
    const children: vscode.TreeItem[] = [];

    if (this.config.accounts.length === 0) {
      const noAccounts = new vscode.TreeItem(
        'No accounts configured',
        vscode.TreeItemCollapsibleState.None,
      );
      noAccounts.iconPath = new vscode.ThemeIcon('warning');
      noAccounts.tooltip = 'Run "Shelby: Configure Account" to add one';
      noAccounts.command = { command: 'shelby.configureAccount', title: 'Add Account' };
      children.push(noAccounts);
    } else {
      for (const account of this.config.accounts) {
        children.push(new AccountItem(account));
      }
    }

    // Connection status — from actual ConnectionState, not config presence
    const connected = this.connection?.connected ?? false;
    children.push(new StatusItem(this.config.network, connected ? 'connected' : 'disconnected'));

    return children;
  }

  private async getAccountChildren(
    accountItem: AccountItem,
  ): Promise<vscode.TreeItem[]> {
    const account = ConfigManager.findAccount(this.config, accountItem.accountName);

    if (!account) {
      return [];
    }

    if (!account.privateKey) {
      const noKey = new vscode.TreeItem(
        'No private key',
        vscode.TreeItemCollapsibleState.None,
      );
      noKey.iconPath = new vscode.ThemeIcon('key');
      noKey.description = 'Re-add account to store key';
      return [noKey];
    }

    try {
      const blobs = await this.blobService.listBlobs(
        this.config,
        account.name,
      );

      if (blobs.length === 0) {
        const empty = new vscode.TreeItem(
          'No blobs',
          vscode.TreeItemCollapsibleState.None,
        );
        empty.iconPath = new vscode.ThemeIcon('circle-outline');
        empty.description = 'Upload a file to get started';
        return [empty];
      }

      const sorted = [...blobs].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return sorted.map((b) => new BlobItem(b));
    } catch {
      const err = new vscode.TreeItem(
        'Failed to load blobs',
        vscode.TreeItemCollapsibleState.None,
      );
      err.iconPath = new vscode.ThemeIcon('error');
      err.description = 'Check API key and network';
      return [err];
    }
  }

  getParent(_element: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem> {
    return undefined;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
