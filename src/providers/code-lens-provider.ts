import * as ts from "typescript";
import * as vscode from "vscode";
import { buildSqlcQueryFilePath } from "../find-sqlc-query";

interface SqlcFunction {
  name: string;
  sqlFilePath: string;
  offset: number;
}

const NAME_REGEXP = /-- name:\s*(\w+)/dg;

export class CodeLensProvider implements vscode.CodeLensProvider {
  private sqlcFunctions: SqlcFunction[] = [];

  async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const sourceFile = ts.createSourceFile(document.fileName, text, ts.ScriptTarget.Latest, true);

    const result = await this.loadSqlcFunctions(document);
    if (!result) {
      return [];
    }

    this.visitNode(sourceFile, document, codeLenses);

    return codeLenses;
  }

  private async loadSqlcFunctions(document: vscode.TextDocument): Promise<boolean> {
    const sqlcFilePath = buildSqlcQueryFilePath(document.fileName);
    if (!sqlcFilePath) {
      return false;
    }

    try {
      const sqlcFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(sqlcFilePath));
      const sqlcFileText = new TextDecoder().decode(sqlcFileContent);

      this.sqlcFunctions = [];
      const results = sqlcFileText.matchAll(NAME_REGEXP);

      for (const result of results) {
        const offset = result.indices?.[0][0] ?? 0;

        this.sqlcFunctions.push({
          name: result[1],
          sqlFilePath: sqlcFilePath,
          offset,
        });
      }

      return true;
    } catch (error) {
      console.error("Error reading SQLC file:", error);
      return false;
    }
  }

  private visitNode(node: ts.Node, document: vscode.TextDocument, codeLenses: vscode.CodeLens[]): void {
    if (this.isSqlcFunction(node)) {
      const functionName = this.getFunctionName(node);
      if (functionName) {
        const sqlcFunction = this.sqlcFunctions.find((f) => f.name === functionName);
        if (sqlcFunction) {
          const range = this.nodeToRange(document, node);
          const lens = new vscode.CodeLens(range, {
            title: "Go to SQL query",
            command: "sqlc-query-visualizer.goToSqlQuery",
            arguments: [sqlcFunction.sqlFilePath, sqlcFunction.offset],
          });
          codeLenses.push(lens);
        }
      }
    }

    ts.forEachChild(node, (child) => this.visitNode(child, document, codeLenses));
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

  private nodeToRange(document: vscode.TextDocument, node: ts.Node): vscode.Range {
    const start = document.positionAt(node.getStart());
    const end = document.positionAt(node.getEnd());
    return new vscode.Range(start, end);
  }
}
