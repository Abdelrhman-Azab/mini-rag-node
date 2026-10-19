const fs = require("fs/promises");
const path = require("path");
const config = require("../config");

const ensureUploadDir = () => fs.mkdir(config.upload.dir, { recursive: true });

const buildStoredName = (originalName) => {
  // Strip directory parts and unsafe characters; prefix a timestamp to avoid collisions
  const safeName = path.basename(originalName).replace(/[^\w.\-]/g, "_");
  return `${Date.now()}-${safeName}`;
};

const toFileInfo = (file) => ({
  originalName: file.originalname,
  savedAs: file.filename,
  size: file.size,
  mimeType: file.mimetype,
});

const listFiles = async () => {
  const entries = await fs.readdir(config.upload.dir, { withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const stats = await fs.stat(path.join(config.upload.dir, entry.name));
        return { name: entry.name, size: stats.size, uploadedAt: stats.birthtime };
      })
  );
};

module.exports = { ensureUploadDir, buildStoredName, toFileInfo, listFiles };
