import * as vscode from 'vscode';

export function getSqlcDirectory () {
  return vscode.workspace.getConfiguration('sqlcDirectory');
}

export function repositoryDirectory  () {
  return vscode.workspace.getConfiguration('repositoryDirectory');
}
