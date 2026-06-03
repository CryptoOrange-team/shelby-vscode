/**
 * Blob service — coordinates multi-step blob operations.
 *
 * Takes ShelbyClient + ConfigManager, orchestrates upload/download/list
 * with progress callbacks and typed error propagation.
 * ZERO imports from 'vscode'.
 */

import type { ShelbyClient } from './shelby-client';
import { ConfigManager } from './config-manager';
import {
  ShelbyError,
  ShelbyErrorCode,
  type AccountConfig,
  type BlobInfo,
  type ShelbyConfig,
} from '../types/shelby';

export type ProgressCallback = (percent: number) => void;

export class BlobService {
  private readonly client: ShelbyClient;

  constructor(client: ShelbyClient) {
    this.client = client;
  }

  /**
   * Upload a blob to Shelby.
   */
  async upload(
    config: ShelbyConfig,
    data: Uint8Array,
    blobName: string,
    accountName: string | null,
    expirationDays: number | null,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const account = this.resolveAccount(config, accountName);
    const days = expirationDays ?? config.defaultExpirationDays;
    const expirationMicros = ConfigManager.expirationFromDays(days);

    onProgress?.(0);

    await this.client.upload(data, blobName, account, expirationMicros);

    onProgress?.(100);
  }

  /**
   * Download a blob from Shelby.
   * Returns a ReadableStream of the blob bytes.
   */
  async download(
    config: ShelbyConfig,
    blobName: string,
    accountName: string | null,
    onProgress?: ProgressCallback,
  ): Promise<ReadableStream<Uint8Array>> {
    const account = this.resolveAccount(config, accountName);

    onProgress?.(0);

    const stream = await this.client.download({
      account,
      blobName,
    });

    onProgress?.(100);
    return stream;
  }

  /**
   * List all blobs for an account.
   */
  async listBlobs(
    config: ShelbyConfig,
    accountName: string | null,
  ): Promise<readonly BlobInfo[]> {
    const account = this.resolveAccount(config, accountName);

    return this.client.listBlobs({ account });
  }

  /**
   * Delete a blob from Shelby.
   */
  async delete(
    config: ShelbyConfig,
    blobName: string,
    accountName: string | null,
  ): Promise<void> {
    const account = this.resolveAccount(config, accountName);
    await this.client.deleteBlob(account, blobName);
  }

  /**
   * Verify blob integrity via Merkle proof.
   */
  async verify(
    config: ShelbyConfig,
    blobName: string,
    accountName: string | null,
  ): Promise<{ valid: boolean; root?: string; error?: string }> {
    try {
      const account = this.resolveAccount(config, accountName);
      return await this.client.verifyBlob(account, blobName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: message };
    }
  }

  /**
   * Resolve an account from config.
   * Uses the provided name, or the default account from config.
   * Throws if no account can be resolved.
   */
  private resolveAccount(
    config: ShelbyConfig,
    accountName: string | null,
  ): AccountConfig {
    const name = accountName ?? config.defaultAccount;

    if (!name) {
      throw new ShelbyError(
        ShelbyErrorCode.CONFIG_INVALID,
        'No account specified and no default account configured. ' +
          'Set shelby.defaultAccount or configure an account in settings.',
      );
    }

    const account = ConfigManager.findAccount(config, name);
    if (!account) {
      throw new ShelbyError(
        ShelbyErrorCode.CONFIG_INVALID,
        `Account "${name}" not found in configuration. ` +
          'Add it in VS Code settings (shelby.accounts) or via `shelby init`.',
      );
    }

    if (!account.privateKey || !account.address) {
      throw new ShelbyError(
        ShelbyErrorCode.CONFIG_INVALID,
        `Account "${name}" is missing required fields (address or privateKey).`,
      );
    }

    return account;
  }
}
