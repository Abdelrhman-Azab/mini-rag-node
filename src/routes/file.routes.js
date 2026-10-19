const { Router } = require("express");
const upload = require("../middlewares/upload.middleware");
const fileController = require("../controllers/file.controller");

const router = Router();

router.post("/", upload.array("files"), fileController.uploadFiles);
router.get("/", fileController.listFiles);

module.exports = router;
