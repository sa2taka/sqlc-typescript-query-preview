import path, { extname } from "path";
import ts from "typescript";
import * as vscode from "vscode";
import { getGeneratedFileSuffix, getGeneratedSqlcDirectory, getSqlcDirectory, getUsingGeneratedSqlcDirectory } from "./config";
import { getMemorizedFileContent, setMemorizedFileContent } from "./file-content-memorized-store";
import { resolveImportPath } from "./resolve-import-path";

function isLikeStringLiteral(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isTemplateLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function getRelativePath(absolutePath: string): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(absolutePath));
  if (!workspaceFolder) {
    return absolutePath;
  }
  return path.relative(workspaceFolder.uri.fsPath, absolutePath);
}

export function buildSqlcQueryFilePath(usingGeneratedSqlcAbsolutePath: string): string | undefined {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(usingGeneratedSqlcAbsolutePath));
  if (!workspaceFolder) {
    return undefined;
  }

  const relativePath = path.relative(workspaceFolder.uri.fsPath, usingGeneratedSqlcAbsolutePath);

  if (!isInUsingGeneratedSqlcDirectory(relativePath)) {
    return undefined;
  }

  const usingSqlcDirectory = getUsingGeneratedSqlcDirectory();
  const queryDirectory = getSqlcDirectory();

  const fileBaseName = path.basename(relativePath.replace(usingSqlcDirectory, ""), extname(relativePath));

  return path.join(workspaceFolder.uri.fsPath, queryDirectory, fileBaseName + ".sql");
}

export async function findGeneratedSqlcQuery(absolutePath: string, functionName: string): Promise<string | undefined> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(absolutePath));
  if (!workspaceFolder) {
    return undefined;
  }

  const memorized = getMemorizedFileContent(absolutePath);

  let sourceFile: ts.SourceFile;
  if (memorized) {
    sourceFile = memorized;
  } else {
    const generatedSqlcDirectory = getGeneratedSqlcDirectory();
    const suffix = getGeneratedFileSuffix();
    const sqlcFilePath = path.join(workspaceFolder.uri.fsPath, generatedSqlcDirectory, `${path.parse(absolutePath).name}${suffix}.ts`);

    const sqlcFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(sqlcFilePath)).then((content) => content.toString());

    sourceFile = ts.createSourceFile(sqlcFilePath, sqlcFileContent, ts.ScriptTarget.Latest, true);
    setMemorizedFileContent(absolutePath, sourceFile);
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

export function isInUsingGeneratedSqlcDirectoryAsAbsolutePath(absolutePath: string): boolean {
  const relativePath = getRelativePath(absolutePath);
  return isInUsingGeneratedSqlcDirectory(relativePath);
}

export function isInUsingGeneratedSqlcDirectory(relativePath: string): boolean {
  const usingSqlcDirectory = getUsingGeneratedSqlcDirectory();

  return relativePath.startsWith(usingSqlcDirectory);
}

export type FindImportedUsingGeneratedSqlcFilesResult = {
  filepath: string;
  importSpecifier: string;
};

export function findImportedUsingGeneratedSqlcFiles(document: vscode.TextDocument): FindImportedUsingGeneratedSqlcFilesResult[] {
  const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, true);

  const importedResults: FindImportedUsingGeneratedSqlcFilesResult[] = [];

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      const resolvedPath = resolveImportPath(importPath, document.fileName);
      if (!resolvedPath) {
        return;
      }

      const relativePath = getRelativePath(resolvedPath);

      if (isInUsingGeneratedSqlcDirectory(relativePath)) {
        if (node.importClause?.name) {
          importedResults.push({
            filepath: resolvedPath,
            importSpecifier: node.importClause.name.text,
          });
        } else if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach((element) => {
            importedResults.push({
              filepath: resolvedPath,
              importSpecifier: element.name.text,
            });
          });
        } else if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
          importedResults.push({
            filepath: resolvedPath,
            importSpecifier: node.importClause.namedBindings.name.text,
          });
        }
      }
    }
  });

  return importedResults;
}

const NAME_REGEXP = /-- name:\s*(\w+)/dg;
type SqlcFunction = {
  name: string;
  sqlFilePath: string;
  offset: number;
};

export async function extractSqlcFunctions(usingGeneratedSqlcAbsolutePath: string): Promise<SqlcFunction[]> {
  const results: SqlcFunction[] = [];
  const sqlcFilePath = buildSqlcQueryFilePath(usingGeneratedSqlcAbsolutePath);
  if (!sqlcFilePath) {
    return results;
  }

  try {
    const sqlcFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(sqlcFilePath));
    const sqlcFileText = new TextDecoder().decode(sqlcFileContent);

    const matchedResults = sqlcFileText.matchAll(NAME_REGEXP);

    for (const result of matchedResults) {
      const offset = result.indices?.[0][0] ?? 0;

      results.push({
        name: result[1],
        sqlFilePath: sqlcFilePath,
        offset,
      });
    }

    return results;
  } catch (error) {
    console.error("Error reading SQLC file:", error);
    return results;
  }
}
