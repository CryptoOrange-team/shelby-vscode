/**
 * Mocha test suite loader.
 *
 * Loads all test files and runs them in the VS Code Extension Host.
 */
import * as path from 'node:path';
import Mocha from 'mocha';
import { glob } from 'node:fs/promises';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30000,
  });

  const testsRoot = path.resolve(__dirname, '..');

  // Load unit tests
  const unitFiles = glob('unit/**/*.test.js', { cwd: testsRoot });
  // Load suite tests
  const suiteFiles = glob('suite/**/*.test.js', { cwd: testsRoot });

  for await (const file of unitFiles) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  for await (const file of suiteFiles) {
    mocha.addFile(path.resolve(testsRoot, file));
  }

  try {
    await new Promise<void>((resolve, reject) => {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}
