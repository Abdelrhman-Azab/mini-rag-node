# 04 · Entry point: `app.js` and `server.js`

There are two files where you might expect one. This is one of the most common
Node best practices.

## `app.js`: *what* the server does

```js
const express = require("express");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(express.json());
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

It **builds and configures** the Express application, then exports it. It does
**not** call `listen`, so importing it doesn't open a port.

### Why order matters here

`app.use` registers things in a pipeline that runs top to bottom:

1. `express.json()` is a built-in middleware. For requests with
   `Content-Type: application/json`, it parses the body into `req.body`.
   Our upload endpoint doesn't need it, but future endpoints (for example,
   "ask a question") will.
2. `app.use("/api/v1", routes)` mounts all the routes under a **version
   prefix**. If the API ever changes in a breaking way, we can add `/api/v2`
   next to it, and old app versions in the store keep working. As a mobile dev
   you'll appreciate that: users don't all update right away.
3. `notFound` comes **after** the routes. A request only reaches it if no route
   answered.
4. `errorHandler` comes **last**. Express treats a middleware with **4
   parameters** `(err, req, res, next)` as an error handler.

## `server.js`: *running* it

```js
const config = require("./config");
const app = require("./app");
const fileService = require("./services/file.service");

const start = async () => {
  await fileService.ensureUploadDir();

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

This is the **process entry point**, like `main()` in `main.dart`. It does
things that have side effects and belong to "running a program":

- **Startup work**: it creates the upload folder *before* accepting requests.
- **Listening**: `app.listen(port)` opens the port.
- **Graceful shutdown**: `SIGINT` is Ctrl+C, and `SIGTERM` is what Docker,
  Kubernetes and hosting platforms send to stop your app. `server.close()` stops
  accepting new connections and lets in-flight requests (for example, a big
  upload) finish before the process exits. Think of it like disposing
  controllers in `dispose()` instead of killing the app.
- **Failing loudly**: if startup fails (for example, no permission to create
  the folder), it logs the error and exits with code `1`, so a hosting platform
  knows the start failed.

## Why split them?

| Reason             | Explanation                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Testing**        | Tests can `require("./app")` and send fake requests with `supertest` without opening a real port or clashing with a running server.           |
| **Single job**     | `app.js` = HTTP configuration. `server.js` = process lifecycle. Each one changes for different reasons.                                       |
| **Reuse**          | The same `app` could later be run behind HTTPS, in a serverless function, or in a cluster, by writing a different "server" file.             |

A testing example for later:

```js
const request = require("supertest");
const app = require("../src/app");

test("health works", async () => {
  const res = await request(app).get("/api/v1/health");
  expect(res.status).toBe(200);
});
```

**Next:** [05 · Config layer](05-config-layer.md)
