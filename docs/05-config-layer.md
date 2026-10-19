# 05 · Config layer (`src/config/`)

## Job

Read **environment variables** once, validate them and give them defaults,
then export one object that the rest of the app imports.

```js
const path = require("path");

const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "files")),
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 50,
    maxFiles: Number(process.env.MAX_FILES) || 10,
  },
});

module.exports = config;
```

## What are environment variables?

They're key–value strings that the operating system gives a process when it
starts. In Node you read them through `process.env.NAME`. Flutter has close
equivalents:

| Flutter                                   | Node                                   |
| ----------------------------------------- | -------------------------------------- |
| `--dart-define=API_URL=...`               | `PORT=4000 npm start`                  |
| `String.fromEnvironment('API_URL')`       | `process.env.API_URL`                  |
| flavors (dev / staging / prod)            | `NODE_ENV` + different `.env` files    |
| `flutter_dotenv` + `.env`                 | `node --env-file=.env` (built in)      |

Settings live in env vars instead of code because **the same code runs in
different places** (your laptop, a staging server, production) with different
ports, folders and later **secrets** (API keys for the LLM or embeddings).
Secrets must never be committed to git.

## `.env` vs `.env.example`

- **`.env`** holds your real local values. It's **git-ignored** and never
  committed.
- **`.env.example`** is a committed template that lists every variable with a
  safe default. New developers copy it with `cp .env.example .env`.

The `npm` scripts use `node --env-file-if-exists=.env`, so Node (22.9+) loads
the file itself. Older tutorials use the `dotenv` package, which we don't need.

## Details worth noticing

- **`Number(process.env.PORT) || 3000`**: env vars are **always strings** (or
  `undefined`). `Number(...)` converts them, and `|| 3000` gives a default when
  the value is missing or invalid (`Number(undefined)` is `NaN`, which is
  falsy).
- **`path.resolve(...)`** turns `./files` into an absolute path like
  `/Users/you/mini-rag/files`. A relative `UPLOAD_DIR` is resolved from the
  folder you ran `npm start` in. When the variable isn't set, the default
  `path.join(__dirname, "..", "..", "files")` points to the project root,
  because `__dirname` is the folder of the current file (`src/config`).
- **`Object.freeze`** makes the object read-only, so nothing can accidentally
  write `config.port = 1`. It's the same idea as a `const` object or a class
  with `final` fields in Dart. (Note: `freeze` is shallow. `config.upload` itself
  isn't frozen.)
- **Grouping** (`config.upload.*`) keeps related settings together. As the
  project grows you'll add `config.openai.apiKey`, `config.vectorDb.url` and so
  on.

## Rule

> **Only `src/config/` reads `process.env`.** Everyone else does
> `require("../config")`.

This gives you one place to see every setting the app uses, one place to add
defaults or validation, and the option to throw a clear error at startup if a
required variable (like an API key) is missing, instead of crashing later in
the middle of a request.

**Next:** [06 · Routes layer](06-routes-layer.md)
