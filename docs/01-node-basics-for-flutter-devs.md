# 01 · Node basics for Flutter devs

Before the architecture, here are the Node concepts this project uses. Each one
is mapped to something you already know from Dart and Flutter.

## What is Node.js?

Dart runs inside the Dart VM. JavaScript normally runs inside a browser. **Node.js
is a program that runs JavaScript outside the browser**, so JS gets access to
files, the network and processes, much like `dart run` gives Dart access to
`dart:io`.

On the backend, Node is used to write **servers**: programs that wait for HTTP
requests (like the ones your Flutter app sends with `http` or `dio`) and send
back responses.

## npm and package.json, the equivalents of pub and pubspec.yaml

| Dart / Flutter                 | Node                               |
| ------------------------------ | ---------------------------------- |
| `pubspec.yaml`                 | `package.json`                     |
| `pubspec.lock`                 | `package-lock.json`                |
| `flutter pub get`              | `npm install`                      |
| `flutter pub add dio`          | `npm install express`              |
| `.dart_tool/`, pub cache       | `node_modules/` (per project)      |
| `pub.dev`                      | `npmjs.com`                        |
| `flutter run`                  | `npm start` / `npm run dev`        |

Here is our `package.json`:

```json
{
  "name": "mini-rag",
  "type": "commonjs",
  "main": "src/server.js",
  "scripts": {
    "start": "node --env-file-if-exists=.env src/server.js",
    "dev": "node --watch --env-file-if-exists=.env src/server.js"
  },
  "dependencies": {
    "express": "^5.3.0",
    "multer": "^2.4.0"
  },
  "engines": { "node": ">=22.9" }
}
```

- **`scripts`** are named shortcuts. `npm run dev` runs the `dev` command.
  `npm start` is a special shortcut for `npm run start`.
  - `--watch` restarts the server when you save a file. It's like hot restart
    in Flutter, though there's no hot *reload* with state kept.
  - `--env-file-if-exists=.env` loads variables from `.env` (see
    [05 · Config](05-config-layer.md)).
- **`dependencies`**: `^5.3.0` means "5.3.0 or any newer 5.x". Pub's caret syntax
  works the same way.
- **`main`** is the entry file, the equivalent of `lib/main.dart`.
- **`engines`** documents the minimum Node version, like `environment: sdk:` in
  pubspec.

`node_modules/` is never committed. It's rebuilt from the lockfile with
`npm install`.

## Modules: `require` / `module.exports` vs Dart `import`

In Dart every file is a library, and anything not starting with `_` is public.
Node (in **CommonJS** mode, which is `"type": "commonjs"`) works the other way
round: **nothing is public until you export it**.

```js
// src/utils/AppError.js
class AppError extends Error { /* ... */ }
module.exports = AppError;          // export ONE thing
```

```js
// src/services/file.service.js
module.exports = { ensureUploadDir, buildStoredName, toFileInfo, listFiles };  // export several
```

```js
// using them
const AppError = require("../utils/AppError");           // like: import '../utils/app_error.dart';
const fileService = require("../services/file.service"); // like: import '...' as fileService;
const { Router } = require("express");                   // like: import 'package:express/express.dart' show Router;
```

- A relative path (`./`, `../`) loads one of your files. A bare name (`"express"`)
  loads a package from `node_modules`.
- `require("./config")` on a **folder** loads `config/index.js`, the same idea
  as a Dart barrel file.
- `const { Router } = ...` is **destructuring**: it pulls the `Router` property
  out of the exported object.

> There's a newer module system, **ES Modules**, which uses `import x from "y"`
> like Dart. This project uses CommonJS because it's still the most common
> format in Node tutorials and packages. Both work fine.

## Promises and async/await, the equivalent of Future

This maps almost one to one:

| Dart                          | JavaScript                         |
| ----------------------------- | ---------------------------------- |
| `Future<T>`                   | `Promise<T>`                       |
| `async` / `await`             | `async` / `await` (same keywords!) |
| `Future.wait([...])`          | `Promise.all([...])`               |
| `try { await x; } catch (e)`  | `try { await x; } catch (e)`       |

```js
// src/services/file.service.js
const listFiles = async () => {
  const entries = await fs.readdir(config.upload.dir, { withFileTypes: true });
  return Promise.all(entries.filter(/*...*/).map(async (entry) => { /*...*/ }));
};
```

`Promise.all` runs all the `stat` calls **in parallel** and waits for all of
them, just like `Future.wait`.

## The event loop: why "async everything" matters

Node runs your JavaScript on **one thread**. Dart's main isolate works the same
way. While it waits for a disk read or a network call, the thread is free to
handle other requests. That's how one Node process can serve thousands of
clients.

The rule that follows: **never block the thread**. That's why we use
`fs/promises` (`await fs.readdir(...)`) and not `fs.readdirSync(...)`. A sync
call freezes *every* request until it finishes. It's the server version of
doing heavy work in `build()` and dropping frames.

## Arrow functions and objects

```js
const add = (a, b) => a + b;          // Dart: int add(int a, int b) => a + b;
const toFileInfo = (file) => ({       // the ( ) around { } means "return this object"
  originalName: file.originalname,
  size: file.size,
});
```

JS objects (`{ key: value }`) are used where Dart would use a `Map` or a small
data class. There are no types at runtime. If you want types like Dart's, the
next step is **TypeScript**, which this project could adopt later.

## Express: the web framework

Node can create an HTTP server by itself, but it's very low level. **Express**
is the most popular framework on top of it. You can think of it like `shelf`
in Dart, or roughly like `MaterialApp` + `GoRouter` + interceptors for HTTP:

- `const app = express()` creates the application.
- `app.get("/path", handler)` registers a **route**.
- `app.use(fn)` registers **middleware**, a function that runs for many requests.
- A handler receives `(req, res)`: the incoming **request** and the **response**
  you write to.

```js
app.get("/hello", (req, res) => {
  res.status(200).json({ message: "hi" });
});
```

Every Express concept used in this project is explained in the layer docs that
follow.

**Next:** [02 · Architecture](02-architecture.md)
