/**
 * Unit tests for config validation.
 *
 * These tests run WITHOUT VS Code — pure logic tests.
 */
import * as assert from 'node:assert';
import { validateConfig } from '../../core/validation';
import type { ShelbyConfig } from '../../types/shelby';

suite('validateConfig', () => {
  const validConfig: ShelbyConfig = Object.freeze({
    apiKey: 'sk-test-key',
    network: 'testnet',
    accounts: [
      {
        name: 'my-account',
        address: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        privateKey: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
    ],
    defaultAccount: 'my-account',
    defaultExpirationDays: 30,
    showStatusBar: true,
  });

  test('returns no diagnostics for valid config', () => {
    const result = validateConfig(validConfig);
    assert.strictEqual(result.length, 0, 'Expected no diagnostics for valid config');
  });

  test('warns when API key is missing', () => {
    const config = { ...validConfig, apiKey: '' };
    const result = validateConfig(Object.freeze(config));
    const apiKeyDiag = result.find((d) => d.field === 'shelby.apiKey');
    assert.ok(apiKeyDiag, 'Expected diagnostic for missing API key');
    assert.strictEqual(apiKeyDiag?.severity, 'warning');
  });

  test('warns when no accounts configured', () => {
    const config = { ...validConfig, accounts: [], defaultAccount: '' };
    const result = validateConfig(Object.freeze(config));
    const accountsDiag = result.find((d) => d.field === 'shelby.accounts');
    assert.ok(accountsDiag, 'Expected diagnostic for missing accounts');
  });

  test('errors on missing account address', () => {
    const config = {
      ...validConfig,
      accounts: [{ name: 'bad', address: '', privateKey: '0xabc' }],
    };
    const result = validateConfig(Object.freeze(config));
    const addrDiag = result.find(
      (d) => d.severity === 'error' && d.message.includes('address'),
    );
    assert.ok(addrDiag, 'Expected error for missing address');
  });

  test('errors on missing private key', () => {
    const config = {
      ...validConfig,
      accounts: [{ name: 'bad', address: '0xabc', privateKey: '' }],
    };
    const result = validateConfig(Object.freeze(config));
    const pkDiag = result.find(
      (d) => d.severity === 'error' && d.message.includes('privateKey'),
    );
    assert.ok(pkDiag, 'Expected error for missing private key');
  });

  test('warns when default account references missing account', () => {
    const config = { ...validConfig, defaultAccount: 'nonexistent' };
    const result = validateConfig(Object.freeze(config));
    const defaultDiag = result.find((d) => d.field === 'shelby.defaultAccount');
    assert.ok(defaultDiag, 'Expected warning for bad default account');
  });

  test('errors on invalid network', () => {
    const config = { ...validConfig, network: 'invalid' as 'testnet' };
    const result = validateConfig(Object.freeze(config));
    const netDiag = result.find((d) => d.field === 'shelby.network');
    assert.ok(netDiag, 'Expected error for invalid network');
    assert.strictEqual(netDiag?.severity, 'error');
  });

  test('errors on expiration days less than 1', () => {
    const config = { ...validConfig, defaultExpirationDays: 0 };
    const result = validateConfig(Object.freeze(config));
    const expDiag = result.find((d) => d.field === 'shelby.defaultExpirationDays');
    assert.ok(expDiag, 'Expected error for invalid expiration');
  });

  test('warns on expiration days over 365', () => {
    const config = { ...validConfig, defaultExpirationDays: 400 };
    const result = validateConfig(Object.freeze(config));
    const expDiag = result.find((d) => d.field === 'shelby.defaultExpirationDays');
    assert.ok(expDiag, 'Expected warning for very long expiration');
  });
});
