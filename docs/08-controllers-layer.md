# 08 · Controllers layer (`src/controllers/`)

## Job

A controller is the **boundary between HTTP and your app**. It:

1. **reads** what it needs from `req` (body, params, query, files),
2. **checks** that the input makes sense from an HTTP point of view,
3. **calls** one or more service functions,
4. **sends** the response with the right status code and JSON shape.

It contains **no business logic**. It's a translator.

**Flutter comparison:** a Bloc or Cubit takes UI events, calls a use case or
repository, and emits states for the UI. A controller takes HTTP requests,
calls services, and emits HTTP responses.

## `file.controller.js`

```js
const AppError = require("../utils/AppError");
const fileService = require("../services/file.service");

const uploadFiles = (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError("No files uploaded. Use form field 'files'.", 400);
  }
  res.status(201).json({
    message: "Files uploaded successfully",
    files: req.files.map(fileService.toFileInfo),
  });
};

const listFiles = async (req, res) => {
  const files = await fileService.listFiles();
  res.json({ files });
};

module.exports = { uploadFiles, listFiles };
```

### `uploadFiles`

- When this runs, multer has **already saved the files** (see
  [07](07-middlewares-layer.md)). The controller's job is to confirm that
  something was actually uploaded and to report it.
- **Input check**: no files means a client mistake, so we `throw` an `AppError`
  with `400 Bad Request`. We **throw** instead of writing
  `res.status(400).json(...)` here, so that *all* error responses are formatted
  in one place (the error middleware).
- **`201 Created`** is the correct status when something new was created.
- **`req.files.map(fileService.toFileInfo)`**: the response shape comes from
  the service, so the API never leaks multer's internal fields (like the full
  disk `path`). Leaking the server's folder layout would be a small security
  problem.

### `listFiles`

- It's an `async` function because the service reads the disk.
- If `fileService.listFiles()` rejects (for example, the folder was deleted),
  **Express 5 catches the rejected promise automatically** and sends it to the
  error middleware. In Express 4 you had to wrap every async handler in
  `try/catch` or a helper. Express 5 made that unnecessary.
- `res.json(...)` defaults to status `200`.

## The `req` and `res` objects (cheat sheet)

| You want…                            | Use                                  |
| ------------------------------------ | ------------------------------------ |
| JSON body (`POST {"q": "hi"}`)       | `req.body.q` (needs `express.json()`)|
| URL param (`/files/:name`)           | `req.params.name`                    |
| Query string (`/files?limit=5`)      | `req.query.limit` (always a string!) |
| Headers                              | `req.get("authorization")`           |
| Uploaded files (multer)              | `req.files` / `req.file`             |
| Send JSON                            | `res.status(200).json({...})`        |
| Send nothing                         | `res.status(204).end()`              |
| Send a file download                 | `res.download(absolutePath)`         |

## Why not put the logic straight into the controller?

Logic in services can be **reused** and **tested without HTTP**:

- A future background job ("re-index all files") can call
  `fileService.listFiles()` directly. There's no `req` or `res` in a cron job.
- A test can call `fileService.buildStoredName("a b.pdf")` and check the result
  without starting Express.

## Rules for this layer

- ✅ Read `req`, call services, send `res`, throw `AppError` for bad input.
- ✅ Choose status codes (`200`, `201`, `204`, `400`, `404`…).
- ❌ No `fs`, no database, no external APIs: that's the service's job.
- ❌ Don't catch errors just to send them. Let them bubble up to the error
  middleware.

**Next:** [09 · Services layer](09-services-layer.md)
