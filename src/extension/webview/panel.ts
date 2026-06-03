/**
 * ShelbyBrowserPanel — manages the WebviewPanel lifecycle for the Blob Browser.
 *
 * Creates a single webview panel (reused on subsequent invocations).
 * Handles message passing between extension and webview.
 */
import * as vscode from 'vscode';
import type { BlobService } from '../../core/blob-service';
import type { ShelbyConfig } from '../../types/shelby';
import type { WebviewToExtensionMessage } from '../../types/extension';
import { handleMessage, postMessage } from './messages';

/**
 * Get the webview HTML content with strict CSP.
 */
function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
): string {
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'styles.css'),
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'webview', 'main.js'),
  );

  // Nonce for CSP
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri.toString()}">
  <title>Shelby Blob Browser</title>
</head>
<body>
  <div class="app">
    <nav class="tabs">
      <button class="tab active" data-tab="browse">Browse</button>
      <button class="tab" data-tab="upload">Upload</button>
      <button class="tab" data-tab="config">Config</button>
    </nav>

    <section id="tab-browse" class="tab-content active">
      <div class="toolbar">
        <select id="account-select" class="account-picker">
          <option value="">-- Select Account --</option>
        </select>
        <button id="refresh-btn" class="btn">Refresh</button>
      </div>
      <div id="blob-list" class="blob-grid">
        <p class="placeholder">Select an account to browse blobs.</p>
      </div>
    </section>

    <section id="tab-upload" class="tab-content">
      <div class="upload-zone" id="drop-zone">
        <p>Drop a file here to upload</p>
        <p class="sub">or click to select file</p>
        <input type="file" id="file-input" hidden>
      </div>
      <div class="upload-form" hidden>
        <div class="form-group">
          <label for="upload-name">Blob Name</label>
          <input type="text" id="upload-name" placeholder="my-blob">
        </div>
        <div class="form-group">
          <label for="upload-account">Account</label>
          <select id="upload-account"></select>
        </div>
        <div class="form-group">
          <label for="upload-expiration">Expiration (days)</label>
          <input type="number" id="upload-expiration" value="30" min="1" max="365">
        </div>
        <button id="upload-btn" class="btn primary" disabled>Upload</button>
        <progress id="upload-progress" value="0" max="100" hidden></progress>
      </div>
    </section>

    <section id="tab-config" class="tab-content">
      <div id="config-display" class="config-card">
        <p class="placeholder">Loading configuration...</p>
      </div>
    </section>
  </div>

  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}

function getNonce(): string {
  return crypto.randomUUID();
}

// ── Panel Manager ───────────────────────────────────────

export class ShelbyBrowserPanel {
  private panel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private readonly blobService: BlobService;
  private config: ShelbyConfig;

  constructor(extensionUri: vscode.Uri, blobService: BlobService, config: ShelbyConfig) {
    this.extensionUri = extensionUri;
    this.blobService = blobService;
    this.config = config;
  }

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'shelbyBrowser',
      'Shelby Blob Browser',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'media'),
        ],
      },
    );

    this.panel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      'media',
      'shelby-icon.svg',
    );

    this.panel.webview.html = getWebviewContent(
      this.panel.webview,
      this.extensionUri,
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        const response = await handleMessage(
          message,
          this.blobService,
          this.config,
        );
        if (response && this.panel) {
          postMessage(this.panel, response);
        }

        // Handle download specially — need to show save dialog
        if (
          message.type === 'downloadBlob' &&
          this.panel
        ) {
          const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(message.blobName),
            saveLabel: 'Download Blob',
          });
          if (saveUri) {
            try {
              const { mkdirSync, writeFileSync } = await import('node:fs');
              const { dirname, parse: parsePath } = await import('node:path');

              const stream = await this.blobService.download(
                this.config, message.blobName, message.account,
              );

              const reader = stream.getReader();
              const chunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) chunks.push(value);
              }

              const parentDir = dirname(saveUri.fsPath);
              if (parentDir !== saveUri.fsPath && parentDir !== parsePath(parentDir).root) {
                mkdirSync(parentDir, { recursive: true });
              }
              writeFileSync(saveUri.fsPath, Buffer.concat(chunks));

              void vscode.window.showInformationMessage(
                `Downloaded "${message.blobName}" to ${saveUri.fsPath}`,
              );
            } catch (error) {
              const msg =
                error instanceof Error ? error.message : String(error);
              postMessage(this.panel, { type: 'error', message: msg });
            }
          }
        }
      },
      undefined,
      [],
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      [],
    );
  }

  /**
   * Update the panel's config reference (called when settings change).
   */
  updateConfig(config: ShelbyConfig): void {
    this.config = config;
    if (this.panel) {
      postMessage(this.panel, { type: 'config', config });
    }
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
