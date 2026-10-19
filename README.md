# mini-rag-node

A Node.js (Express) server for uploading files. Uploads are saved to a folder on
disk (`./files` by default). This is the first building block of a mini RAG
system.

## Documentation

The [`docs/`](docs/README.md) folder explains the architecture and each layer
in detail. It's written for Flutter developers learning Node, so it starts
with [Node basics](docs/01-node-basics-for-flutter-devs.md) and
[why the project is structured this way](docs/02-architecture.md).

## Requirements

- Node.js >= 22.9 (the scripts use the built-in `--env-file-if-exists` and
  `--watch` flags, so `dotenv` and `nodemon` aren't needed)

## Getting started

```bash
npm install
cp .env.example .env   # adjust values if needed
npm run dev            # restarts on file changes
# or
npm start
```

The server runs on `http://localhost:3000`, and all routes start with `/api/v1`.

## Configuration

These are set in `.env`; see `.env.example`.

| Variable           | Default       | Description                           |
| ------------------ | ------------- | ------------------------------------- |
| `NODE_ENV`         | `development` | Runtime environment                   |
| `PORT`             | `3000`        | HTTP port                             |
| `UPLOAD_DIR`       | `./files`     | Folder where uploaded files are saved |
| `MAX_FILE_SIZE_MB` | `50`          | Max size per file in MB               |
| `MAX_FILES`        | `10`          | Max files per request                 |

## API

### `GET /api/v1/health`

Returns `{ "status": "ok" }`.

### `POST /api/v1/files`

Uploads one or more files as `multipart/form-data`, using the form field
`files`.

```bash
curl -F "files=@./doc.pdf" -F "files=@./notes.txt" http://localhost:3000/api/v1/files
```

Response `201`:

```json
{
  "message": "Files uploaded successfully",
  "files": [
    {
      "originalName": "doc.pdf",
      "savedAs": "1760000000000-doc.pdf",
      "size": 12345,
      "mimeType": "application/pdf"
    }
  ]
}
```

Each file is saved as `<timestamp>-<sanitized name>`, so files with the same
name don't overwrite each other.

### `GET /api/v1/files`

Lists the stored files with `name`, `size` and `uploadedAt`.

### Errors

Errors come back as `{ "error": "<message>" }`:

- `400`: no files, a file over the size limit, too many files, or the wrong
  field name
- `404`: unknown route
- `500`: unexpected error

## Project structure

```
src/
├── config/          # Environment-based configuration
├── routes/          # Route definitions (index.js mounts everything under /api/v1)
├── controllers/     # HTTP layer: reads requests, shapes responses
├── services/        # Business logic (file storage, listing)
├── middlewares/     # Upload (multer), 404 and error handling
├── utils/           # Shared helpers (AppError)
├── app.js           # Express app setup, no listening
└── server.js        # Entry point: prepares the upload dir, starts the server, shuts down cleanly
```

Requests go through **route → middleware → controller → service**. Controllers
don't touch the filesystem directly, and services don't know about HTTP. Because
`app.js` doesn't start a server, tests can import the app without opening a
port.
