# Shelby VS Code Extension

**Decentralized hot storage for Web3** — upload, download, and browse blobs on the Shelby network, directly from VS Code.

## Features

- **📁 Blob Explorer** — Browse your Shelby blobs in a sidebar tree view
- **⬆️ Upload** — Upload files from the explorer or command palette
- **⬇️ Download** — Download blobs with a click
- **🗑️ Delete** — Remove blobs with confirmation dialog
- **🔗 Copy URL** — Copy blob URLs in shelby://, https://, or explorer format
- **✅ Verify Integrity** — Check blob Merkle proofs on-chain
- **🖥️ Blob Browser** — Rich webview panel with drag-and-drop upload
- **📝 Code Snippets** — 5 snippets for Shelby SDK (`shelby-init`, `shelby-upload`, etc.)
- **🔧 Configuration** — Manage API keys, accounts, and network in VS Code settings
- **✅ Diagnostics** — Real-time validation of Shelby configuration in Problems panel
- **📊 Status Bar** — Network, wallet address, and offline queue status
- **🔐 SecretStorage** — Ed25519 private keys stored in OS-level encrypted storage
- **🛡️ Offline Queue** — Queue operations when offline, auto-flush on reconnect

---

## Quick Start (5 minutes)

### Prerequisites

| Requirement | Where to Get |
|-------------|--------------|
| VS Code 1.96+ | https://code.visualstudio.com |
| Shelby API Key | https://docs.shelby.xyz |
| Aptos Account | https://petra.app (browser extension) |
| Test APT (gas fee) | Shelby Faucet |
| ShelbyUSD (storage fee) | Shelby Faucet |

### Step 1: Get Tokens

1. Install [Petra Wallet](https://petra.app) browser extension
2. Create a wallet and switch network to **Shelbynet**
3. Visit the Shelby Faucet (accessible via the extension: `Ctrl+Shift+P` → `Shelby: Faucet`)
4. Fund your wallet address with **APT** and **ShelbyUSD** tokens

> You need both tokens: APT for gas fees, ShelbyUSD for storage fees.

### Step 2: Install Extension

**Option A: From .vsix file**
1. Download `shelby-vscode-0.2.0.vsix` from [GitHub Releases](https://github.com/CryptoOrange-team/shelby-vscode)
2. In VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...` → select the file

**Option B: From source**
```bash
git clone https://github.com/CryptoOrange-team/shelby-vscode.git
cd shelby-vscode
npm install --legacy-peer-deps
npm install got@^11.8.6 --legacy-peer-deps
```
Open the project in VS Code, press `F5` to launch Extension Development Host.

### Step 3: Configure

1. `Ctrl+Shift+P` → **Shelby: Initialize Config** → Guided Setup
2. Enter your:
   - **API Key** from Shelby
   - **Network**: `shelbynet` (for Shelby testnet) or `testnet` (for Aptos testnet)
   - **Account Name**: any display name (e.g. `my-wallet`)
   - **Address**: your Aptos wallet address (from Petra)
   - **Private Key**: exported from Petra wallet

> Private keys are auto-migrated to OS-level encrypted storage (Windows Credential Store / macOS Keychain / Linux libsecret).

### Step 4: Upload

1. `Ctrl+Alt+S U` or right-click any file → **Shelby: Upload Blob**
2. Select a file → confirm name → select account → set expiration
3. Success notification shows file size in bytes

### Step 5: Download

- Click a blob in the sidebar explorer, or
- `Ctrl+Alt+S D` → select account → select blob → choose save location

---

## Network Support

| Network | Description | Token |
|---------|-------------|-------|
| `shelbynet` | Shelby testnet (recommended for dev) | ShelbyUSD |
| `testnet` | Aptos testnet | APT |
| `mainnet` | Aptos mainnet | APT |
| `devnet` | Aptos devnet | APT |

Switch networks: `Ctrl+Alt+S N` or status bar click.

---

## Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| Shelby: Upload Blob | `Ctrl+Alt+S U` | Upload a file |
| Shelby: Download Blob | `Ctrl+Alt+S D` | Download a blob |
| Shelby: List Blobs | `Ctrl+Alt+S L` | List all blobs for an account |
| Shelby: Open Blob Browser | `Ctrl+Alt+S B` | Open webview panel |
| Shelby: Refresh Explorer | `Ctrl+Alt+S R` | Refresh sidebar |
| Shelby: Switch Network | `Ctrl+Alt+S N` | Change network |
| Shelby: Delete Blob | — | Delete a blob (right-click in sidebar) |
| Shelby: Copy Blob URL | — | Copy URL to clipboard |
| Shelby: Verify Integrity | — | Check blob Merkle proof |

All 15 commands available via `Ctrl+Shift+P` → type `Shelby`.

---

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `shelby.apiKey` | string | `""` | API key for Shelby node access |
| `shelby.network` | enum | `shelbynet` | Network: shelbynet, testnet, mainnet, devnet |
| `shelby.accounts` | array | `[]` | Configured accounts (name + address) |
| `shelby.defaultAccount` | string | `""` | Default account for operations |
| `shelby.defaultExpirationDays` | number | `30` | Default blob expiration |
| `shelby.concurrency` | number | `4` | Max concurrent operations |
| `shelby.autoRefreshSeconds` | number | `60` | Sidebar auto-refresh interval |
| `shelby.urlFormat` | enum | `shelby://` | URL format for Copy URL command |
| `shelby.showStatusBar` | boolean | `true` | Show status bar indicator |

---

## Code Snippets

In any `.ts` or `.js` file, type the prefix and press Tab:

| Prefix | Generates |
|--------|-----------|
| `shelby-init` | ShelbyNodeClient initialization |
| `shelby-upload` | client.upload() template |
| `shelby-download` | client.download() with stream piping |
| `shelby-list` | getAccountBlobs() with iteration |
| `shelby-account` | Account.fromPrivateKey() setup |

---

## Development

```bash
git clone https://github.com/CryptoOrange-team/shelby-vscode.git
cd shelby-vscode
npm install --legacy-peer-deps
npm install got@^11.8.6 --legacy-peer-deps
# Open in VS Code, press F5
```

```bash
npm run compile   # Build
npm run watch     # Watch mode
npm test          # Run 22 unit tests
npm run package   # Create .vsix
```

## License

MIT
