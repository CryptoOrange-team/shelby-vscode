# Shelby VS Code Extension

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=shelby-protocol.shelby-vscode)

**Decentralized hot storage for Web3** — upload, download, and browse blobs on the Shelby network, directly from VS Code.

## Features

- **📁 Blob Explorer** — Browse your Shelby blobs in a sidebar tree view
- **⬆️ Upload** — Upload files from the explorer or command palette
- **⬇️ Download** — Download blobs with a click
- **🖥️ Blob Browser** — Rich webview panel with drag-and-drop upload
- **📝 Snippets** — Code snippets for Shelby SDK (`shelby-init`, `shelby-upload`, etc.)
- **🔧 Configuration** — Manage API keys, accounts, and network in VS Code settings
- **✅ Diagnostics** — Real-time validation of Shelby configuration
- **📊 Status Bar** — See network status at a glance

## Getting Started

### Prerequisites

- [Shelby API key](https://docs.shelby.xyz)
- [Aptos account](https://aptos.dev) with private key
- VS Code 1.96+

### Setup

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (`Ctrl+Shift+P`) and run **Shelby: Initialize Config**
3. Follow the guided setup to enter your API key and account details

Or configure manually in VS Code `settings.json`:

```json
{
  "shelby.apiKey": "sk-your-api-key",
  "shelby.network": "testnet",
  "shelby.accounts": [
    {
      "name": "my-account",
      "address": "0x...",
      "privateKey": "0x..."
    }
  ],
  "shelby.defaultAccount": "my-account",
  "shelby.defaultExpirationDays": 30
}
```

### Usage

| Action | How |
|--------|-----|
| Upload a file | Right-click a file → **Upload to Shelby**, or `Ctrl+Shift+P` → **Shelby: Upload Blob** |
| Download a blob | Click a blob in the explorer, or `Ctrl+Shift+P` → **Shelby: Download Blob** |
| List blobs | `Ctrl+Shift+P` → **Shelby: List Blobs**, or expand an account in the sidebar |
| Open browser | `Ctrl+Shift+P` → **Shelby: Open Blob Browser** |
| Add account | `Ctrl+Shift+P` → **Shelby: Configure Account** |
| Insert snippet | Type `shelby-` in a `.ts` or `.js` file and select from completions |

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `shelby.apiKey` | string | `""` | API key for Shelby node access |
| `shelby.network` | `"mainnet" \| "testnet" \| "devnet"` | `"testnet"` | Shelby network |
| `shelby.accounts` | array | `[]` | Configured accounts |
| `shelby.defaultAccount` | string | `""` | Default account for operations |
| `shelby.defaultExpirationDays` | number | `30` | Default blob expiration |
| `shelby.showStatusBar` | boolean | `true` | Show status bar indicator |

## Commands

| Command | ID |
|---------|-----|
| Shelby: Upload Blob | `shelby.upload` |
| Shelby: Download Blob | `shelby.download` |
| Shelby: List Blobs | `shelby.listBlobs` |
| Shelby: Initialize Config | `shelby.init` |
| Shelby: Configure Account | `shelby.configureAccount` |
| Shelby: Open Blob Browser | `shelby.openBrowser` |
| Shelby: Validate Configuration | `shelby.validateConfig` |
| Shelby: Refresh Explorer | `shelby.refreshTree` |

## Code Snippets

| Prefix | Description |
|--------|-------------|
| `shelby-init` | Initialize Shelby client |
| `shelby-upload` | Upload a blob |
| `shelby-download` | Download a blob |
| `shelby-list` | List account blobs |
| `shelby-account` | Create an Aptos account |

## Development

```bash
# Install dependencies
npm install

# Build
npm run compile

# Watch mode
npm run watch

# Run extension (F5 in VS Code)

# Run tests
npm test

# Package for distribution
npm run package
```

## License

MIT
