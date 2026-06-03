/**
 * Pure functions returning snippet body data.
 *
 * These functions generate snippet insertion text for Shelby SDK patterns.
 * No VS Code imports — pure string templates.
 */

export interface Snippet {
  readonly prefix: string;
  readonly description: string;
  readonly body: readonly string[];
}

/**
 * All Shelby TypeScript snippets.
 */
export function getTypeScriptSnippets(): readonly Snippet[] {
  return [
    {
      prefix: 'shelby-init',
      description: 'Shelby: Initialize Client',
      body: [
        "import { ShelbyNodeClient } from '@shelby-protocol/sdk/node';",
        "import { Account, AccountAddress, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk';",
        '',
        'const client = new ShelbyNodeClient({',
        "  network: Network.${1|MAINNET,TESTNET,DEVNET|},",
        "  apiKey: process.env.SHELBY_API_KEY ?? '${2:YOUR_API_KEY}'",
        '});',
      ],
    },
    {
      prefix: 'shelby-upload',
      description: 'Shelby: Upload Blob',
      body: [
        "import { readFileSync } from 'node:fs';",
        '',
        "const blobData = readFileSync('${1:./path/to/file}');",
        'const signer = Account.fromPrivateKey({',
        "  privateKey: new Ed25519PrivateKey(process.env.SHELBY_PRIVATE_KEY ?? '${2:PRIVATE_KEY}')",
        '});',
        '',
        'const expirationMicros = BigInt(Date.now() + ${3:30} * 24 * 60 * 60 * 1000) * 1000n;',
        '',
        'await client.upload({',
        '  blobData,',
        '  signer,',
        "  blobName: '${4:my-blob}',",
        '  expirationMicros,',
        '});',
      ],
    },
    {
      prefix: 'shelby-download',
      description: 'Shelby: Download Blob',
      body: [
        "import { createWriteStream } from 'node:fs';",
        "import { Readable } from 'node:stream';",
        "import { pipeline } from 'node:stream/promises';",
        '',
        "const accountAddress = AccountAddress.fromString('${1:ACCOUNT_ADDRESS}');",
        '',
        "const { readable } = await client.download({",
        '  account: accountAddress,',
        "  blobName: '${2:my-blob}'",
        '});',
        '',
        "// readable is a ReadableStream<Uint8Array>",
        "await pipeline(Readable.fromWeb(readable), createWriteStream('${3:./output}'));",
      ],
    },
    {
      prefix: 'shelby-list',
      description: 'Shelby: List Blobs',
      body: [
        "const address = AccountAddress.fromString('${1:ACCOUNT_ADDRESS}');",
        '',
        'const blobs = await client.coordination.getAccountBlobs({',
        '  account: address,',
        '});',
        '',
        'for (const blob of blobs) {',
        '  console.log(`  ${blob.name} — ${blob.size} bytes`);',
        '}',
      ],
    },
    {
      prefix: 'shelby-account',
      description: 'Shelby: Create Account',
      body: [
        "import { Account, AccountAddress, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';",
        '',
        'const account = Account.fromPrivateKey({',
        "  privateKey: new Ed25519PrivateKey('${1:PRIVATE_KEY_HEX}')",
        '});',
        '',
        "const address = account.accountAddress.toString();",
        "console.log('Account address:', address);",
      ],
    },
  ];
}
