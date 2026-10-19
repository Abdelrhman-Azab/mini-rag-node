# 06 · Routes layer (`src/routes/`)

## Job

Map **HTTP method + URL path** to the code that handles it. Routes are a table
of contents for the API and contain **no logic**.

The Flutter equivalent is your `GoRouter` route list: `path: '/files'` maps to
`FilesScreen()`. Here `POST /files` maps to `fileController.uploadFiles`.

## `routes/index.js`: the root router

```js
const { Router } = require("express");
const fileRoutes = require("./file.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/files", fileRoutes);

module.exports = router;
```

- `Router()` creates a **mini app** that can hold routes and middleware, which
  you then mount somewhere.
- `/health` is a tiny endpoint that hosting platforms and monitoring tools call
  to check whether the server is alive. It's simple enough to stay inline.
- `router.use("/files", fileRoutes)` **mounts** the file router under `/files`.

`app.js` mounts this router under `/api/v1`, so the final URLs are:

```
app.use("/api/v1", routes)          → /api/v1
  router.use("/files", fileRoutes)  → /api/v1/files
    router.post("/")                → POST /api/v1/files
    router.get("/")                 → GET  /api/v1/files
  router.get("/health")             → GET  /api/v1/health
```

This works like nested routes in GoRouter, where child paths add to the
parent's path.

## `routes/file.routes.js`: the feature router

```js
const { Router } = require("express");
const upload = require("../middlewares/upload.middleware");
const fileController = require("../controllers/file.controller");

const router = Router();

router.post("/", upload.array("files"), fileController.uploadFiles);
router.get("/", fileController.listFiles);

module.exports = router;
```

### Anatomy of a route

```
router.post( "/",  upload.array("files"),  fileController.uploadFiles )
       │      │            │                          │
    method   path    middleware (0..n)            final handler
```

- **Method**: `get`, `post`, `put`, `patch`, `delete`, which match the HTTP verb.
- **Path**: can contain parameters like `"/:name"`, read through
  `req.params.name`.
- **Middleware chain**: any number of functions that run **in order** before
  the handler. Here `upload.array("files")` saves the files first. You can only
  attach the upload middleware to the routes that need it, which is a good
  thing: `GET /files` doesn't parse uploads.
- **Handler**: the controller function that sends the response.

### REST naming

The routes follow **REST** conventions: the URL is a **noun** (the resource),
and the HTTP **verb** says what to do with it.

| Verb + path          | Meaning                    | Status on success |
| -------------------- | -------------------------- | ----------------- |
| `GET /files`         | list files                 | `200 OK`          |
| `POST /files`        | create (upload) files      | `201 Created`     |
| `GET /files/:name`   | get one file *(future)*    | `200 OK`          |
| `DELETE /files/:name`| delete one *(future)*      | `204 No Content`  |

That's why the URL is `POST /api/v1/files` and not `POST /upload`.

## Rules for this layer

- ✅ Declare paths, methods and which middleware applies.
- ❌ No `if` statements, no database or file access, no response formatting.
  If a route handler grows past one line, move it into a controller.

**Next:** [07 · Middlewares layer](07-middlewares-layer.md)
