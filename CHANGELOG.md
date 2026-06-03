# Changelog

## [0.2.1] — 2026-06-03

### Fixed

- **Network mapping**: `shelbynet` string now correctly maps to SDK's `Network.SHELBYNET` enum
- **Client cache**: changing API key or network now recreates the SDK client immediately
- **Delete**: fixed `Account` vs `AccountAddress` type mismatch; now uses signer account
- **Download**: replaced `Readable.fromWeb` stream piping with buffer-based approach for reliability
- **Download path**: fixed `EPERM` error when saving to drive root on Windows
- **Input focus**: added `ignoreFocusOut` to all input boxes so dialogs stay open when switching windows
- **Blob names**: shelbynet blob name prefix (`@address/`) now stripped for display and API calls
- **Context menus**: right-click commands (delete, copy URL, verify) now correctly extract data from TreeItem
- **Config debounce**: multiple rapid config changes now batched with 300ms debounce
- **Activation**: added `onStartupFinished` event; status bar visible immediately on VS Code start
- **Dependency**: documented `got` package requirement for `@aptos-labs/ts-sdk`

### Changed

- Network defaults to `shelbynet` instead of `testnet`
- Upload blob name defaults to selected file's actual name instead of `blob`
- Download/upload now show file size in bytes for accuracy

## [0.1.0] — 2026-06-03

### Added

- Initial release of Shelby VS Code extension
- **Blob Explorer**: Sidebar tree view for browsing Shelby blobs by account
- **Upload**: Upload files via command palette, explorer context menu, or drag-and-drop webview
- **Download**: Download blobs with progress indication
- **List Blobs**: List all blobs for an account
- **Blob Browser**: Rich webview panel with browse/upload/config tabs
- **Status Bar**: Network status indicator with quick access to blob browser
- **Configuration**: VS Code settings for API key, network, accounts, defaults
- **Guided Setup**: Step-by-step `shelby.init` configuration wizard
- **Diagnostics**: Real-time config validation in the Problems panel
- **Code Snippets**: 5 snippets for Shelby SDK (`shelby-init`, `shelby-upload`, `shelby-download`, `shelby-list`, `shelby-account`)
- **Context Menus**: Right-click file in explorer to upload, right-click blob in tree to download
