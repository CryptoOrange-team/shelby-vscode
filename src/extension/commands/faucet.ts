/** shelby.faucet command — Open Shelby/Aptos faucets for testnet tokens. */
import * as vscode from 'vscode';

const FAUCET_URLS: Record<string, string> = {
  shelbynet: 'https://docs.shelby.xyz/tools/wallets/petra-setup',
  testnet: 'https://docs.shelby.xyz/tools/wallets/petra-setup',
  devnet: 'https://docs.shelby.xyz/tools/wallets/petra-setup',
};

const APTOS_FAUCET = 'https://aptos.dev/en/network/faucet';

export function registerFaucetCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('shelby.faucet', async () => {
    const cfg = vscode.workspace.getConfiguration('shelby');
    const network = cfg.get<string>('network', 'testnet');

    const pick = await vscode.window.showQuickPick(
      [
        { label: 'Shelby Faucet', description: 'Request ShelbyUSD testnet tokens', detail: FAUCET_URLS[network] ?? FAUCET_URLS['testnet'] ?? '' },
        { label: 'Aptos Faucet', description: 'Request APT testnet tokens', detail: APTOS_FAUCET },
        { label: 'Copy Account Address', description: 'Copy the default account address for pasting into faucet' },
      ],
      { placeHolder: 'Select faucet action' },
    );
    if (!pick) return;

    if (pick.label === 'Copy Account Address') {
      const defaultAccount = cfg.get<string>('defaultAccount', '');
      const accounts = cfg.get<Array<{ name: string; address: string }>>('accounts', []);
      const acct = accounts.find((a) => a.name === defaultAccount);
      if (acct?.address) {
        await vscode.env.clipboard.writeText(acct.address);
        void vscode.window.showInformationMessage('Account address copied to clipboard.');
      } else {
        void vscode.window.showWarningMessage('No default account configured.');
      }
      return;
    }

    const url = pick.label === 'Shelby Faucet'
      ? (FAUCET_URLS[network] ?? FAUCET_URLS['testnet'] ?? 'https://docs.shelby.xyz/apis/faucet')
      : APTOS_FAUCET;

    await vscode.env.openExternal(vscode.Uri.parse(url));
    void vscode.window.showInformationMessage(`Opening ${pick.label} in browser...`);
  });
}
