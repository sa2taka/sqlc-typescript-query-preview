import * as vscode from "vscode";
import {
  extractSqlcFunctions,
  findGeneratedSqlcQuery,
  findImportedUsingGeneratedSqlcFiles,
  isInUsingGeneratedSqlcDirectoryAsAbsolutePath,
} from "../find-sqlc-query";

export class HoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null | undefined> {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);

    if (isInUsingGeneratedSqlcDirectoryAsAbsolutePath(document.fileName)) {
      const sqlcFunctions = await extractSqlcFunctions(document.fileName);

      const sqlcFunction = sqlcFunctions.find((f) => f.name === word);

      return findGeneratedSqlcQuery(document.fileName, word).then((query) => {
        if (query) {
          if (sqlcFunction) {
            return new vscode.Hover([
              toGoToSqlcDefinitionButton(sqlcFunction.sqlFilePath, sqlcFunction.offset),
              dividedMarkdown,
              toSqlcCodeBlock(query),
            ]);
          } else {
            return new vscode.Hover([toSqlcCodeBlock(query)]);
          }
        }
      });
    } else {
      const importedResults = findImportedUsingGeneratedSqlcFiles(document);

      const targetName = importedResults.find((result) => result.importSpecifier === word);
      if (targetName) {
        const sqlcFunctions = await extractSqlcFunctions(targetName.filepath);
        const sqlcFunction = sqlcFunctions.find((f) => f.name === word);

        return findGeneratedSqlcQuery(targetName.filepath, word).then((query) => {
          if (query) {
            if (sqlcFunction) {
              return new vscode.Hover([
                toGoToSqlcDefinitionButton(sqlcFunction.sqlFilePath, sqlcFunction.offset),
                dividedMarkdown,
                toSqlcCodeBlock(query),
              ]);
            } else {
              return new vscode.Hover([toSqlcCodeBlock(query)]);
            }
          }
        });
      }

      // TODO: import * as query from "./queries" の形式に対応する
    }
  }
}

function toSqlcCodeBlock(code: string): vscode.MarkdownString {
  return new vscode.MarkdownString().appendCodeblock(code, "sql");
}

function toGoToSqlcDefinitionButton(filepath: string, offset: number): vscode.MarkdownString {
  const commandUri = vscode.Uri.parse(
    `command:sqlc-typescript-query-preview.goToSqlQuery?${encodeURIComponent(JSON.stringify({ sqlFilePath: filepath, offset }))}`
  );
  const md = new vscode.MarkdownString(`[Go to SQLC definition](${commandUri})`);
  md.isTrusted = true;
  return md;
}

const dividedMarkdown = new vscode.MarkdownString("---");
