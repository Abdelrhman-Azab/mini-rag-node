# 02 · Architecture

## The short version

The project uses a **layered architecture**, sometimes called "N-tier" or
"Controller–Service". Each folder in `src/` is a layer with **one job**, and
code only calls **downward**:

```
routes  →  middlewares  →  controllers  →  services
                                              ↑
                  config / utils (shared by everyone)
```

## Where we started: one file

The first version was a single `index.js` of about 60 lines. It created the
app, configured multer, defined both routes, handled errors and started the
server. **For a demo that's fine**, but it has problems as soon as the project
grows (and a RAG system *will* grow, with parsing, chunking, embeddings, search
and chat):

1. **Everything changes together.** Changing the upload limit, the response
   format or the storage folder all means editing the same file.
2. **It can't be tested in pieces.** You can't test "list files" without
   starting a real server.
3. **There's no obvious home for new code.** Where would "split a PDF into
   chunks" go? You'd end up with a 2,000-line `index.js`.

It's the Flutter equivalent of putting your API calls, JSON parsing and
business rules all inside `setState` in one `StatefulWidget`.

## The options considered

| Option                               | What it is                                                                                     | Verdict for this project                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Single file**                      | Everything in `index.js`                                                                       | ❌ Doesn't scale, as described above                                                                                       |
| **MVC**                              | Model–View–Controller                                                                          | ⚠️ "View" means server-rendered HTML pages. We return JSON to a client (like a Flutter app), so there's no view            |
| **Layered (routes → controllers → services)** | Split by *technical responsibility*                                                   | ✅ **Chosen.** The standard in the Express community, easy to learn, and with clear places for code                        |
| **Full Clean Architecture**          | Entities, use cases, repositories behind interfaces, dependency inversion, adapters            | ⚠️ Great for big domains, but with one feature (files) it's mostly boilerplate. We can move to it when it pays off (see below) |
| **Feature-based / modular**          | `src/modules/files/{routes,controller,service}.js`                                             | 🔜 A natural next step once there are several features (files, documents, chat…)                                          |

### Why layered and not full Clean Architecture right now?

Clean Architecture is about protecting **business rules** from **frameworks and
infrastructure**. Today our "business rules" are: sanitize a filename, add a
timestamp, list a folder. Adding `FileRepository` interfaces,
`UploadFileUseCase` classes and DTO mappers on top of that would mean writing
three times more code with no gain yet.

The layered structure gives us **the most important ideas from Clean
Architecture** cheaply:

- HTTP details stay in controllers and routes.
- Logic stays in services, which never see `req` or `res`.
- Configuration lives in one place.
- Errors are handled in one place.

When the RAG part arrives (a vector database, an embeddings API, an LLM), we'll
want to swap implementations (for example, local disk storage vs S3, or one
vector DB vs another). **That's** the point where adding repositories or
adapters behind interfaces starts paying for itself.

## How this maps to Flutter Clean Architecture

If you've used the popular Flutter "clean architecture" (data / domain /
presentation), here's the rough mapping:

| Flutter (client)                           | This Node project (server)       | Role                                                    |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------- |
| Widgets / Screens                          | `routes/`                        | Entry points. What the outside world "touches"          |
| Bloc / Cubit / Controller / ViewModel      | `controllers/`                   | Turns input into calls, turns results into output       |
| Use cases + Repositories (domain + data)   | `services/`                      | The actual logic and data access                        |
| Interceptors (dio)                         | `middlewares/`                   | Cross-cutting work around every request                 |
| `flavors` / `--dart-define` / `.env`       | `config/`                        | Environment settings                                    |
| `core/errors/failures.dart`                | `utils/AppError.js`              | A shared error type                                     |
| `main.dart`                                | `server.js`                      | Starts everything                                       |
| `MaterialApp(...)` setup                   | `app.js`                         | Wires everything together                               |

The key idea is the same on both sides: **the UI (or HTTP) layer is thin and
replaceable, and the logic doesn't depend on it.**

## The folder structure

```
src/
├── config/
│   └── index.js               # reads env vars once, exports a frozen object
├── routes/
│   ├── index.js               # root router: /health, mounts /files
│   └── file.routes.js         # POST /files, GET /files
├── middlewares/
│   ├── upload.middleware.js   # multer configured to save into UPLOAD_DIR
│   └── error.middleware.js    # 404 handler + central error handler
├── controllers/
│   └── file.controller.js     # uploadFiles, listFiles (HTTP in → HTTP out)
├── services/
│   └── file.service.js        # filename rules, listing files on disk
├── utils/
│   └── AppError.js            # error class with an HTTP status code
├── app.js                     # builds the Express app (no listen)
└── server.js                  # entry point: prepares the dir, listens, shuts down cleanly
```

### Naming convention

Files are named `<feature>.<layer>.js`: `file.routes.js`, `file.controller.js`,
`file.service.js`. When you add a `document` feature you'll create
`document.routes.js`, `document.controller.js` and `document.service.js`, and
it's obvious at a glance which file does what. It's the same reason Flutter
projects use `auth_bloc.dart`, `auth_repository.dart` and so on.

## The rules between layers

These rules are what make the structure useful. If they're broken, folders
alone don't help.

1. **Dependencies point one way.** Routes may import controllers; controllers
   may import services; services must **never** import controllers or routes.
2. **Only routes, middlewares and controllers know about HTTP.** If you see
   `req`, `res` or a status code inside `services/`, something is in the wrong
   place. (The exception is `AppError` carrying a status code. See
   [10 · Error handling](10-error-handling.md).)
3. **Controllers contain no business logic.** They read input, call a service,
   and send the result back.
4. **Only `config/` reads `process.env`.** Everyone else imports `config`.
5. **Errors are thrown, not sent.** Any layer can `throw`. Only the error
   middleware turns errors into HTTP responses.

## What we'd change as it grows

- **Feature modules**: group by feature instead of by layer:
  `src/modules/files/{file.routes,file.controller,file.service}.js`.
- **Validation layer**: a library like `zod` to validate request bodies and
  query params before they reach the controller.
- **Repositories**: when there's a database or a vector store, data access moves
  out of services into repositories, so services become "use cases".
- **TypeScript**: types like Dart's, with compile-time checks.
- **Tests**: `jest` or `node:test` plus `supertest`, which can call `app`
  directly. That's possible because `app.js` doesn't start a server (see
  [04](04-entry-point-app-and-server.md)).
- **Logging and security**: `pino` for structured logs, and `helmet` plus rate
  limiting for safety.

**Next:** [03 · Request lifecycle](03-request-lifecycle.md)
