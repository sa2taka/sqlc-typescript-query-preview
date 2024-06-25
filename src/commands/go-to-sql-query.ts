import * as vscode from "vscode";

export async function goToSqlQuery(sqlFilePath: string, offset: number): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(sqlFilePath);
    const position = document.positionAt(offset);
    await vscode.window.showTextDocument(document);
    if (vscode.window.activeTextEditor?.selection) {
      vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
      vscode.commands.executeCommand("revealLine", {
        lineNumber: position.line,
        at: "top",
      });
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open SQL file: ${error}`);
  }
}
