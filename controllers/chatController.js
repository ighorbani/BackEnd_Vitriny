const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { validationResult } = require("express-validator");
const Chat = require("../models/chat");
const User = require("../models/user");
const mongoose = require("mongoose");
const Business = require("../models/business");
const io = require("../socket");

// RETURN CHATS OF SPECIFIC USER
exports.getChats = async (req, res, next) => {
  let userId = req.userId;

  try {
    let chats = await Chat.find({ participants: { $in: userId } })
      .sort("-updatedAt")
      .populate("participants", "userInfo");

    const chatsInfo = chats.map((chat) => {
      const chatDeletingUsers = chat.chatDeletingUser.map((u) => {
        return u.toString();
      });

      if (chatDeletingUsers.includes(userId.toString())) {
        return {};
      }

      let participantIds = chat.participants.map((p) => p._id);
      let mineId = userId;
      // prettier-ignore
      let yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } });
      yoursId = yoursId.toString();
      // prettier-ignore
      let yoursIndex = participantIds.findIndex( (id) => id.toString() !== mineId );

      let notSeenCount = 0;

      for (let i = 0; i < chat.messages.length; i++) {
        if (chat.messages[i].fromUser.toString() === yoursId) {
          if (!chat.messages[i].hasSeen.includes(mineId)) {
            if (
              !chat.messages[i].deletingUser.includes(mineId) &&
              !chat.messages[i].deletingUser.includes(yoursId)
            ) {
              notSeenCount += 1;
            }
          }
        }
      }

      let lastMessageWhose =
        chat.messages.at(-1)?.fromUser.toString() === mineId ? "mine" : "yours";

      let lastMessageMineDeleting = chat.messages
        .at(-1)?.deletingUser.includes(mineId);
      let lastMessageYoursDeleting = chat.messages
        .at(-1)?.deletingUser.includes(yoursId);

      let lastMessage = chat.messages.at(-1)?.message;
      if (lastMessageMineDeleting || lastMessageYoursDeleting) {
        lastMessage = "";
      }

      if (chat.messages.length === 0) {
        return {};
      }
      return {
        _id: chat._id,
        mineId: mineId,
        yoursId: yoursId,
        yoursIndex: yoursIndex,
        name: chat?.participants[yoursIndex]?.userInfo.name,
        pic: chat?.participants[yoursIndex]?.userInfo.pic,
        lastMessage: lastMessage,
        lastMessageTime: chat.messages.at(-1).time
          ? chat.messages.at(-1)?.time
          : "",
        lastMessageWhose: lastMessageWhose,
        lastMessageMineDeleting: lastMessageMineDeleting,
        lastMessageYoursDeleting: lastMessageYoursDeleting,
        lastMessageIsImage: chat.messages.at(-1)?.isImage,
        lastMessageSeen: chat.messages.at(-1)?.hasSeen.includes(yoursId),
        notSeenCount: notSeenCount,
        isOnline: false,
      };
    });

    const realChats = chatsInfo.filter((element) => {
      if (Object.keys(element).length !== 0) {
        return true;
      }
      return false;
    });

    if (realChats.length !== 0) {
      res.status(200).json({
        chats: realChats,
        state: "Ok",
      });
    } else {
      res.status(200).json({
        state: "NoChat",
      });
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CREATE CHAT WITH BUSINESS OWNER
exports.createChatBusiness = async (req, res, next) => {
  const businessId = req.body.businessId;
  // prettier-ignore
  const business =await Business.findById(mongoose.Types.ObjectId(businessId));
  const yoursId = business.creator.toString();
  const mineId = req.userId;

  let retrievedChat = "";

  try {
    let findChat = await Chat.find().or([
      {
        participants: [mineId, yoursId],
      },
      {
        participants: [yoursId, mineId],
      },
    ]);

    findChat = findChat[0];

    if (findChat) {
      retrievedChat = findChat;
    } else {
      retrievedChat = new Chat({
        participants: [mineId, yoursId],
      });
      await retrievedChat.save();
    }

    res.status(201).json({
      chat: retrievedChat,
      state: "GetChat",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CREATE CHAT WITH OTHER USER
exports.createChatUser = async (req, res, next) => {
  // prettier-ignore
  const yoursId = req.body.yoursId;
  const mineId = req.userId;

  let retrievedChat = "";

  try {
    let findChat = await Chat.find().or([
      {
        participants: [mineId, yoursId],
      },
      {
        participants: [yoursId, mineId],
      },
    ]);

    findChat = findChat[0];

    if (findChat) {
      retrievedChat = findChat;
    } else {
      retrievedChat = new Chat({
        participants: [mineId, yoursId],
      });
      await retrievedChat.save();
    }

    res.status(201).json({
      chat: retrievedChat,
      state: "GetChat",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// CREATE CHAT WITH ADMIN
exports.createChatSupport = async (req, res, next) => {
  const supportMessage = req.body.supportMessage;
  // prettier-ignore
  const yoursId = mongoose.Types.ObjectId("6368ea418ef90fbb767a82a6")
  const mineId = req.userId;
  let retrievedChat = "";
  const newMessageObj = {
    message: supportMessage,
    fromUser: yoursId,
    time: new Date(),
    label: "پیام پشتیبانی",
  };

  try {
    let findChat = await Chat.find().or([
      {
        participants: [mongoose.Types.ObjectId(mineId), yoursId],
      },
      {
        participants: [yoursId, mongoose.Types.ObjectId(mineId)],
      },
    ]);
    findChat = findChat[0];
    if (findChat) {
      retrievedChat = findChat;
      retrievedChat.messages.push(newMessageObj);
      await retrievedChat.save();
    } else {
      retrievedChat = new Chat({
        participants: [mineId, yoursId.toString()],
        messages: [newMessageObj],
      });
      await retrievedChat.save();
    }

    res.status(201).json({
      chat: retrievedChat,
      state: "GetChat",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// GET CHAT FOR CHAT PAGE
exports.getChat = async (req, res, next) => {
  const chatId = req.params.chatId;

  try {
    const chat = await Chat.findById(chatId).populate(
      "participants",
      "userInfo"
    );

    if (!chat) {
      const error = new Error("Can't find Chat");
      error.statusCode = 404;
      throw error;
    }

    const participantIds = chat.participants.map((p) => p._id);
    const mineId = req.userId;

    // prettier-ignore
    let yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } });
    const business = await Business.findOne({ creator: yoursId });

    yoursId = yoursId.toString();
    // prettier-ignore
    let yoursIndex = participantIds.findIndex( (id) => id.toString() !== mineId );
    let myIndex = participantIds.findIndex((id) => id.toString() === mineId);

    if (myIndex === -1) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    const chatInfo = {
      _id: chat._id,
      mineId: mineId,
      yoursId: yoursId,
      userSlug: chat?.participants[yoursIndex]?.userInfo.slug,
      yoursIndex: yoursIndex,
      name: chat?.participants[yoursIndex]?.userInfo.name,
      businessName: business ? business.businessInfo.title : "",
      pic: chat?.participants[yoursIndex]?.userInfo.pic,
      isOnline: true,
      mineIsBlocking: chat.blocking.includes(mineId),
      yoursBlocking: chat.blocking.includes(yoursId),
    };

    res.status(200).json({
      chat: chatInfo,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// SEND MESSAGE IN CHAT
exports.addChatMessage = (req, res, next) => {
  const chatId = req.params.chatId;
  const isImage = req.body.isImage;

  let message = "";

  if (isImage) {
    message = req.files.image[0].filename;

    let uploadedImage = path.join(
      __dirname,
      "../",
      "uploads",
      "chat",
      req.files.image[0].filename
    );

    sharp(req.files.image[0].path)
      .resize({ width: 1000 })
      .jpeg({ quality: 80, chromaSubsampling: "4:4:4" })
      .toFile(uploadedImage);
  } else if (req.body.message) {
    message = req.body.message;
  } else {
    const error = new Error("Message is empty");
    error.statusCode = 404;
    throw error;
  }

  let mineId = req.userId;
  let yoursId = "";

  Chat.findById(mongoose.Types.ObjectId(chatId))
    .then((chat) => {
      if (!chat) {
        const error = new Error("Can't find Chat");
        error.statusCode = 404;
        throw error;
      }

      const participantIds = chat.participants.map((p) => p._id);
      // prettier-ignore
      yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } }).toString();
      let myIndex = participantIds.findIndex((id) => id.toString() === mineId);

      if (myIndex === -1) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      const newMessageObj = {
        message: message,
        fromUser: req.userId,
        time: new Date(),
        hasSeen: [],
        isImage: isImage,
      };

      chat.chatDeletingUser = [];
      chat.messages.push(newMessageObj);
      return chat.save();
    })
    .then((result) => {
      const lastMessage = result.messages.at(-1);

      const newMessage = {
        message: lastMessage.message,
        time: lastMessage.time,
        id: lastMessage._id,
        whose: lastMessage.fromUser.toString(),
        isImage: lastMessage.isImage,
        seen: lastMessage.hasSeen.includes(yoursId),
      };

      io.getIO().emit("message", {
        action: "added",
        newMessage: newMessage,
        userIds: [mineId, yoursId],
      });

      res.status(200).json({
        state: "Ok",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// DELETE CHAT MESSAGE
exports.deleteChatMessage = async (req, res, next) => {
  const messageId = req.body.messageId;
  const chatId = req.body.chatId;
  const mineId = req.userId;
  let yoursId = "";
  let owner = "";

  try {
    const chat = await Chat.findById(mongoose.Types.ObjectId(chatId));

    if (!chat) {
      const error = new Error("Can't find Chat");
      error.statusCode = 404;
      throw error;
    }
    const participantIds = chat.participants.map((p) => p._id);
    // prettier-ignore
    yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } }).toString();
    let myIndex = participantIds.findIndex((id) => id.toString() === mineId);

    if (myIndex === -1) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    chat.messages.map((m) => {
      if (m._id.toString() === messageId) {
        owner = m.fromUser.toString();
        m.deletingUser.push(mineId);
      }
    });
    await chat.save();

    io.getIO().emit("message", {
      action: "deleted",
      deletingUser: mineId,
      owner: owner,
      deletedMessage: messageId,
      userIds: [mineId, yoursId],
    });

    res.status(200).json({
      state: "Deleted",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// DELETE CHAT ALL MESSAGES
exports.deleteAllMessages = async (req, res, next) => {
  const chatId = req.body.chatId;
  const mineId = req.userId.toString();
  let yoursId = "";

  try {
    const chat = await Chat.findById(mongoose.Types.ObjectId(chatId));

    if (!chat) {
      const error = new Error("Can't find Chat");
      error.statusCode = 404;
      throw error;
    }

    const participantIds = chat.participants.map((p) => p._id);
    // prettier-ignore
    yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } }).toString();
    let myIndex = participantIds.findIndex((id) => id.toString() === mineId);

    if (myIndex === -1) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    chat.messages.map((m) => {
      m.deletingUser.push(mineId);
    });

    chat.chatDeletingUser.push(mineId);

    await chat.save();

    io.getIO().emit("chat", {
      action: "allDeleted",
      deletingUser: mineId,
      userIds: [mineId, yoursId],
      chatId: chatId,
    });

    res.status(200).json({
      state: "allDeleted",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// RETURN MESSAGES OF A CHAT
exports.getMessages = async (req, res, next) => {
  const userId = req.userId;
  const chatId = req.params.chatId;

  try {
    const givenChat = await Chat.findById(chatId);
    if (!givenChat) {
      const error = new Error("Can't find Chat");
      error.statusCode = 404;
      throw error;
    }
    const participantIds = givenChat.participants.map((p) => p._id);
    const mineId = userId;
    // prettier-ignore
    let yoursId = participantIds.filter((id) => { if (id.toString() !== mineId) { return true; } });
    yoursId = yoursId.toString();
    // prettier-ignore
    let yoursIndex = participantIds.findIndex( (id) => id.toString() !== mineId );
    let myIndex = participantIds.findIndex((id) => id.toString() === mineId);

    if (myIndex === -1) {
      return res.status(401).json({
        state: "Action unAutorized",
      });
    }

    givenChat.messages.map((m) => {
      if (!m.hasSeen.includes(userId)) {
        m.hasSeen.push(userId);
      }
    });

    await givenChat.save();

    let chatMessages = givenChat.messages.map((m) => {
      return {
        message: m.message,
        time: m.time,
        whose:
          m.fromUser == mineId ? "mine" : m.fromUser == yoursId ? "yours" : "",
        isImage: m.isImage,
        id: m._id,
        seen: m.hasSeen.includes(yoursId),
        mineDeleting: m.deletingUser.includes(mineId),
        yoursDeleting: m.deletingUser.includes(yoursId),
      };
    });

    chatMessages = chatMessages.filter((m) => {
      if (m.whose === "mine" && m.mineDeleting) {
        return false;
      } else if (m.whose === "yours" && (m.yoursDeleting || m.mineDeleting)) {
        return false;
      } else {
        return true;
      }
    });

    res.status(200).json({
      messages: chatMessages,
      state: "Ok",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// BLOCK A USER IN CHAT
exports.blockUser = (req, res, next) => {
  const chatId = req.params.chatId;
  const blockingState = req.body.blocking;
  const mineId = req.userId;

  Chat.findById(chatId)
    .then((chat) => {
      if (!chat) {
        const error = new Error("Can't find Chat");
        error.statusCode = 404;
        throw error;
      }

      const participantIds = chat.participants.map((p) => p._id);
      let myIndex = participantIds.findIndex((id) => id.toString() === mineId);
      yoursId = participantIds
        .filter((id) => {
          if (id.toString() !== mineId) {
            return true;
          }
        })
        .toString();

      if (myIndex === -1) {
        return res.status(401).json({
          state: "Action unAutorized",
        });
      }

      if (blockingState) {
        chat.blocking.push(req.userId);
      } else {
        let mineIndex = chat.blocking.findIndex((i) => req.userId);
        chat.blocking.splice(mineIndex, 1);
      }

      return chat.save();
    })
    .then((result) => {
      if (blockingState) {
        io.getIO().emit("blocking", {
          action: "blocked",
          blockingState: blockingState,
          fromUser: req.userId,
          userIds: [mineId, yoursId],
        });
        res.status(200).json({
          state: "Blocked",
        });
      } else {
        io.getIO().emit("blocking", {
          action: "unblocked",
          blockingState: blockingState,
          fromUser: req.userId,
          userIds: [mineId, yoursId],
        });
        res.status(200).json({
          state: "unBlocked",
        });
      }
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// RETURN COUNT OF UNREAD MESSAGES IN A CHAT
exports.fetchUnreadMessages = (req, res, next) => {
  let userId = req.userId;

  Chat.find({ participants: { $in: userId } })
    .then((chats) => {
      let notSeenCount = 0;
      chats.map((chat) => {
        const chatDeletingUsers = chat.chatDeletingUser.map((u) => {
          return u.toString();
        });

        if (chatDeletingUsers.includes(userId.toString())) {
          return {};
        }

        let participantIds = chat.participants.map((p) => p._id);
        let mineId = userId.toString();
        let yoursId = participantIds.filter((id) => {
          if (id.toString() !== mineId) {
            return true;
          }
        });
        yoursId = yoursId.toString();

        for (let i = 0; i < chat.messages.length; i++) {
          if (chat.messages[i].fromUser.toString() === yoursId) {
            if (!chat.messages[i].hasSeen.includes(mineId)) {
              if (
                !chat.messages[i].deletingUser.includes(mineId) &&
                !chat.messages[i].deletingUser.includes(yoursId)
              ) {
                notSeenCount += 1;
              }
            }
          }
        }
      });
      res.status(200).json({
        notSeenCount: notSeenCount,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

// FUNCTION TO ADD MY ID TO SEEN MESSAGE
exports.ISawMessage = async (req, res, next) => {
  let userId = req.userId;
  const messageId = req.body.messageId;
  const chatId = req.params.chatId;
  try {
    let givenChat = await Chat.findById(chatId);

    let givenMessageIndex = givenChat.messages.findIndex(
      (m) => m._id.toString() === messageId
    );

    givenChat?.messages.at(givenMessageIndex).hasSeen.push(userId);
    await givenChat?.save();

    res.status(201).json({
      state: "Ok",
    });

    io.getIO().emit("message", {
      action: "hasRead",
      read: { messageId: messageId, userId: userId },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
