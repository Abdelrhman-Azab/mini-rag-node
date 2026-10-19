const multer = require("multer");
const config = require("../config");
const fileService = require("../services/file.service");

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (req, file, cb) => cb(null, fileService.buildStoredName(file.originalname)),
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeMb * 1024 * 1024,
    files: config.upload.maxFiles,
  },
});

module.exports = upload;
