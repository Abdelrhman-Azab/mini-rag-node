const { Router } = require("express");
const fileRoutes = require("./file.routes");

const router = Router();

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.use("/files", fileRoutes);

module.exports = router;
