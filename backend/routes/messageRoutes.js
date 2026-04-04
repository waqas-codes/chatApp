const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { allMessages, sendMessage, deleteMessage, editMessage, markMessagesRead, clearChat } = require("../controllers/messageControllers");

const router = express.Router();

// Static routes MUST come before parameterized routes
router.route("/read").put(protect, markMessagesRead);
router.route("/clear/:chatId").delete(protect, clearChat);
router.route("/").post(protect, sendMessage);
router.route("/:chatId").get(protect, allMessages);
router.route("/:messageId/delete").delete(protect, deleteMessage);
router.route("/:messageId/edit").put(protect, editMessage);

module.exports = router;
