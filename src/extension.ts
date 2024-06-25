import * as vscode from "vscode";
import { goToSqlQuery } from "./commands/go-to-sql-query";
import { CodeLensProvider } from "./providers/code-lens-provider";
import { HoverProvider } from "./providers/hover-provider";

export function activate(context: vscode.ExtensionContext) {
  const hoverProvider = vscode.languages.registerHoverProvider({ scheme: "file", language: "typescript" }, new HoverProvider());

  const codeLensProvider = vscode.languages.registerCodeLensProvider({ scheme: "file", language: "typescript" }, new CodeLensProvider());

  const goToSqlQueryCommand = vscode.commands.registerCommand("sqlc-query-visualizer.goToSqlQuery", goToSqlQuery);

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
