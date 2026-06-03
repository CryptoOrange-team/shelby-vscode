/**
 * Extension UI types.
 *
 * Types used by the VS Code extension layer (commands, tree, webview, etc.).
 * No VS Code imports — pure type declarations for message contracts and state.
 */

import type { BlobInfo, ShelbyConfig } from './shelby';

// ── Tree View ────────────────────────────────────────────

/** Context values for tree items (maps to viewItem in package.json when clauses) */
export const TreeItemContext = {
  ACCOUNT: 'shelby.account',
  BLOB: 'shelby.blob',
  STATUS: 'shelby.status',
} as const;

export type TreeItemContextValue =
  (typeof TreeItemContext)[keyof typeof TreeItemContext];

// ── Webview IPC ──────────────────────────────────────────

/** Union of all message types sent from the webview to the extension */
export type WebviewToExtensionMessage =
  {
      readonly type: 'downloadBlob';
      readonly account: string;
      readonly blobName: string;
      readonly savePath: string;
    } | {
      readonly type: 'uploadBlob';
      readonly account: string;
      readonly name: string;
      readonly data: string; // base64-encoded
      readonly expirationDays: number;
    } | { readonly type: 'fetchBlobs'; readonly account: string } | { readonly type: 'getConfig' };

/** Union of all message types sent from the extension to the webview */
export type ExtensionToWebviewMessage =
  { readonly type: 'blobsLoaded'; readonly blobs: readonly BlobInfo[] } | { readonly type: 'config'; readonly config: ShelbyConfig } | { readonly type: 'error'; readonly message: string } | { readonly type: 'uploadComplete'; readonly blobName: string } | { readonly type: 'uploadError'; readonly message: string } | { readonly type: 'uploadProgress'; readonly percent: number };

