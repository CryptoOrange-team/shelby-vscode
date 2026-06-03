/**
 * Core domain types for Shelby protocol.
 *
 * These types model the Shelby decentralized storage domain.
 * No runtime imports — pure type declarations only.
 */

/** Shelby network environments */
export type ShelbyNetwork = 'devnet' | 'mainnet' | 'shelbynet' | 'testnet';

/** A configured Shelby account */
export interface AccountConfig {
  readonly name: string;
  readonly address: string;
  readonly privateKey: string;
}

/** Full Shelby extension configuration */
export interface ShelbyConfig {
  readonly apiKey: string;
  readonly network: ShelbyNetwork;
  readonly accounts: readonly AccountConfig[];
  readonly defaultAccount: string;
  readonly defaultExpirationDays: number;
  readonly showStatusBar: boolean;
}

/** Metadata for a blob stored on Shelby */
export interface BlobInfo {
  readonly name: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly account: string;
}

/** Options for downloading a blob */
export interface DownloadOptions {
  readonly account: AccountConfig;
  readonly blobName: string;
}

/** Options for listing blobs */
export interface ListBlobsOptions {
  readonly account: AccountConfig;
}

/** Status of the Shelby connection */
export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

/** Configuration validation diagnostic */
export interface ConfigDiagnostic {
  readonly field: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

/** Shelby-specific error codes */
export enum ShelbyErrorCode {
  AUTH_ERROR = 'AUTH_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  RATE_LIMITED = 'RATE_LIMITED',
  CONFIG_INVALID = 'CONFIG_INVALID',
  DUPLICATE_BLOB = 'DUPLICATE_BLOB',
  UNKNOWN = 'UNKNOWN',
}

/** Typed error for Shelby operations */
export class ShelbyError extends Error {
  public readonly code: ShelbyErrorCode;
  public readonly details?: unknown;

  constructor(code: ShelbyErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ShelbyError';
    this.code = code;
    this.details = details;
  }
}
