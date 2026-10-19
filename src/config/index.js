const path = require("path");

const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "files")),
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 50,
    maxFiles: Number(process.env.MAX_FILES) || 10,
  },
});

module.exports = config;
