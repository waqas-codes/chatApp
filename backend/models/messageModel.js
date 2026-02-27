const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: { type: String, trim: true },
        type: { type: String, enum: ['text', 'image', 'video', 'document', 'voice'], default: 'text' },
        chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
        isForwarded: { type: Boolean, default: false },
        isEdited: { type: Boolean, default: false },
        isDeletedForEveryone: { type: Boolean, default: false },
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
