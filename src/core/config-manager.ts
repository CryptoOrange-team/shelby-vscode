/**
 * Configuration manager for Shelby extension.
 *
 * Reads configuration from two sources (in priority order):
 * 1. VS Code workspace/user settings (shelby.*)
 * 2. ~/.shelby/config.yaml (CLI config file)
 *
 * Returns frozen (immutable) ShelbyConfig snapshots.
 * ZERO imports from 'vscode' in the type layer.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  AccountConfig,
  ShelbyConfig,
  ShelbyNetwork,
} from '../types/shelby';

export const VALID_NETWORKS: readonly ShelbyNetwork[] = ['mainnet', 'testnet', 'devnet', 'shelbynet'];

function isValidNetwork(value: string): value is ShelbyNetwork {
  return (VALID_NETWORKS as readonly string[]).includes(value);
}

// ── YAML config path ────────────────────────────────────

function shelbyConfigPath(): string {
  return path.join(os.homedir(), '.shelby', 'config.yaml');
}

// ── YAML parsing (minimal, avoids dependency on js-yaml) ─

interface YamlAccount {
  name?: string;
  address?: string;
  private_key?: string;
}

function parseSimpleYaml(content: string): {
  accounts: YamlAccount[];
  network?: string | undefined;
  default_account?: string | undefined;
} {
  const accounts: YamlAccount[] = [];
  const current: Record<string, string> = {};
  let inAccounts = false;
  let network: string | undefined;
  let defaultAccount: string | undefined;
  let pendingFlush = false;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Top-level key: value (outside accounts)
    const topColon = trimmed.indexOf(':');
    const isTopLevel = raw.length > 0 && !raw.startsWith(' ') && !raw.startsWith('-') && !raw.startsWith('\t');

    if (isTopLevel && topColon > 0) {
      const key = trimmed.substring(0, topColon).trim();
      const value = trimmed.substring(topColon + 1).trim();
      if (key === 'network') { network = value; }
      else if (key === 'default_account') { defaultAccount = value; }
      else if (key === 'accounts') { inAccounts = true; }
      continue;
    }

    // Account list entry: "- name: acc1"
    const isDashField = trimmed.startsWith('-') && topColon > 1;
    if (inAccounts && isDashField) {
      if (pendingFlush && Object.keys(current).length > 0) {
        accounts.push({ ...current });
        // Reset: create new accumulator object (immutable pattern)
        Object.assign(current, {});
        pendingFlush = false;
      }
      const key = trimmed.substring(1, topColon).trim();
      const value = trimmed.substring(topColon + 1).trim();
      current[key] = value;
      pendingFlush = true;
      continue;
    }

    // Indented continuation: "  address: 0x123" (within an account)
    const indentColon = trimmed.indexOf(':');
    if (inAccounts && pendingFlush && indentColon > 0 && raw.startsWith('  ') && !trimmed.startsWith('-')) {
      const key = trimmed.substring(0, indentColon).trim();
      const value = trimmed.substring(indentColon + 1).trim();
      current[key] = value;
    }
  }

  // Flush last account
  if (Object.keys(current).length > 0) {
    accounts.push({ ...current });
  }

  return { accounts, network, default_account: defaultAccount };
}

/**
 * Simplified settings interface — compatible with vscode.workspace.getConfiguration().
 * We use a wrapper function instead of trying to assign the vscode workspace object.
 */
export type SettingsReader = { get: <T>(section: string, defaultValue?: T) => T };

// ── Config Manager ──────────────────────────────────────

export class ConfigManager {
  /**
   * Read the merged configuration from VS Code settings + YAML file.
   * VS Code settings take precedence over YAML file values.
   */
  // Cache YAML parse result — read once per resolve call
  private static _yamlCache: { parsed: ReturnType<typeof parseSimpleYaml>; path: string; mtime: number } | null = null;

  private static readYamlOnce(): ReturnType<typeof parseSimpleYaml> {
    const yamlPath = shelbyConfigPath();
    try {
      if (!fs.existsSync(yamlPath)) return { accounts: [] };
      const stat = fs.statSync(yamlPath);
      if (this._yamlCache?.path === yamlPath && this._yamlCache.mtime === stat.mtimeMs) {
        return this._yamlCache.parsed;
      }
      const content = fs.readFileSync(yamlPath, 'utf-8');
      const parsed = parseSimpleYaml(content);
      this._yamlCache = { parsed, path: yamlPath, mtime: stat.mtimeMs };
      return parsed;
    } catch {
      return { accounts: [] };
    }
  }

  static resolve(settings: SettingsReader): ShelbyConfig {
    const apiKey = settings.get<string>('shelby.apiKey', '');
    const rawNetwork = settings.get<string>('shelby.network', 'testnet');
    const network = isValidNetwork(rawNetwork) ? rawNetwork : 'testnet';
    const defaultExpirationDays = settings.get<number>('shelby.defaultExpirationDays', 30);
    const showStatusBar = settings.get<boolean>('shelby.showStatusBar', true);
    const defaultAccount = settings.get<string>('shelby.defaultAccount', '');

    // Read accounts from VS Code settings
    const settingsAccounts = settings.get<AccountConfig[]>('shelby.accounts', []);

    // Merge with YAML config (VS Code settings take precedence)
    const yamlAccounts = ConfigManager.readYamlAccounts();
    const accounts = settingsAccounts.length > 0
      ? settingsAccounts
      : yamlAccounts;

    // Determine default account: VS Code setting > YAML > first account
    const resolvedDefault = defaultAccount
      || ConfigManager.readYamlDefaultAccount()
      || (accounts.length > 0 ? accounts[0]?.name ?? '' : '');

    const config: ShelbyConfig = {
      apiKey,
      network,
      accounts,
      defaultAccount: resolvedDefault,
      defaultExpirationDays,
      showStatusBar,
    };

    return Object.freeze(config);
  }

  /**
   * Read accounts from ~/.shelby/config.yaml.
   */
  private static readYamlAccounts(): AccountConfig[] {
    const parsed = ConfigManager.readYamlOnce();
    return parsed.accounts.map((a) => ({
      name: a.name ?? a.address ?? 'unknown',
      address: a.address ?? '',
      privateKey: a.private_key ?? '',
    }));
  }

  private static readYamlDefaultAccount(): string {
    const parsed = ConfigManager.readYamlOnce();
    return parsed.default_account ?? '';
  }

  /**
   * Find an account by name in the config.
   * Returns undefined if not found.
   */
  static findAccount(
    config: ShelbyConfig,
    accountName: string,
  ): AccountConfig | undefined {
    return config.accounts.find(
      (a) => a.name === accountName || a.address === accountName,
    );
  }

  /**
   * Calculate expiration microseconds from days from now.
   */
  static expirationFromDays(days: number): bigint {
    const nowMs = Date.now();
    const expiresMs = nowMs + days * 24 * 60 * 60 * 1000;
    return BigInt(expiresMs) * 1000n;
  }
}
