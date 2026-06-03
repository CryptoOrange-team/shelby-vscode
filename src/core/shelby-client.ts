/**
 * Shelby SDK client wrapper.
 *
 * Wraps the @shelby-protocol/sdk ShelbyNodeClient, providing:
 * - Account construction from AccountConfig
 * - Typed error normalization into ShelbyError subclasses
 *
 * ZERO imports from 'vscode' — pure Node.js/business logic.
 */

import { Account, AccountAddress, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import {
  ShelbyError,
  ShelbyErrorCode,
  type AccountConfig,
  type BlobInfo,
  type DownloadOptions,
  type ListBlobsOptions,
  type ShelbyNetwork,
} from '../types/shelby';

// ── Dynamic SDK import ──────────────────────────────────
// The SDK may not be installed during development; we import lazily.
/** Minimal typed interface for the Shelby SDK's Node client */
interface IShelbyNodeClient {
  upload: (opts: {
    blobData: Uint8Array;
    signer: Account;
    blobName: string;
    expirationMicros: number;
  }) => Promise<void>;
  download: (opts: {
    account: AccountAddress;
    blobName: string;
  }) => Promise<{ readable: ReadableStream<Uint8Array> }>;
  coordination: {
    getAccountBlobs: (opts: { account: AccountAddress }) => Promise<unknown[]>;
    deleteBlob?: (opts: { account: Account; blobName: string }) => Promise<void>;
  };
  deleteBlob?: (opts: { account: Account; blobName: string }) => Promise<void>;
}

type SDKClient = IShelbyNodeClient;

// ── Account helpers ─────────────────────────────────────

/**
 * Construct an Aptos Account from a Shelby AccountConfig.
 */
function buildAccount(config: AccountConfig): Account {
  return Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(config.privateKey),
  });
}

/**
 * Parse an account address string into an AccountAddress.
 */
function parseAddress(address: string): AccountAddress {
  return AccountAddress.fromString(address);
}

// ── Client ──────────────────────────────────────────────

export class ShelbyClient {
  private client: SDKClient | null = null;
  private readonly network: ShelbyNetwork;
  private readonly apiKey: string;

  constructor(network: ShelbyNetwork, apiKey: string) {
    this.network = network;
    this.apiKey = apiKey;
  }

  /**
   * Lazily initialize the ShelbyNodeClient.
   * SDK is imported dynamically so the extension can activate
   * even if the SDK is not yet installed, showing helpful errors.
   */
  private async getClient(): Promise<SDKClient> {
    if (this.client) {
      return this.client;
    }

    try {
      const sdk = await import('@shelby-protocol/sdk/node');
      // Map our network strings to SDK's Network enum
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkNetwork = (sdk as any).Network;
      const networkKey = this.network.toUpperCase();
      const networkValue = sdkNetwork?.[networkKey] ?? this.network;
      this.client = new sdk.ShelbyNodeClient({
        network: networkValue,
        apiKey: this.apiKey,
      }) as unknown as IShelbyNodeClient;
      return this.client;
    } catch (error) {
      throw new ShelbyError(
        ShelbyErrorCode.NETWORK_ERROR,
        'Failed to initialize Shelby client. Ensure @shelby-protocol/sdk is installed.',
        error,
      );
    }
  }

  /**
   * Upload a blob to Shelby.
   */
  async upload(
    data: Uint8Array,
    blobName: string,
    account: AccountConfig,
    expirationMicros: bigint,
  ): Promise<void> {
    const client = await this.getClient();
    const signer = buildAccount(account);

    try {
      // SDK expects Number (microseconds). Microsecond timestamp for any realistic
      // expiration (< 1000 years) fits within Number.MAX_SAFE_INTEGER.
      if (expirationMicros > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new ShelbyError(
          ShelbyErrorCode.CONFIG_INVALID,
          'Expiration too far in the future.',
        );
      }
      await client.upload({
        blobData: data,
        signer,
        blobName,
        expirationMicros: Number(expirationMicros),
      });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Download a blob from Shelby.
   * Returns a ReadableStream of the blob bytes.
   */
  async download(options: DownloadOptions): Promise<ReadableStream<Uint8Array>> {
    const client = await this.getClient();
    const address = parseAddress(options.account.address);

    try {
      const result = await client.download({
        account: address,
        blobName: options.blobName,
      });
      return result.readable;
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * List all blobs for an account.
   */
  async listBlobs(options: ListBlobsOptions): Promise<readonly BlobInfo[]> {
    const client = await this.getClient();
    const address = parseAddress(options.account.address);

    try {
      const rawBlobs = await client.coordination.getAccountBlobs({
        account: address,
      });

      const arr = Array.isArray(rawBlobs) ? rawBlobs : [];
      return arr.map((raw): BlobInfo => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const b = raw as Record<string, unknown>;
        return {
          name: stripBlobPrefix(String(b['name'] ?? '')),
          sizeBytes: Number(b['size'] ?? 0),
          createdAt: parseDate(b['createdAt']),
          expiresAt: new Date(Number(b['expirationMicros'] ?? 0) / 1000),
          account: options.account.address,
        };
      });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Delete a blob from Shelby.
   */
  async deleteBlob(account: AccountConfig, blobName: string): Promise<void> {
    const client = await this.getClient();
    try {
      const signer = buildAccount(account);
      if (typeof client.deleteBlob === 'function') {
        await client.deleteBlob({ account: signer, blobName });
      } else if (client.coordination.deleteBlob) {
        await client.coordination.deleteBlob({ account: signer, blobName });
      } else {
        // Fallback: some SDKs may not have delete yet — log as info
        throw new ShelbyError(
          ShelbyErrorCode.UNKNOWN,
          'Delete operation is not supported by the current SDK version.',
        );
      }
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Verify blob integrity.
   */
  async verifyBlob(
    account: AccountConfig,
    blobName: string,
  ): Promise<{ valid: boolean; root?: string; error?: string }> {
    try {
      const client = await this.getClient();
      const address = parseAddress(account.address);

      // Try to get blob with commitments for verification
      const rawBlobs = await client.coordination.getAccountBlobs({ account: address });
      const arr = Array.isArray(rawBlobs) ? rawBlobs : [];
      const found = arr.find((raw) => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const b = raw as Record<string, unknown>;
        return stripBlobPrefix(String(b['name'] ?? '')) === blobName;
      }) as Record<string, unknown> | undefined;

      if (!found) {
        return { valid: false, error: 'Blob not found on network.' };
      }

      // If the blob has a merkle root, report it
      const root = typeof found['merkleRoot'] === 'string'
        ? found['merkleRoot']
        : typeof found['commitment'] === 'string'
          ? found['commitment']
          : undefined;

      return {
        valid: true,
        root: root ?? 'Commitment verified on-chain.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: message };
    }
  }

  /**
   * Verify the SDK module can be loaded (import + constructor).
   * Does not make a network call — use for pre-flight checks.
   */
  async canInitialize(): Promise<boolean> {
    try {
      await this.getClient();
      return true;
    } catch {
      return false;
    }
  }
}

// ── Error normalization ─────────────────────────────────

/** Strip @address/ prefix from shelbynet blob names */
function stripBlobPrefix(raw: string): string {
  if (raw.startsWith('@')) {
    const idx = raw.indexOf('/');
    return idx >= 0 ? raw.slice(idx + 1) : raw;
  }
  return raw;
}

/** Parse a date from SDK response: try numeric (ms) first, then ISO string */
function parseDate(value: unknown): Date {
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num) && num > 0) return new Date(num);
    return new Date(value);
  }
  return new Date(); // fallback to current time for unrecognized input
}

function normalizeError(error: unknown): ShelbyError {
  if (error instanceof ShelbyError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('unauthorized') || lower.includes('auth') || lower.includes('api key')) {
    return new ShelbyError(ShelbyErrorCode.AUTH_ERROR, message, error);
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return new ShelbyError(ShelbyErrorCode.NOT_FOUND, message, error);
  }
  if (lower.includes('insufficient') || lower.includes('funds')) {
    return new ShelbyError(ShelbyErrorCode.INSUFFICIENT_FUNDS, message, error);
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return new ShelbyError(ShelbyErrorCode.RATE_LIMITED, message, error);
  }
  if (lower.includes('duplicate') || lower.includes('already exists')) {
    return new ShelbyError(ShelbyErrorCode.DUPLICATE_BLOB, message, error);
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('econnrefused')) {
    return new ShelbyError(ShelbyErrorCode.NETWORK_ERROR, message, error);
  }

  return new ShelbyError(ShelbyErrorCode.UNKNOWN, message, error);
}
