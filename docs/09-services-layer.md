# 09 · Services layer (`src/services/`)

## Job

Services hold the **business logic**: the actual rules and work of the app.
They talk to the filesystem today, and later to databases, the embeddings API,
the vector store and the LLM.

The key property: **services know nothing about HTTP.** No `req`, no `res`, no
status codes in responses. They take plain values and return plain values (or
Promises of them).

**Flutter comparison:** this is your **domain + data** layer, meaning use cases
and repositories. A use case doesn't know whether it was triggered by a button,
a deep link or a background task. In the same way, a service doesn't know
whether it was called by an HTTP request, a CLI script or a scheduled job.

## `file.service.js`

```js
const fs = require("fs/promises");
const path = require("path");
const config = require("../config");

const ensureUploadDir = () => fs.mkdir(config.upload.dir, { recursive: true });

const buildStoredName = (originalName) => {
  // Strip directory parts and unsafe characters; prefix a timestamp to avoid collisions
  const safeName = path.basename(originalName).replace(/[^\w.\-]/g, "_");
  return `${Date.now()}-${safeName}`;
};

const toFileInfo = (file) => ({
  originalName: file.originalname,
  savedAs: file.filename,
  size: file.size,
  mimeType: file.mimetype,
});

const listFiles = async () => {
  const entries = await fs.readdir(config.upload.dir, { withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const stats = await fs.stat(path.join(config.upload.dir, entry.name));
        return { name: entry.name, size: stats.size, uploadedAt: stats.birthtime };
      })
  );
};

module.exports = { ensureUploadDir, buildStoredName, toFileInfo, listFiles };
```

### `ensureUploadDir()`

Creates the upload folder. `{ recursive: true }` means "create parent folders
too, and don't fail if it already exists", like
`Directory(path).create(recursive: true)` in Dart. `server.js` calls it at
startup.

### `buildStoredName(originalName)`: a security-relevant rule

The client controls the file name, so we **can't trust it**. A malicious name
like `../../src/server.js` could overwrite our own code
(**path traversal**).

1. `path.basename(...)` keeps only the last part:
   `"../../evil.js"` becomes `"evil.js"`.
2. `.replace(/[^\w.\-]/g, "_")` replaces anything that isn't a letter, digit,
   `_`, `.` or `-` with `_`: `"my file (1).pdf"` becomes `"my_file__1_.pdf"`.
3. `` `${Date.now()}-${safeName}` `` prefixes milliseconds since 1970, so two
   uploads of `report.pdf` don't overwrite each other.
   `` `…${x}…` `` is JS string interpolation, the same as Dart's `'…$x…'`.

### `toFileInfo(file)`

Maps multer's file object to **our** API shape. This is the same idea as
`fromJson`/`toJson` mapping into a model class in Flutter: the outside format
can change without changing the contract with clients.

### `listFiles()`

- `fs.readdir(dir, { withFileTypes: true })` returns entries that know whether
  they're files or folders.
- `.filter(entry => entry.isFile())` skips sub-folders.
- `.map(async entry => ...)` starts a `stat` (size and dates) for each file
  **concurrently**, and `Promise.all` waits for all of them, like
  `Future.wait(entries.map(...))`.

## Why services are plain functions (not classes)

Both styles are fine in Node. Plain functions exported from a module are simple
and already behave like a singleton: Node caches each module after the first
`require`, so every file gets the same instance. When we need to **swap
implementations** (disk vs S3, or one vector DB vs another), we'll likely move
to classes or factories that receive their dependencies (dependency
injection), much like passing a repository into a Bloc's constructor in
Flutter.

## Where RAG logic will go

This layer is where the project's future lives:

```
services/
├── file.service.js        # store and list raw uploads   (today)
├── parser.service.js      # PDF/DOCX → text              (next)
├── chunk.service.js       # text → overlapping chunks
├── embedding.service.js   # chunks → vectors (calls an embeddings API)
├── vector.service.js      # store and search vectors
└── chat.service.js        # question → retrieve chunks → ask the LLM → answer
```

Each one is testable alone, and controllers just orchestrate them.

## Rules for this layer

- ✅ All real logic: validation of business rules, file and database access,
  calls to external APIs.
- ✅ Read settings from `config`, never from `process.env`.
- ✅ Throw errors (`AppError` for expected cases like "file not found").
- ❌ Never import `express`, never touch `req` or `res`.
- ❌ Never import controllers or routes (dependencies point **down** only).

**Next:** [10 · Error handling](10-error-handling.md)
