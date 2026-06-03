/**
 * Integration tests for extension activation.
 *
 * These tests run inside the VS Code Extension Host.
 * They verify that the extension activates and registers commands.
 */
import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Extension Activation', () => {
  test('extension should be present', async () => {
    const ext = vscode.extensions.getExtension('shelby-protocol.shelby-vscode');
    assert.ok(ext, 'Extension should be installed');
  });

  test('should activate', async () => {
    const ext = vscode.extensions.getExtension('shelby-protocol.shelby-vscode');
    if (!ext) {
      assert.fail('Extension not found');
      return;
    }
    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  test('should have all commands registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    const shelbyCommands = commands.filter((c) => c.startsWith('shelby.'));

    const expected = [
      'shelby.upload', 'shelby.download', 'shelby.listBlobs',
      'shelby.deleteBlob', 'shelby.refreshTree',
      'shelby.init', 'shelby.configureAccount',
      'shelby.connect', 'shelby.disconnect', 'shelby.switchNetwork',
      'shelby.faucet', 'shelby.copyUrl', 'shelby.verifyIntegrity',
      'shelby.openBrowser', 'shelby.validateConfig',
    ];

    for (const cmd of expected) {
      assert.ok(shelbyCommands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });
});
