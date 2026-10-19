# 11 · How to add a feature

This is a hands-on exercise. We'll add **`DELETE /api/v1/files/:name`**, which
deletes one stored file. Try writing each step yourself first, then compare
with the solution.

The order is always the same, **bottom-up**: service → controller → route →
README/docs. Writing the service first means the logic exists before any HTTP
code depends on it.

## Step 1: service (the logic)

Add a `deleteFile` function to `src/services/file.service.js`:

```js
const AppError = require("../utils/AppError");

const deleteFile = async (name) => {
  // Reject anything that isn't a plain file name (blocks "../" path traversal)
  if (path.basename(name) !== name) {
    throw new AppError("Invalid file name", 400);
  }
  try {
    await fs.unlink(path.join(config.upload.dir, name));
  } catch (err) {
    if (err.code === "ENOENT") throw new AppError("File not found", 404);
    throw err; // unexpected → becomes a 500
  }
};

module.exports = { ensureUploadDir, buildStoredName, toFileInfo, listFiles, deleteFile };
```

What to notice:

- **Security first**: `name` comes from the URL, which means it comes from the
  user. `path.basename("../../src/app.js")` is `"app.js"`, which doesn't equal
  the input, so the request is rejected.
- **`fs.unlink`** deletes a file. If the file doesn't exist, Node throws an
  error with `code: "ENOENT"` ("Error NO ENTry"). We translate that **expected**
  case into a `404`.
- Any **other** error is re-thrown as is. The error middleware logs it and
  returns `500`.
- The function has no `req` or `res` anywhere, so it's a pure service.

## Step 2: controller (HTTP in → HTTP out)

In `src/controllers/file.controller.js`:

```js
const deleteFile = async (req, res) => {
  await fileService.deleteFile(req.params.name);
  res.status(204).end();
};

module.exports = { uploadFiles, listFiles, deleteFile };
```

- `req.params.name` reads the `:name` part of the URL.
- **`204 No Content`** is the standard success code for a delete with nothing
  to return. `.end()` sends the response with no body.
- There's no `try/catch`: Express 5 forwards any rejected promise to the error
  middleware.

## Step 3: route (wire the URL)

In `src/routes/file.routes.js`:

```js
router.delete("/:name", fileController.deleteFile);
```

Final URL: `/api/v1` + `/files` + `/:name`, which gives
`DELETE /api/v1/files/:name`.

## Step 4: try it

```bash
npm run dev

curl -F "files=@./notes.txt" http://localhost:3000/api/v1/files
# → note the "savedAs" value, e.g. 1792399545348-notes.txt

curl -i -X DELETE http://localhost:3000/api/v1/files/1792399545348-notes.txt
# HTTP/1.1 204 No Content

curl -i -X DELETE http://localhost:3000/api/v1/files/1792399545348-notes.txt
# HTTP/1.1 404 Not Found   {"error":"File not found"}

curl -i -X DELETE http://localhost:3000/api/v1/files/..%2F..%2Fpackage.json
# HTTP/1.1 400 Bad Request {"error":"Invalid file name"}
```

(`%2F` is a URL-encoded `/`. Express decodes it into `req.params.name`, so
`../../package.json` reaches the service, and the basename check rejects it.)

## Step 5: documentation

- Add the endpoint to the **API** section of the root `README.md`.
- If the change teaches something new, mention it in the matching doc here.

## Checklist for any new feature

- [ ] **Config**: new settings? Add them to `config/index.js` **and**
      `.env.example`.
- [ ] **Service**: logic and data access, no HTTP. Throw `AppError` for expected
      failures.
- [ ] **Controller**: read `req`, call the service, send the correct status code.
- [ ] **Route**: REST-style path and verb, plus any middleware the route needs.
- [ ] **Security**: never trust input (names, paths, sizes, types).
- [ ] **Try it**: success case **and** error cases with `curl`.
- [ ] **Docs**: README API section and these docs.

### A bigger feature: a new resource

For something like "documents" (parsed text from uploaded files), create a full
set of files:

```
src/routes/document.routes.js
src/controllers/document.controller.js
src/services/document.service.js
```

Then mount the router in `src/routes/index.js`:

```js
router.use("/documents", documentRoutes);
```

Everything else (errors, config, the app setup) already works for the new
feature. That's the payoff of the architecture.
