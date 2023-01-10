const express = require("express");
const { body } = require("express-validator");
const chatController = require("../controllers/chatController");
const router = express.Router();
const isAuth = require("../middleware/is-auth");

router.get("/chats", isAuth, chatController.getChats);
router.get("/getMessages/:chatId", isAuth, chatController.getMessages);
router.post("/createChatBusiness", isAuth, chatController.createChatBusiness);
router.post("/createChatUser", isAuth, chatController.createChatUser);
router.post("/createChatSupport", isAuth, chatController.createChatSupport);
router.get("/chat/:chatId", isAuth, chatController.getChat);
router.post("/addChatMessge/:chatId", isAuth, chatController.addChatMessage);
router.put("/deleteChatMessage/", isAuth, chatController.deleteChatMessage);
router.put("/deleteChat", isAuth, chatController.deleteAllMessages);
router.post("/blockUser/:chatId", isAuth, chatController.blockUser);
router.get("/fetchUnreadMessages/", isAuth, chatController.fetchUnreadMessages);
router.put("/ISawMessage/:chatId", isAuth, chatController.ISawMessage);

module.exports = router;
