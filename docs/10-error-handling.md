# 10 · Error handling

## The idea: throw anywhere, respond in one place

Without a plan, error handling ends up scattered:

```js
// ❌ every handler formats its own errors differently
res.status(400).send("bad");                 // here plain text
res.status(400).json({ msg: "bad" });        // there "msg"
res.status(500).json({ error: err.stack });  // and here we leak internals
```

Our approach:

1. Any layer that hits a problem **throws** (or calls `next(err)` in middleware).
2. Express sends the error to **one error-handling middleware**.
3. That middleware decides the status code and **always** responds with the
   same shape: `{ "error": "<message>" }`.

**Flutter comparison:** this is like mapping every `DioException` or exception
to a `Failure` in one place (a repository base class or an interceptor), so the
UI always gets a predictable error type instead of handling raw exceptions
everywhere.

## `utils/AppError.js`: expected errors

```js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
```

A custom error class that **carries an HTTP status code**. Use it for
**expected, operational** errors, where the client did something wrong or asked
for something that doesn't exist:

```js
throw new AppError("No files uploaded. Use form field 'files'.", 400);
throw new AppError("File not found", 404);
```

In Dart terms: `class AppError implements Exception { final String message; final int statusCode; }`.

> Isn't a status code in a service an HTTP detail leaking downward? A little,
> yes. Stricter Clean Architecture would throw domain errors (`FileNotFoundError`)
> and map them to status codes in the error middleware. For a project this size,
> `AppError` with a status code is the pragmatic, very common Node choice.
> If error types multiply, introduce domain errors then.

## `middlewares/error.middleware.js`

```js
const multer = require("multer");
const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};

module.exports = { notFound, errorHandler };
```

### `notFound`

It's registered **after** all routes in `app.js`. If a request gets this far,
nothing matched, so it creates a `404` `AppError` and passes it on with
`next(err)`. Calling `next` **with an argument** tells Express "this is an
error, skip to the error handlers".

### `errorHandler`

- **Four parameters** `(err, req, res, next)` are how Express recognizes an
  error handler. Even though `next` is never used, it **must** be in the
  signature, or Express would treat this as normal middleware.
- It checks errors from most specific to least, like a chain of `on X catch`
  blocks in Dart:
  1. **`MulterError`** (file too large, too many files, wrong field name) → `400`
     with multer's message.
  2. **`AppError`** → its own status code and message.
  3. **Anything else** is a **bug or unexpected failure** (disk error, a typo
     causing a `TypeError`…). We `console.error` the full error for
     ourselves, but the client only gets a generic
     `"Internal server error"`. **Never send stack traces or internal messages
     to clients**, because they reveal how your server works.

## How errors reach the handler

| Where the error happens                 | How it gets to `errorHandler`                                     |
| --------------------------------------- | ----------------------------------------------------------------- |
| Sync code: `throw new AppError(...)`    | Express catches it automatically                                  |
| Async code: `await` rejects / `throw` inside `async` | **Express 5** catches the rejected promise automatically |
| Middleware: `next(err)`                 | Explicit hand-off                                                 |
| Multer limit exceeded                   | Multer calls `next(err)` with a `MulterError`                     |

> ⚠️ In **Express 4** (which most tutorials still use), errors from `async`
> handlers were **not** caught. The request would hang and you'd see an
> "unhandled promise rejection" warning. That's why older code wraps handlers in
> `try/catch` or an `asyncHandler` helper. We use Express 5, so we don't need
> that.

## Status codes used in this project

| Code  | Name                  | When                                         |
| ----- | --------------------- | -------------------------------------------- |
| `200` | OK                    | Successful GET                               |
| `201` | Created               | Files uploaded                               |
| `400` | Bad Request           | No files, wrong field, file too big          |
| `404` | Not Found             | Unknown route (later: unknown file)          |
| `500` | Internal Server Error | Anything unexpected (a bug)                  |

Rule of thumb: **4xx = the client's fault, 5xx = the server's fault.** In your
Flutter app, a 4xx means "show the user a message", and a 5xx means "something
broke, maybe retry or report it".

## What a client sees

```bash
curl -X POST http://localhost:3000/api/v1/files
# {"error":"No files uploaded. Use form field 'files'."}         (400)

curl -F "wrong=@a.txt" http://localhost:3000/api/v1/files
# {"error":"Unexpected file field"}                               (400)

curl http://localhost:3000/api/v1/nope
# {"error":"Route GET /api/v1/nope not found"}                    (404)
```

In Flutter you can parse this into one model for every endpoint:

```dart
on DioException catch (e) {
  final message = e.response?.data['error'] ?? 'Unknown error';
}
```

**Next:** [11 · How to add a feature](11-how-to-add-a-feature.md)
