const router = require("express").Router();
const controller = require("../controllers/hubController");
const { authenticate, authorizeRole } = require("../middlewares/auth");

const admins = [authenticate, authorizeRole("Admin", "SuperAdmin", "SystemAdmin")];
router.get("/", controller.list);
router.get("/admin", ...admins, controller.adminList);
router.get("/:id", controller.get);
router.post("/", ...admins, controller.create);
router.put("/:id", ...admins, controller.update);
router.delete("/:id", authenticate, authorizeRole("SuperAdmin", "SystemAdmin"), controller.remove);

module.exports = router;
