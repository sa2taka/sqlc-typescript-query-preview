import path, { extname } from "path";
import ts from "typescript";
import * as vscode from "vscode";
import { getGeneratedFileSuffix, getGeneratedSqlcDirectory, getSqlcDirectory, getUsingGeneratedSqlcDirectory } from "./config";
import { getMemorizedFileContent, setMemorizedFileContent } from "./file-content-memorized-store";

function isLikeStringLiteral(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isTemplateLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

export function buildSqlcQueryFilePath(absolutePath: string): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(absolutePath));
  if (!workspaceFolder) {
    return undefined;
  }

  const relativePath = path.relative(workspaceFolder.uri.fsPath, absolutePath);

  if (!isInUsingGeneratedSqlcDirectory(relativePath)) {
    return undefined;
  }

  const usingSqlcDirectory = getUsingGeneratedSqlcDirectory();
  const queryDirectory = getSqlcDirectory();

  const fileBaseName = path.basename(relativePath.replace(usingSqlcDirectory, ""), extname(relativePath));

  return path.join(workspaceFolder.uri.fsPath, queryDirectory, fileBaseName + ".sql");
}

export async function findGeneratedSqlcQuery(document: vscode.TextDocument, functionName: string): Promise<string | undefined> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return undefined;
  }

  const memorized = getMemorizedFileContent(document.fileName);

  let sourceFile: ts.SourceFile;
  if (memorized) {
    sourceFile = memorized;
  } else {
    const generatedSqlcDirectory = getGeneratedSqlcDirectory();
    const suffix = getGeneratedFileSuffix();
    const sqlcFilePath = path.join(workspaceFolder.uri.fsPath, generatedSqlcDirectory, `${path.parse(document.fileName).name}${suffix}.ts`);

    const sqlcFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(sqlcFilePath)).then((content) => content.toString());

    sourceFile = ts.createSourceFile(sqlcFilePath, sqlcFileContent, ts.ScriptTarget.Latest, true);
    setMemorizedFileContent(document.fileName, sourceFile);
  }

  let query: string | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (ts.isIdentifier(declaration.name) && declaration.name.text === `${functionName}Query`) {
        if (declaration.initializer && isLikeStringLiteral(declaration.initializer)) {
          query = declaration.initializer.text;
        }
      }
    }
  });

  return query;
}

export function isInUsingGeneratedSqlcDirectory(relativePath: string): boolean {
  const usingSqlcDirectory = getUsingGeneratedSqlcDirectory();

  return relativePath.startsWith(usingSqlcDirectory);
}
