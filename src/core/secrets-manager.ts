/**
 * Secrets Manager — stores Ed25519 private keys in VS Code SecretStorage.
 *
 * SecretStorage uses OS-level encryption:
 *   Windows → Credential Store (DPAPI)
 *   macOS   → Keychain
 *   Linux   → libsecret (GNOME Keyring / KDE Wallet)
 *
 * Plain account metadata (name, address) stays in VS Code settings.
 * Private keys are stored separately with key: "shelby.key.{accountName}"
 */

import type { AccountConfig } from '../types/shelby';

const SECRET_KEY_PREFIX = 'shelby.key.';

/**
 * Build the secret storage key for an account.
 */
function secretKey(accountName: string): string {
  return `${SECRET_KEY_PREFIX}${accountName}`;
}

/**
 * SecretsManager wraps VS Code's SecretStorage for secure key management.
 */
export class SecretsManager {
  /**
   * Store a private key in SecretStorage.
   */
  static async storeKey(
    secrets: SecretsAPI,
    accountName: string,
    privateKey: string,
  ): Promise<void> {
    await secrets.store(secretKey(accountName), privateKey);
  }

  /**
   * Retrieve a private key from SecretStorage.
   * Returns an empty string if not found.
   */
  static async getKey(
    secrets: SecretsAPI,
    accountName: string,
  ): Promise<string> {
    return (await secrets.get(secretKey(accountName))) ?? '';
  }

  /**
   * Delete a private key from SecretStorage.
   */
  static async deleteKey(
    secrets: SecretsAPI,
    accountName: string,
  ): Promise<void> {
    await secrets.delete(secretKey(accountName));
  }

  /**
   * Hydrate AccountConfig[] with private keys from SecretStorage.
   * Takes accounts with name/address only, fills in privateKey from secrets.
   */
  static async hydrateAccounts(
    secrets: SecretsAPI,
    accounts: readonly Omit<AccountConfig, 'privateKey'>[],
  ): Promise<AccountConfig[]> {
    const result: AccountConfig[] = [];
    for (const acct of accounts) {
      const privateKey = await SecretsManager.getKey(secrets, acct.name);
      result.push({
        name: acct.name,
        address: acct.address,
        privateKey,
      });
    }
    return result;
  }

  /**
   * Save a full account: metadata in settings, private key in SecretStorage.
   * Returns the settings-safe account (without privateKey).
   */
  static async saveAccount(
    secrets: SecretsAPI,
    account: AccountConfig,
  ): Promise<Omit<AccountConfig, 'privateKey'>> {
    await SecretsManager.storeKey(secrets, account.name, account.privateKey);
    return { name: account.name, address: account.address };
  }

  /**
   * Remove an account from both settings and SecretStorage.
   */
  static async removeAccount(
    secrets: SecretsAPI,
    accountName: string,
  ): Promise<void> {
    await SecretsManager.deleteKey(secrets, accountName);
  }
}

/**
 * Interface matching vscode.SecretStorage shape.
 * Avoids importing 'vscode' in core layer while maintaining type safety.
 */
export interface SecretsAPI {
  get: (key: string) => Thenable<string | undefined>;
  store: (key: string, value: string) => Thenable<void>;
  delete: (key: string) => Thenable<void>;
}
