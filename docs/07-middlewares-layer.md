# 07 · Middlewares layer (`src/middlewares/`)

## What is middleware?

Middleware is **a function that runs in the middle**, between the request
arriving and the response being sent. Express is built entirely on it: every
`app.use(...)` and every function in a route chain is middleware.

```js
const myMiddleware = (req, res, next) => {
  // 1. look at or change req / res
  // 2. then EITHER:
  next();          // pass control to the next function in line
  // OR send a response and stop:  res.status(401).json({...})
  // OR report an error:           next(err)  (or throw)
};
```

**Flutter comparison:** `dio` interceptors work exactly like this:

```dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Authorization'] = 'Bearer ...';
    handler.next(options);           // ← Express: next()
    // handler.reject(DioException)  // ← Express: next(err)
  }
}
```

The golden rule: **every middleware must either call `next()` or send a
response.** If it does neither, the request hangs forever and the client times
out.

Use middleware for **cross-cutting concerns**: work that applies to many routes
and isn't the main business of any one of them. Examples include parsing
bodies, handling uploads, authentication, logging, rate limiting and error
handling.

## `upload.middleware.js`: saving files with multer

```js
const multer = require("multer");
const config = require("../config");
const fileService = require("../services/file.service");

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (req, file, cb) => cb(null, fileService.buildStoredName(file.originalname)),
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
    files: config.upload.maxFiles,
  },
});

module.exports = upload;
```

### Why multer?

File uploads arrive as `multipart/form-data`: a body split into parts, where
each part is a form field or a file. `express.json()` can't read it. **Multer**
is the standard Express middleware for multipart. It streams each file straight
to disk, so a 50 MB upload is never fully held in memory.

### Line by line

- **`multer.diskStorage({...})`** stores files on disk. The alternative is
  `memoryStorage()`, which keeps them in RAM as a `Buffer`. That's useful when
  you upload straight to S3, but risky for big files.
- **`destination`** is the folder, taken from config.
- **`filename: (req, file, cb) => cb(null, name)`** decides the stored name.
  This uses the older **callback style**: instead of returning a value, you call
  `cb(error, result)`. `cb(null, name)` means "no error, here's the name". You'll
  see this pattern in older Node APIs; it's what came before Promises.
- **The naming logic lives in the service** (`buildStoredName`), not here. The
  middleware only *wires* multer to our rule. If we change the naming rule, we
  change one function in the service.
- **`limits`** protects the server: no file over `MAX_FILE_SIZE_MB` and no more
  than `MAX_FILES` per request. Breaking a limit raises a `MulterError`, which
  the error middleware turns into a `400`.

### How it's used

`upload` is a configured multer instance. Calling `upload.array("files")` gives
you the actual middleware: "accept **many** files from the form field named
`files`". Other options are `upload.single("file")` (one file, stored on
`req.file`) and `upload.fields([...])` (several named fields). After it runs,
`req.files` is an array like:

```js
[{ fieldname: "files", originalname: "notes.txt", mimetype: "text/plain",
   destination: "/…/files", filename: "1792399545348-notes.txt", path: "/…/files/1792399545348-notes.txt", size: 6 }]
```

If the client sends a file under a **different** field name, multer rejects it
with `"Unexpected file field"` (a `400`).

## `error.middleware.js`: 404 and error handling

This file holds two middlewares that sit at the **end** of the pipeline in
`app.js`:

- `notFound` catches requests that no route handled.
- `errorHandler` catches every error.

They're explained in detail in [10 · Error handling](10-error-handling.md).

## Rules for this layer

- ✅ Generic, reusable work that happens *around* handlers.
- ✅ Always end with `next()`, `next(err)` or a response.
- ❌ No feature-specific business rules. Delegate those to services, as
  `filename` does with `buildStoredName`.

**Next:** [08 · Controllers layer](08-controllers-layer.md)
