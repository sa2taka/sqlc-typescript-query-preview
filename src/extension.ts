import * as vscode from "vscode";
import { goToSqlQuery } from "./commands/go-to-sql-query";
import { CodeLensProvider } from "./providers/code-lens-provider";
import { HoverProvider } from "./providers/hover-provider";

const targets: vscode.DocumentSelector = [
  { scheme: "file", language: "typescript" },
  { scheme: "file", language: "typescriptreact" },
];

export function activate(context: vscode.ExtensionContext) {
  const hoverProvider = vscode.languages.registerHoverProvider(targets, new HoverProvider());

  const codeLensProvider = vscode.languages.registerCodeLensProvider(targets, new CodeLensProvider());

  const goToSqlQueryCommand = vscode.commands.registerCommand("sqlc-typescript-query-preview.goToSqlQuery", goToSqlQuery);

  context.subscriptions.push(
    hoverProvider,
    codeLensProvider,
    goToSqlQueryCommand,
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sqlcTypeScriptQueryPreview")) {
        vscode.window.showInformationMessage("SQLC Extension configuration changed. Please reload the window for changes to take effect.");
      }
    })
  );
}

export function deactivate() {}
