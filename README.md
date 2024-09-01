# sqlc-typescript-query-preview README

**This extension is made just for me.**

## Target

This extension is designed for a using typescript and sqlc project.

## Features

- Preview query on hover.
- Go to query by codelens.

## Config

By default, this extension assumes the following project structure:

```plaintext
project/
├── db/
│   └── queries/
│       └── *.sql
└── src/
    ├── generated/
    │   └── sqlc/
    │       └── *_sqlc.ts
    └── repository/
        └── *.ts
```

## Memo

### How to publish the extension.

ref: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

1. Access [Azure DevOps](https://dev.azure.com/) to get the PAT.
2. Update the `version` in `package.json`
3. Run `vsce package <version> --no-dependencies`
4. Run `vsce publish <version> --no-dependencies`
