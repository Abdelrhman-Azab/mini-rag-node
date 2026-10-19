# 03 · Request lifecycle

The best way to understand the layers is to follow **one request** through the
code. Here's an upload:

```bash
curl -F "files=@./notes.txt" http://localhost:3000/api/v1/files
```

From Flutter this would be a `dio` call:

```dart
final form = FormData.fromMap({
  'files': await MultipartFile.fromFile('notes.txt'),
});
await dio.post('http://localhost:3000/api/v1/files', data: form);
```

## Step 0: the server is already running (`server.js`)

When you ran `npm start`, `server.js`:

1. loaded `config` (which reads `.env`),
2. made sure the `files/` folder exists (`fileService.ensureUploadDir()`),
3. called `app.listen(3000)`, so Node now waits for connections.

## Step 1: the app receives the request (`app.js`)

```js
app.use(express.json());           // ① tries to parse a JSON body (ours is multipart, so it skips)
app.use("/api/v1", routes);        // ② URL starts with /api/v1 → hand over to routes/index.js
app.use(notFound);                 // (only reached if no route matched)
app.use(errorHandler);             // (only reached if something called next(err) or threw)
```

Express runs these **in the order they were registered**, top to bottom.
`/api/v1/files` matches `/api/v1`, so Express strips that prefix and passes
`/files` to the router.

## Step 2: the root router (`routes/index.js`)

```js
router.get("/health", ...);         // not GET /health → skip
router.use("/files", fileRoutes);   // matches /files → strip it, pass "/" to file.routes.js
```

## Step 3: the feature router (`routes/file.routes.js`)

```js
router.post("/", upload.array("files"), fileController.uploadFiles);
```

This is a **chain**: first `upload.array("files")` (middleware), then
`fileController.uploadFiles` (controller). Method `POST` and path `/` both
match.

## Step 4: the upload middleware (`middlewares/upload.middleware.js`)

Multer reads the multipart body as a **stream** and, for each part named
`files`:

1. asks our `filename` function for the name to save under, which calls
   `fileService.buildStoredName("notes.txt")` and returns
   `"1792399545348-notes.txt"`,
2. writes the bytes into `config.upload.dir`,
3. enforces `limits` (max size, max count). If one is exceeded it calls
   `next(err)` with a `MulterError`, which **jumps straight to the error
   handler** (Step 7b).

When it finishes, it puts the file details on **`req.files`** and calls
`next()` to pass control to the next function in the chain.

> At this point **the file is already on disk**. The controller only reports
> what happened.

## Step 5: the controller (`controllers/file.controller.js`)

```js
const uploadFiles = (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError("No files uploaded. Use form field 'files'.", 400);   // → Step 7b
  }
  res.status(201).json({
    message: "Files uploaded successfully",
    files: req.files.map(fileService.toFileInfo),                            // → Step 6
  });
};
```

## Step 6: the service (`services/file.service.js`)

```js
const toFileInfo = (file) => ({
  originalName: file.originalname,
  savedAs: file.filename,
  size: file.size,
  mimeType: file.mimetype,
});
```

This turns multer's internal file object into **our** public response shape.
It's like mapping a DTO to a domain model in Flutter. If we ever replace
multer, the API response stays the same.

## Step 7a: success response

`res.status(201).json({...})` sets the status code, sets
`Content-Type: application/json`, serializes the object and sends it. **The
request is over.** Nothing after this runs for this request.

```json
{
  "message": "Files uploaded successfully",
  "files": [{ "originalName": "notes.txt", "savedAs": "1792399545348-notes.txt", "size": 6, "mimeType": "text/plain" }]
}
```

## Step 7b: error response (if anything went wrong)

If any step threw an error or called `next(err)`, Express skips every normal
handler and goes to `errorHandler` in `error.middleware.js`, which picks the
status code and sends `{ "error": "..." }`. See
[10 · Error handling](10-error-handling.md).

## The whole flow

```
curl / Flutter
   │  POST /api/v1/files  (multipart)
   ▼
server.js ── listening
   ▼
app.js ── express.json() ── "/api/v1" ─┐
                                        ▼
routes/index.js ── "/files" ───────────┐
                                        ▼
routes/file.routes.js ── POST "/"
   ▼
upload.middleware (multer) ── saves to ./files ──(error?)──┐
   ▼ next()                                                 │
file.controller.uploadFiles ──(throw?)─────────────────────┤
   ▼ uses                                                   │
file.service.toFileInfo                                     │
   ▼                                                        ▼
res.status(201).json(...)                      error.middleware.errorHandler
   ▼                                                        ▼
201 JSON                                         400 / 404 / 500 JSON
```

**Next:** [04 · Entry point](04-entry-point-app-and-server.md)
