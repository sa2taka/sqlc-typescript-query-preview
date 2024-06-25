import ts from "typescript";

const store: Record<string, ts.SourceFile> = {};

export function getMemorizedFileContent(filePath: string): ts.SourceFile | undefined {
  return store[filePath];
}

export function setMemorizedFileContent(filePath: string, content: ts.SourceFile): void {
  store[filePath] = content;
}

export function deleteMemorizedFileContent(filePath: string): void {
  delete store[filePath];
}
