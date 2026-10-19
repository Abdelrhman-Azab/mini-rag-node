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
