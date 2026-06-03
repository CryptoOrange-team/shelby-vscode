/**
 * Register the Shelby webview panel.
 */
import type * as vscode from 'vscode';
import { ShelbyBrowserPanel } from './panel';
import type { BlobService } from '../../core/blob-service';
import type { ShelbyConfig } from '../../types/shelby';

export function registerWebview(
  context: vscode.ExtensionContext,
  blobService: BlobService,
  config: ShelbyConfig,
): ShelbyBrowserPanel {
  const panel = new ShelbyBrowserPanel(context.extensionUri, blobService, config);
  context.subscriptions.push(panel);
  return panel;
}
