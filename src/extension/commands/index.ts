/**
 * Register all 15 Shelby commands.
 */
import type * as vscode from 'vscode';
import { registerUploadCommand } from './upload';
import { registerDownloadCommand } from './download';
import { registerListBlobsCommand } from './list-blobs';
import { registerInitConfigCommand } from './init-config';
import { registerConfigureAccountCommand } from './configure-account';
import { registerOpenBrowserCommand } from './open-browser';
import { registerValidateConfigCommand } from './validate-config';
import { registerRefreshTreeCommand } from './refresh-tree';
import { registerDeleteBlobCommand } from './delete-blob';
import { registerConnectCommand, registerDisconnectCommand } from './connect';
import { registerSwitchNetworkCommand } from './switch-network';
import { registerFaucetCommand } from './faucet';
import { registerCopyUrlCommand } from './copy-url';
import { registerVerifyIntegrityCommand } from './verify-integrity';
import type { ShelbyServices } from '../../extension';

export function registerAllCommands(
  context: vscode.ExtensionContext,
  services: ShelbyServices,
): void {
  context.subscriptions.push(registerUploadCommand(services));
  context.subscriptions.push(registerDownloadCommand(services));
  context.subscriptions.push(registerListBlobsCommand(services));
  context.subscriptions.push(registerInitConfigCommand());
  context.subscriptions.push(registerConfigureAccountCommand(services));
  context.subscriptions.push(registerOpenBrowserCommand(services));
  context.subscriptions.push(registerValidateConfigCommand(services));
  context.subscriptions.push(registerRefreshTreeCommand(services));
  context.subscriptions.push(registerDeleteBlobCommand(services));
  context.subscriptions.push(registerConnectCommand(services));
  context.subscriptions.push(registerDisconnectCommand(services));
  context.subscriptions.push(registerSwitchNetworkCommand());
  context.subscriptions.push(registerFaucetCommand());
  context.subscriptions.push(registerCopyUrlCommand(services));
  context.subscriptions.push(registerVerifyIntegrityCommand(services));
}
