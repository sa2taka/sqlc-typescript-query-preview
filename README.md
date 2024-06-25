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
