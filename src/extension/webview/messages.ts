/**
 * Webview IPC message types and dispatcher.
 *
 * Defines the message contract between the extension and the webview panel.
 * Uses typed message envelopes for type-safe communication.
 */
import type * as vscode from 'vscode';
import type {
  WebviewToExtensionMessage,
  ExtensionToWebviewMessage,
} from '../../types/extension';
import { ShelbyError } from '../../types/shelby';
import type { BlobService } from '../../core/blob-service';
import type { ShelbyConfig } from '../../types/shelby';

/**
 * Handle an incoming message from the webview.
 * Returns the response message to send back, or undefined.
 * `onProgress` is called with 0-100 during upload.
 */
export async function handleMessage(
  message: WebviewToExtensionMessage,
  blobService: BlobService,
  config: ShelbyConfig,
  onProgress?: (pct: number) => void,
): Promise<ExtensionToWebviewMessage | void> {
  switch (message.type) {
    case 'fetchBlobs': {
      try {
        const blobs = await blobService.listBlobs(config, message.account);
        return { type: 'blobsLoaded', blobs };
      } catch (error) {
        return { type: 'error', message: toMessage(error) };
      }
    }

    case 'uploadBlob': {
      try {
        const data = base64ToUint8Array(message.data);
        await blobService.upload(
          config,
          data,
          message.name,
          message.account,
          message.expirationDays,
          (pct) => onProgress?.(pct),
        );
        return { type: 'uploadComplete', blobName: message.name };
      } catch (error) {
        return { type: 'uploadError', message: toMessage(error) };
      }
    }

    case 'downloadBlob': {
      try {
        // Download is handled by the command — webview sends path request
        // This is handled via the panel's postMessage flow
        return undefined;
      } catch (error) {
        return { type: 'error', message: toMessage(error) };
      }
    }

    case 'getConfig': {
      return { type: 'config', config };
    }

    default:
      return undefined;
  }
}

/**
 * Send a typed message to a webview panel.
 */
export function postMessage(
  panel: vscode.WebviewPanel,
  message: ExtensionToWebviewMessage,
): void {
  void panel.webview.postMessage(message);
}

// ── Helpers ──────────────────────────────────────────────

function toMessage(error: unknown): string {
  if (error instanceof ShelbyError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
