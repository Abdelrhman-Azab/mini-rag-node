# mini-rag docs

These docs explain how this project is built and why. They're written for a
**Flutter/Dart developer learning Node.js**, so most concepts come with a Dart
or Flutter comparison.

## Reading order

| #  | File                                                                 | What you'll learn                                                              |
| -- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 01 | [Node basics for Flutter devs](01-node-basics-for-flutter-devs.md)   | Node, npm, `package.json`, `require`, Promises, the event loop, Express        |
| 02 | [Architecture](02-architecture.md)                                   | Why the project is layered, the alternatives, and the rules between layers     |
| 03 | [Request lifecycle](03-request-lifecycle.md)                         | One upload request followed through every file, step by step                   |
| 04 | [Entry point: app.js and server.js](04-entry-point-app-and-server.md) | Why the app and the server live in separate files                              |
| 05 | [Config layer](05-config-layer.md)                                   | Environment variables, `.env`, and one place for settings                      |
| 06 | [Routes layer](06-routes-layer.md)                                   | Mapping URLs and HTTP methods to code, versioning with `/api/v1`               |
| 07 | [Middlewares layer](07-middlewares-layer.md)                         | What middleware is, `next()`, and how multer saves files                       |
| 08 | [Controllers layer](08-controllers-layer.md)                         | The HTTP boundary: reading requests and shaping responses                      |
| 09 | [Services layer](09-services-layer.md)                               | Business logic with no knowledge of HTTP                                       |
| 10 | [Error handling](10-error-handling.md)                               | `AppError`, the error middleware, and status codes                             |
| 11 | [How to add a feature](11-how-to-add-a-feature.md)                   | Hands-on: add `DELETE /api/v1/files/:name` layer by layer                      |

## The project in one picture

```
            HTTP request
                 │
                 ▼
   ┌──────────────────────────┐
   │ server.js                │  starts the process, listens on a port
   │ app.js                   │  builds the Express app
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ routes/                  │  "which code handles POST /api/v1/files?"
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ middlewares/             │  runs before or after handlers (upload, errors)
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ controllers/             │  reads the request, sends the response
   └────────────┬─────────────┘
                ▼
   ┌──────────────────────────┐
   │ services/                │  business logic (files on disk)
   └──────────────────────────┘

   config/ and utils/ are shared by every layer
```
