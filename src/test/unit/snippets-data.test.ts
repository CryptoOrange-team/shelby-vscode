/**
 * Unit tests for snippet data generators.
 */
import * as assert from 'node:assert';
import { getTypeScriptSnippets } from '../../core/snippets-data';

suite('snippets-data', () => {
  suite('getTypeScriptSnippets', () => {
    test('returns 5 snippets', () => {
      const snippets = getTypeScriptSnippets();
      assert.strictEqual(snippets.length, 5);
    });

    test('each snippet has required fields', () => {
      const snippets = getTypeScriptSnippets();
      for (const s of snippets) {
        assert.ok(s.prefix, `Snippet "${s.description}" missing prefix`);
        assert.ok(s.prefix.startsWith('shelby-'), `Prefix should start with "shelby-": ${s.prefix}`);
        assert.ok(s.description, `Snippet missing description`);
        assert.ok(Array.isArray(s.body), `Snippet ${s.prefix} body should be array`);
        assert.ok(s.body.length > 0, `Snippet ${s.prefix} body should not be empty`);
      }
    });

    test('has expected prefixes', () => {
      const snippets = getTypeScriptSnippets();
      const prefixes = snippets.map((s) => s.prefix).sort();
      const expected = [
        'shelby-account',
        'shelby-download',
        'shelby-init',
        'shelby-list',
        'shelby-upload',
      ];
      assert.deepStrictEqual(prefixes, expected);
    });

    test('shelby-init snippet includes ShelbyNodeClient', () => {
      const snippets = getTypeScriptSnippets();
      const init = snippets.find((s) => s.prefix === 'shelby-init');
      assert.ok(init, 'Expected shelby-init snippet');
      const bodyStr = init!.body.join('\n');
      assert.ok(
        bodyStr.includes('ShelbyNodeClient'),
        'Expected ShelbyNodeClient in init snippet body',
      );
    });

    test('shelby-upload snippet includes client.upload', () => {
      const snippets = getTypeScriptSnippets();
      const upload = snippets.find((s) => s.prefix === 'shelby-upload');
      assert.ok(upload, 'Expected shelby-upload snippet');
      const bodyStr = upload!.body.join('\n');
      assert.ok(
        bodyStr.includes('client.upload'),
        'Expected client.upload call in upload snippet',
      );
    });
  });
});
