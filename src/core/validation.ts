/**
 * Configuration validation.
 *
 * Pure functions: validateConfig(config: ShelbyConfig) → ConfigDiagnostic[]
 * No VS Code imports — returns simple diagnostic objects that the UI layer
 * maps to vscode.Diagnostic instances.
 */

import { VALID_NETWORKS } from './config-manager';
import type { ConfigDiagnostic, ShelbyConfig } from '../types/shelby';

/**
 * Validate a ShelbyConfig and return any issues found.
 * Returns an empty array if configuration is valid.
 */
export function validateConfig(config: ShelbyConfig): readonly ConfigDiagnostic[] {
  const diagnostics: ConfigDiagnostic[] = [];

  // Check API key
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    diagnostics.push({
      field: 'shelby.apiKey',
      severity: 'warning',
      message:
        'Shelby API key is not set. Upload, download, and list operations will fail. ' +
        'Set it in VS Code settings (shelby.apiKey) or via `shelby init`.',
    });
  }

  // Check accounts
  if (config.accounts.length === 0) {
    diagnostics.push({
      field: 'shelby.accounts',
      severity: 'warning',
      message:
        'No Shelby accounts configured. Add at least one account in VS Code settings ' +
        '(shelby.accounts) or via `shelby init`.',
    });
  }

  // Validate each account
  for (const account of config.accounts) {
    if (!account.name) {
      diagnostics.push({
        field: 'shelby.accounts',
        severity: 'error',
        message: 'An account is missing its "name" field.',
      });
    }
    if (!account.address || account.address.trim().length === 0) {
      diagnostics.push({
        field: 'shelby.accounts',
        severity: 'error',
        message: `Account "${account.name || '(unnamed)'}" is missing its "address" field.`,
      });
    } else if (!isValidHex(account.address)) {
      diagnostics.push({
        field: 'shelby.accounts',
        severity: 'warning',
        message:
          `Account "${account.name}" has an address that does not look like a valid hex string.`,
      });
    }
    if (!account.privateKey || account.privateKey.trim().length === 0) {
      diagnostics.push({
        field: 'shelby.accounts',
        severity: 'error',
        message: `Account "${account.name}" is missing its "privateKey" field.`,
      });
    } else if (!isValidHex(account.privateKey)) {
      diagnostics.push({
        field: 'shelby.accounts',
        severity: 'warning',
        message:
          `Account "${account.name}" has a privateKey that does not look like a valid hex string.`,
      });
    }
  }

  // Validate network
  if (!(VALID_NETWORKS as readonly string[]).includes(config.network)) {
    diagnostics.push({
      field: 'shelby.network',
      severity: 'error',
      message: `Network must be one of: ${VALID_NETWORKS.join(', ')}. Got "${config.network}".`,
    });
  }

  // Validate default account reference
  if (config.defaultAccount && config.accounts.length > 0) {
    const found = config.accounts.some(
      (a) => a.name === config.defaultAccount || a.address === config.defaultAccount,
    );
    if (!found) {
      diagnostics.push({
        field: 'shelby.defaultAccount',
        severity: 'warning',
        message:
          `Default account "${config.defaultAccount}" is not found in the configured accounts list. ` +
          'Operations will fail until a valid default account is set.',
      });
    }
  }

  // Validate expiration days
  if (config.defaultExpirationDays < 1) {
    diagnostics.push({
      field: 'shelby.defaultExpirationDays',
      severity: 'error',
      message: 'Default expiration must be at least 1 day.',
    });
  }
  if (config.defaultExpirationDays > 365) {
    diagnostics.push({
      field: 'shelby.defaultExpirationDays',
      severity: 'warning',
      message: 'Default expiration exceeds 365 days. Consider a shorter duration for cost savings.',
    });
  }

  return diagnostics;
}

/**
 * Check if a string looks like valid hex.
 */
export function isValidHex(value: string): boolean {
  const trimmed = value.trim();
  return /^(0x)?[0-9a-fA-F]+$/.test(trimmed) &&
    (trimmed.startsWith('0x') ? trimmed.length > 2 : trimmed.length > 0);
}
