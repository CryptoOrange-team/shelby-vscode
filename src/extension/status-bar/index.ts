/**
 * Shelby status bar indicator.
 * Shows: network, wallet address, storage usage, offline queue count.
 */
import * as vscode from 'vscode';
import type { ShelbyConfig } from '../../types/shelby';
import type { OfflineQueue } from '../../core/offline-queue';
import type { ConnectionState } from '../../extension';

export class ShelbyStatusBar {
  private readonly item: vscode.StatusBarItem;
  private readonly connection: ConnectionState;
  private readonly queue: OfflineQueue;
  private queueProgressText = '';

  constructor(connection: ConnectionState, queue: OfflineQueue) {
    this.connection = connection;
    this.queue = queue;
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.name = 'Shelby';
    this.item.command = 'shelby.openBrowser';
    this.item.text = '$(circle-slash) Shelby';
    this.item.tooltip = 'Shelby: Not configured';
    this.item.show();
  }

  /** The underlying VS Code StatusBarItem — register this with subscriptions */
  get statusBarItem(): vscode.StatusBarItem {
    return this.item;
  }

  update(config: ShelbyConfig): void {
    if (!config.showStatusBar) { this.item.hide(); return; }
    this.item.show();

    const net = config.network.charAt(0).toUpperCase() + config.network.slice(1);
    const pending = this.queue.pendingCount;
    const qText = pending > 0 ? ` $(history)${pending}` : '';

    if (!config.apiKey) {
      this.item.text = `$(warning) Shelby: No API key${qText}`;
      this.item.tooltip = 'API key not set. Run "Shelby: Initialize Config".';
      return;
    }

    const connected = this.connection.connected;
    const icon = connected ? '$(circle-filled)' : '$(circle-slash)';
    const defaultAcct = config.defaultAccount
      ? config.accounts.find((a) => a.name === config.defaultAccount)
      : undefined;
    const addrShort = defaultAcct
      ? defaultAcct.address.slice(0, 8) + '...'
      : '';

    if (defaultAcct) {
      this.item.text = `${icon} Shelby: ${net} | ${addrShort}${qText}${this.queueProgressText}`;
    } else {
      this.item.text = `${icon} Shelby: ${net}${qText}${this.queueProgressText}`;
    }

    this.item.tooltip = [
      `Shelby ${net}`,
      `Status: ${connected ? 'Connected' : 'Disconnected'}`,
      `${config.accounts.length} account(s)`,
      config.defaultAccount ? `Default: ${config.defaultAccount}` : 'No default account',
      `Expiration: ${config.defaultExpirationDays} days`,
      pending > 0 ? `Offline queue: ${pending} pending` : 'No pending operations',
      'Click to open Blob Browser',
    ].join('\n');
  }

  updateQueueProgress(done: number, total: number): void {
    if (total === 0) {
      this.queueProgressText = '';
    } else {
      this.queueProgressText = ` $(sync~spin)${done}/${total}`;
    }
  }

  dispose(): void { this.item.dispose(); }
}
