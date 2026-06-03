/**
 * Shelby VS Code Extension — Main Entry Point.
 */
import * as vscode from 'vscode';
import { ShelbyClient } from './core/shelby-client';
import { ConfigManager } from './core/config-manager';
import { BlobService } from './core/blob-service';
import { OfflineQueue } from './core/offline-queue';
import { SecretsManager } from './core/secrets-manager';
import { registerAllCommands } from './extension/commands/index';
import { registerTreeView } from './extension/tree/index';
import { registerWebview } from './extension/webview/index';
import { ShelbyStatusBar } from './extension/status-bar/index';
import { ShelbyDiagnosticsProvider } from './extension/diagnostics/index';
import type { ShelbyConfig } from './types/shelby';

let outputChannel: vscode.OutputChannel;

function log(message: string): void {
  if (outputChannel) {
    outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
  }
}

function makeSettingsReader(): { get: <T>(section: string, defaultValue?: T) => T } {
  return {
    get<T>(section: string, defaultValue?: T): T {
      const val = vscode.workspace.getConfiguration().get<T>(section);
      return val ?? (defaultValue as T);
    },
  };
}

async function migrateKeysToSecretStorage(secrets: vscode.SecretStorage): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('shelby');
  const accounts = cfg.get<Array<{ name: string; address: string; privateKey?: string }>>('accounts', []);
  let migrated = false;
  const cleanAccounts: Array<{ name: string; address: string }> = [];
  for (const acct of accounts) {
    if (acct.privateKey && acct.privateKey.trim().length > 0) {
      await SecretsManager.storeKey(secrets, acct.name, acct.privateKey.trim());
      log(`Migrated key for "${acct.name}" to SecretStorage`);
      migrated = true;
    }
    cleanAccounts.push({ name: acct.name, address: acct.address });
  }
  if (migrated) {
    await cfg.update('accounts', cleanAccounts, vscode.ConfigurationTarget.Global);
    log('Removed plaintext private keys from settings.json');
  }
}

let keysMigrated = false;

async function resolveConfig(secrets: vscode.SecretStorage): Promise<ShelbyConfig> {
  if (!keysMigrated) {
    await migrateKeysToSecretStorage(secrets);
    keysMigrated = true;
  }
  const config = ConfigManager.resolve(makeSettingsReader());
  if (config.accounts.length > 0) {
    const hydrated = await SecretsManager.hydrateAccounts(secrets, config.accounts);
    return Object.freeze({ ...config, accounts: hydrated }) as ShelbyConfig;
  }
  return config;
}

class ConnectionState {
  private _connected = false;
  private readonly _onDidChange = new vscode.EventEmitter<boolean>();
  readonly onDidChange = this._onDidChange.event;
  get connected(): boolean { return this._connected; }
  setConnected(value: boolean): void {
    this._connected = value;
    this._onDidChange.fire(value);
  }
}

export { ConnectionState };

export interface ShelbyServices {
  client: ShelbyClient;
  config: { resolve: () => Promise<ShelbyConfig> };
  blobService: BlobService;
  readonly connection: ConnectionState;
  readonly offlineQueue: OfflineQueue;
  readonly secrets: vscode.SecretStorage;
  treeProvider: { refresh: (config?: ShelbyConfig) => void; dispose: () => void } | null;
  webviewPanel: { show: () => void; updateConfig: (config: ShelbyConfig) => void; dispose: () => void } | null;
}

async function doActivate(context: vscode.ExtensionContext): Promise<void> {
  const secrets = context.secrets;

  const initialConfig = await resolveConfig(secrets);
  log(`Config loaded: network=${initialConfig.network}, accounts=${initialConfig.accounts.length}`);

  const client = new ShelbyClient(initialConfig.network, initialConfig.apiKey);
  const blobService = new BlobService(client);
  const connection = new ConnectionState();
  const offlineQueue = new OfflineQueue();

  const services: ShelbyServices = {
    client,
    config: { resolve: () => resolveConfig(secrets) },
    blobService,
    connection,
    offlineQueue,
    secrets,
    treeProvider: null,
    webviewPanel: null,
  };

  const treeProvider = registerTreeView(context, blobService, initialConfig);
  treeProvider.setConnection(connection);
  services.treeProvider = treeProvider;

  const webviewPanel = registerWebview(context, blobService, initialConfig);
  services.webviewPanel = webviewPanel;

  registerAllCommands(context, services);

  const statusBar = new ShelbyStatusBar(connection, offlineQueue);
  statusBar.update(initialConfig);
  context.subscriptions.push(statusBar.statusBarItem);
  context.subscriptions.push(statusBar);

  const diagnostics = new ShelbyDiagnosticsProvider();
  diagnostics.activate(context, () => resolveConfig(secrets));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('shelby')) return;
      clearTimeout(configDebounce);
      configDebounce = setTimeout(async () => {
        log('Config changed, reloading...');
        const newConfig = await resolveConfig(secrets);
        // Recreate client with new API key / network
        services.client = new ShelbyClient(newConfig.network, newConfig.apiKey);
        services.blobService = new BlobService(services.client);
        statusBar.update(newConfig);
        webviewPanel.updateConfig(newConfig);
        treeProvider.refresh(newConfig);
        void diagnostics.refresh();
      }, 300);
    }),
  );

  context.subscriptions.push(
    connection.onDidChange(async (connected) => {
      if (!connected || offlineQueue.pendingCount === 0) return;
      log(`Flushing ${offlineQueue.pendingCount} queued operations...`);
      const config = await resolveConfig(secrets);
      const { succeeded, failed } = await offlineQueue.flush(
        async (item) => {
          if (item.type === 'upload' && item.data) {
            await blobService.upload(config, item.data, item.blobName, item.account.name, item.expirationDays);
          } else if (item.type === 'delete') {
            await blobService.delete(config, item.blobName, item.account.name);
          }
        },
        (done, total) => statusBar.updateQueueProgress(done, total),
      );
      statusBar.updateQueueProgress(0, 0);
      log(`Queue flush: ${succeeded} ok, ${failed} failed`);
      if (succeeded > 0) {
        void vscode.window.showInformationMessage(
          `Offline queue: ${succeeded} done.${failed > 0 ? ` ${failed} failed.` : ''}`,
        );
      }
      treeProvider.refresh();
    }),
  );
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('Shelby');
  context.subscriptions.push(outputChannel);
  log('Extension activating...');
  try {
    await doActivate(context);
    log('Extension activated.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Activation error: ${msg}`);
    void vscode.window.showErrorMessage(`Shelby activation failed: ${msg}`);
  }
}

let configDebounce: ReturnType<typeof setTimeout> | undefined;

export function deactivate(): void {
  clearTimeout(configDebounce);
  log('Extension deactivated.');
}
