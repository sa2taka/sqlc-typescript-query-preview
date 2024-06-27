import * as vscode from "vscode";

export async function goToSqlQuery({ sqlFilePath, offset }: { sqlFilePath: string; offset: number }): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(sqlFilePath);
    const position = document.positionAt(offset);

    const textEditor = await vscode.window.showTextDocument(document, { selection: new vscode.Range(position, position) });
    textEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open SQL file: ${error}`);
  }
}
