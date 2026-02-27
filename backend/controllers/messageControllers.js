const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

// @desc    Get all Messages
// @route   GET /api/message/:chatId
// @access  Protected
const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "name avatar email")
            .populate("replyTo")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Create New Message
// @route   POST /api/message/
// @access  Protected
const sendMessage = async (req, res) => {
    const { content, chatId, type, replyTo, isForwarded } = req.body;

    if (!chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }

    var newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId,
        type: type || 'text',
        replyTo: replyTo || null,
        isForwarded: isForwarded || false,
    };

    try {
        var message = await Message.create(newMessage);

        message = await message.populate("sender", "name avatar");
        message = await message.populate("chat");
        message = await message.populate("replyTo");
        message = await User.populate(message, {
            path: "chat.users",
            select: "name avatar email",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        res.json(message);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Delete Message
// @route   DELETE /api/message/:messageId
// @access  Protected
const deleteMessage = async (req, res) => {
    const { deleteForEveryone } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).send("Message not found");
        }

        if (deleteForEveryone && message.sender.toString() === req.user._id.toString()) {
            message.isDeletedForEveryone = true;
            message.content = "This message was deleted";
            await message.save();
            return res.json(message);
        } else {
            // Soft delete for me
            if (!message.deletedFor.includes(req.user._id)) {
                message.deletedFor.push(req.user._id);
                await message.save();
            }
            return res.json({ message: "Deleted for you" });
        }
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Edit Message
// @route   PUT /api/message/:messageId
// @access  Protected
const editMessage = async (req, res) => {
    const { content } = req.body;
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).send("Message not found");
        }

        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(401).send("Not authorized to edit this message");
        }

        if (message.isDeletedForEveryone) {
            return res.status(400).send("Cannot edit a deleted message");
        }

        message.content = content;
        message.isEdited = true;
        await message.save();

        const updatedMessage = await Message.findById(req.params.messageId)
            .populate("sender", "name avatar email")
            .populate("replyTo")
            .populate("chat");

        res.json(updatedMessage);
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};

// @desc    Mark Messages as Read
// @route   PUT /api/message/read
// @access  Protected
const markMessagesRead = async (req, res) => {
    const { chatId } = req.body;

    try {
        await Message.updateMany(
            { chat: chatId, sender: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );
        res.json({ message: "Messages marked as read" });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
}

module.exports = { allMessages, sendMessage, deleteMessage, editMessage, markMessagesRead };
