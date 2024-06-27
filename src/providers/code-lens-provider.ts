import * as ts from "typescript";
import * as vscode from "vscode";
import {
  extractSqlcFunctions,
  findImportedUsingGeneratedSqlcFiles,
  FindImportedUsingGeneratedSqlcFilesResult,
  isInUsingGeneratedSqlcDirectoryAsAbsolutePath,
} from "../find-sqlc-query";

interface SqlcFunction {
  name: string;
  sqlFilePath: string;
  offset: number;
}

const NAME_REGEXP = /-- name:\s*(\w+)/dg;

export class CodeLensProvider implements vscode.CodeLensProvider {
  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const sourceFile = ts.createSourceFile(document.fileName, text, ts.ScriptTarget.Latest, true);

    if (isInUsingGeneratedSqlcDirectoryAsAbsolutePath(document.fileName)) {
      const sqlcResults = await extractSqlcFunctions(document.fileName);
      if (sqlcResults.length <= 0) {
        return [];
      }

      this.visitNodeForUsingGeneratedQuery(sourceFile, document, codeLenses, sqlcResults);
    } else {
      const importedResults = findImportedUsingGeneratedSqlcFiles(document);

      const results = await Promise.all(
        importedResults.map(({ filepath }) => {
          return extractSqlcFunctions(filepath);
        })
      );

      if (results.every((r) => !r)) {
        return [];
      }

      this.visitNodeForImportedQuery(sourceFile, document, codeLenses, importedResults, results.flat());
    }

    return codeLenses;
  }

  private visitNodeForUsingGeneratedQuery(
    node: ts.Node,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[],
    sqlcFunctions: SqlcFunction[]
  ): void {
    if (this.isSqlcFunction(node)) {
      const functionName = this.getFunctionName(node);
      if (functionName) {
        const sqlcFunction = sqlcFunctions.find((f) => f.name === functionName);
        if (sqlcFunction) {
          const range = this.nodeToRange(document, node);
          const lens = new vscode.CodeLens(range, {
            title: "Go to SQL query",
            command: "sqlc-typescript-query-preview.goToSqlQuery",
            arguments: [{ sqlFilePath: sqlcFunction.sqlFilePath, offset: sqlcFunction.offset }],
          });
          codeLenses.push(lens);
        }
      }
    }

    ts.forEachChild(node, (child) => this.visitNodeForUsingGeneratedQuery(child, document, codeLenses, sqlcFunctions));
  }

  private isSqlcFunction(node: ts.Node): boolean {
    return (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node)) && this.isExported(node);
  }

  private isExported(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node)) {
      return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }
    const parent = node.parent;
    const variableRoot = parent?.parent.parent;
    if (ts.isArrowFunction(node) && ts.isVariableDeclaration(parent) && ts.isVariableStatement(variableRoot)) {
      return variableRoot.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    }
    // TODO: import * as query from "./queries" の形式に対応する
    return false;
  }

  private getFunctionName(node: ts.Node): string | undefined {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.text;
    }
    if (ts.isArrowFunction(node) && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    return undefined;
  }

  private visitNodeForImportedQuery(
    node: ts.Node,
    document: vscode.TextDocument,
    codeLenses: vscode.CodeLens[],
    importedResults: FindImportedUsingGeneratedSqlcFilesResult[],
    sqlcFunctions: SqlcFunction[]
  ): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression)) {
        const sqlcFunction = sqlcFunctions.find((f) => f.name === expression.text);
        if (sqlcFunction) {
          const range = this.nodeToRange(document, node);
          const lens = new vscode.CodeLens(range, {
            title: "Go to SQL query",
            command: "sqlc-typescript-query-preview.goToSqlQuery",
            arguments: [{ sqlFilePath: sqlcFunction.sqlFilePath, offset: sqlcFunction.offset }],
          });
          codeLenses.push(lens);
        }
      }
    }

    ts.forEachChild(node, (child) => this.visitNodeForImportedQuery(child, document, codeLenses, importedResults, sqlcFunctions));
  }

  private nodeToRange(document: vscode.TextDocument, node: ts.Node): vscode.Range {
    const start = document.positionAt(node.getStart());
    const end = document.positionAt(node.getEnd());
    return new vscode.Range(start, end);
  }
}
