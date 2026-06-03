/**
 * Unit tests for ConfigManager.
 *
 * Tests config resolution and helper logic WITHOUT VS Code.
 */
import * as assert from 'node:assert';
import { ConfigManager } from '../../core/config-manager';
import type { SettingsReader } from '../../core/config-manager';
import type { AccountConfig } from '../../types/shelby';

suite('ConfigManager', () => {
  suite('resolve', () => {
    test('returns config with VS Code settings values', () => {
      const settings = makeSettings({
        'shelby.apiKey': 'sk-test',
        'shelby.network': 'testnet',
        'shelby.accounts': [
          { name: 'acc1', address: '0x123', privateKey: '0xabc' },
        ],
        'shelby.defaultAccount': 'acc1',
        'shelby.defaultExpirationDays': 60,
        'shelby.showStatusBar': true,
      });

      const config = ConfigManager.resolve(settings);

      assert.strictEqual(config.apiKey, 'sk-test');
      assert.strictEqual(config.network, 'testnet');
      assert.strictEqual(config.accounts.length, 1);
      assert.strictEqual(config.accounts[0]?.name, 'acc1');
      assert.strictEqual(config.defaultAccount, 'acc1');
      assert.strictEqual(config.defaultExpirationDays, 60);
      assert.strictEqual(config.showStatusBar, true);
    });

    test('uses defaults when settings are empty', () => {
      const settings = makeSettings({});
      const config = ConfigManager.resolve(settings);

      assert.strictEqual(config.apiKey, '');
      assert.strictEqual(config.network, 'testnet');
      assert.strictEqual(config.accounts.length, 0);
      assert.strictEqual(config.defaultAccount, '');
      assert.strictEqual(config.defaultExpirationDays, 30);
    });

    test('defaultAccount falls back to first account name', () => {
      const settings = makeSettings({
        'shelby.accounts': [
          { name: 'first', address: '0x1', privateKey: '0xa' },
          { name: 'second', address: '0x2', privateKey: '0xb' },
        ],
        'shelby.defaultAccount': '',
      });

      const config = ConfigManager.resolve(settings);
      assert.strictEqual(config.defaultAccount, 'first');
    });
  });

  suite('findAccount', () => {
    const accounts: readonly AccountConfig[] = [
      { name: 'alice', address: '0xaaa', privateKey: '0x111' },
      { name: 'bob', address: '0xbbb', privateKey: '0x222' },
    ];

    const config = Object.freeze({
      apiKey: 'key',
      network: 'testnet' as const,
      accounts,
      defaultAccount: 'alice',
      defaultExpirationDays: 30,
      showStatusBar: true,
    });

    test('finds account by name', () => {
      const found = ConfigManager.findAccount(config, 'alice');
      assert.ok(found);
      assert.strictEqual(found?.address, '0xaaa');
    });

    test('finds account by address', () => {
      const found = ConfigManager.findAccount(config, '0xbbb');
      assert.ok(found);
      assert.strictEqual(found?.name, 'bob');
    });

    test('returns undefined for missing account', () => {
      const found = ConfigManager.findAccount(config, 'charlie');
      assert.strictEqual(found, undefined);
    });
  });

  suite('expirationFromDays', () => {
    test('returns microseconds in the future', () => {
      const micros = ConfigManager.expirationFromDays(1);
      const nowMicros = BigInt(Date.now()) * 1000n;
      assert.ok(micros > nowMicros, 'Expiration should be in the future');
    });

    test('scales linearly with days', () => {
      const one = ConfigManager.expirationFromDays(1);
      const two = ConfigManager.expirationFromDays(2);
      // two should be ~double one, minus the fixed Date.now() offset
      assert.ok(two > one, '2 days should be greater than 1 day');
    });
  });
});

// ── Helpers ──────────────────────────────────────────────

function makeSettings(values: Record<string, unknown>): SettingsReader {
  return {
    get<T>(section: string, defaultValue?: T): T {
      return (values[section] ?? defaultValue) as T;
    },
  };
}
