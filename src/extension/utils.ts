/**
 * Shared UI utilities used across extension commands.
 */
import * as vscode from 'vscode';
import { ShelbyError } from '../types/shelby';
import type { ShelbyConfig } from '../types/shelby';

// ── Formatting ─────────────────────────────────────────

/** Format bytes into human-readable string */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

// ── Error Messages ─────────────────────────────────────

/** Extract a human-readable message from any error */
export function errorMessage(error: unknown): string {
  if (error instanceof ShelbyError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Show a error notification with a prefixed message */
export function showError(prefix: string, error: unknown): void {
  void vscode.window.showErrorMessage(`${prefix}: ${errorMessage(error)}`);
}

// ── Validation ─────────────────────────────────────────

/** Regex for hex strings (0x prefix optional) */
export function isValidHex(value: string): boolean {
  const trimmed = value.trim();
  // Must have at least one hex char after optional 0x prefix
  return /^(0x)?[0-9a-fA-F]+$/.test(trimmed) && (trimmed.startsWith('0x') ? trimmed.length > 2 : trimmed.length > 0);
}

/** Input validator for hex fields */
export function hexValidator(fieldName: string, minHexLength?: number): (value: string) => string | null {
  return (value: string) => {
    if (value.trim().length === 0) return `${fieldName} is required`;
    if (!isValidHex(value)) return `${fieldName} must be a valid hex string (e.g., 0x...)`;
    if (minHexLength !== undefined && value.trim().replace(/^0x/, '').length < minHexLength) {
      return `${fieldName} appears too short (expected ${minHexLength} hex chars)`;
    }
    return null;
  };
}

// ── Tree Item Helpers ───────────────────────────────────

/** Extract account/blob info from a command argument (TreeItem or plain object) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractBlobArg(item: any): { account?: string; blobName?: string } {
  if (!item) return {};
  let account: string | undefined;
  let blobName: string | undefined;
  // TreeItem with command.arguments (most reliable)
  if (item.command?.arguments?.[0]?.account && item.command.arguments[0].blobName) {
    account = item.command.arguments[0].account;
    blobName = item.command.arguments[0].blobName;
  }
  // TreeItem with direct properties
  else if (item.blobAccount && item.blobName) {
    account = item.blobAccount;
    blobName = item.blobName;
  }
  // Plain object
  else if (item.account && item.blobName) {
    account = item.account;
    blobName = item.blobName;
  }
  // Strip @address/ prefix from shelbynet blob names
  if (blobName && blobName.startsWith('@')) {
    const slashIdx = blobName.indexOf('/');
    if (slashIdx >= 0) blobName = blobName.slice(slashIdx + 1);
  }
  return { account, blobName };
}

// ── Account Picker ─────────────────────────────────────

/** Prompt the user to select an account from the configured list */
export async function pickAccount(config: ShelbyConfig): Promise<string | undefined> {
  if (config.accounts.length === 0) {
    void vscode.window.showWarningMessage(
      'No Shelby accounts configured. Add one in settings (shelby.accounts) or run "Shelby: Configure Account".',
    );
    return undefined;
  }

  if (config.accounts.length === 1 && config.defaultAccount && config.accounts[0]?.name) {
    return config.accounts[0].name;
  }

  const items = config.accounts.map((a) => ({
    label: a.name,
    description: a.address.slice(0, 12) + '...',
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select account',
  });
  return picked?.label;
}
