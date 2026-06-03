/**
 * Register the Shelby tree view.
 */
import * as vscode from 'vscode';
import { ShelbyTreeDataProvider } from './provider';
import type { BlobService } from '../../core/blob-service';
import type { ShelbyConfig } from '../../types/shelby';

export function registerTreeView(
  context: vscode.ExtensionContext,
  blobService: BlobService,
  initialConfig: ShelbyConfig,
): ShelbyTreeDataProvider {
  const provider = new ShelbyTreeDataProvider(blobService, initialConfig);

  const treeView = vscode.window.createTreeView('shelby.tree', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  context.subscriptions.push(treeView);
  return provider;
}
