/**
 * Shelby diagnostics provider.
 *
 * Receives a config resolver (which hydrates from SecretStorage)
 * so diagnostics reflect actual runtime config, not just raw settings.
 */
import * as vscode from 'vscode';
import { validateConfig } from '../../core/validation';
import type { ShelbyConfig } from '../../types/shelby';

export type ConfigResolver = () => Promise<ShelbyConfig>;

export class ShelbyDiagnosticsProvider {
  private readonly collection: vscode.DiagnosticCollection;
  private configResolver: ConfigResolver | null = null;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('Shelby');
  }

  activate(context: vscode.ExtensionContext, resolveConfig: ConfigResolver): void {
    this.configResolver = resolveConfig;
    void this.refresh();

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('shelby')) {
          void this.refresh();
        }
      }),
    );
    context.subscriptions.push(this.collection);
  }

  async refresh(): Promise<void> {
    if (!this.configResolver) return;

    const config = await this.configResolver();
    const diagnostics = validateConfig(config);

    const byField = new Map<string, vscode.Diagnostic[]>();
    for (const diag of diagnostics) {
      const vsDiag = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0),
        diag.message,
        diag.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
      );
      vsDiag.source = 'Shelby';
      const existing = byField.get(diag.field);
      if (existing) {
        existing.push(vsDiag);
      } else {
        byField.set(diag.field, [vsDiag]);
      }
    }

    this.collection.clear();

    for (const [field, diags] of byField) {
      this.collection.set(vscode.Uri.parse(`shelby:${field}`), diags);
    }

    const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (workspaceUri && diagnostics.length > 0) {
      const settingsUri = vscode.Uri.joinPath(workspaceUri, '.vscode', 'settings.json');
      const allDiags: vscode.Diagnostic[] = [];
      for (const [, diags] of byField) {
        allDiags.push(...diags);
      }
      this.collection.set(settingsUri, allDiags);
    }
  }

  dispose(): void {
    this.collection.dispose();
  }
}
