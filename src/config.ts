import * as vscode from "vscode";

export function getSqlcDirectory(): string {
  return vscode.workspace.getConfiguration("sqlcTypeScriptQueryPreview").get("sqlcDirectory", "db/queries");
}

export function getGeneratedSqlcDirectory(): string {
  return vscode.workspace.getConfiguration("sqlcTypeScriptQueryPreview").get("generatedSqlcDirectory", "src/generated/sqlc");
}

export function getUsingGeneratedSqlcDirectory(): string {
  return vscode.workspace.getConfiguration("sqlcTypeScriptQueryPreview").get("usingGeneratedSqlcDirectory", "src/repositories");
}

export function getGeneratedFileSuffix(): string {
  return vscode.workspace.getConfiguration("sqlcTypeScriptQueryPreview").get("generatedFileSuffix", "_sql");
}
