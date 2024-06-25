import * as vscode from "vscode";
import { findGeneratedSqlcQuery } from "../find-sqlc-query";

export class HoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);

    return findGeneratedSqlcQuery(document, word).then((query) => {
      if (query) {
        return new vscode.Hover(toMarkdown(query));
      }
    });
  }
}

function toMarkdown(code: string): vscode.MarkdownString {
  return new vscode.MarkdownString().appendCodeblock(code, "sql");
}
