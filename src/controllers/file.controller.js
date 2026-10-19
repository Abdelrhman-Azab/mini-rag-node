const AppError = require("../utils/AppError");
const fileService = require("../services/file.service");

const uploadFiles = (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError("No files uploaded. Use form field 'files'.", 400);
  }
  res.status(201).json({
    message: "Files uploaded successfully",
    files: req.files.map(fileService.toFileInfo),
  });
};

const listFiles = async (req, res) => {
  const files = await fileService.listFiles();
  res.json({ files });
};

module.exports = { uploadFiles, listFiles };
