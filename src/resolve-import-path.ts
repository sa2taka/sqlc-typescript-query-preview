import path from "path";
import ts from "typescript";

const memorizedTsConfig = new Map<string, ts.ParsedCommandLine>();

function loadTsConfig(fileName: string): ts.ParsedCommandLine | undefined {
  const configPath = ts.findConfigFile(fileName, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return undefined;
  }

  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedOptions = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath));

  if (parsedOptions.errors.length) {
    console.error("Error parsing tsconfig.json:", parsedOptions.errors);
    return undefined;
  }

  return parsedOptions;
}

/**
 * @param importPath e.g. `@/repositories/user-repository`
 * @param targetFile e.g. `/Users/username/project/src/controllers/user-controller.ts`
 * @returns
 */
export function resolveImportPath(importPath: string, targetFile: string): string | undefined {
  let parsedConfig: ts.ParsedCommandLine | undefined;
  if (memorizedTsConfig.get(targetFile)) {
    parsedConfig = memorizedTsConfig.get(targetFile);
  } else {
    parsedConfig = loadTsConfig(targetFile);
    if (parsedConfig) {
      memorizedTsConfig.set(targetFile, parsedConfig);
    }
  }

  if (!parsedConfig) {
    return importPath;
  }

  const resolvedModule = ts.resolveModuleName(importPath, targetFile, parsedConfig.options, ts.sys);
  return resolvedModule?.resolvedModule?.resolvedFileName;
}
