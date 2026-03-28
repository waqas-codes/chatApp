// const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const connectDB = require("./config/db.js");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const User = require("./models/userModel");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 login/register requests per window
    message: "Too many authentication attempts from this IP, please try again later."
});

// Apply rate limiting ONLY to sensitive authentication routes
app.use("/api/user/login", authLimiter);
app.use("/api/user/register", authLimiter);
app.use("/api/user/verify-otp", authLimiter);
app.use("/api/user/resend-otp", authLimiter);
app.use("/api/user/forgot-password", authLimiter);
app.use("/api/user/reset-password", authLimiter);

// Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/upload", uploadRoutes);

// Make uploads folder accessible
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const io = require("socket.io")(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("Connected to socket.io", socket.id);

    socket.on("setup", (userData) => {
        if (!userData || !userData._id) return;
        socket.userId = userData._id;
        socket.join(userData._id);
        onlineUsers.set(userData._id, socket.id);
        io.emit("get-online-users", Array.from(onlineUsers.keys()));
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat || !chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id.toString() === newMessageRecieved.sender._id.toString()) return;
            socket.in(user._id.toString()).emit("message recieved", newMessageRecieved);
        });
    });

    socket.on("message read", (chatId) => {
        socket.in(chatId).emit("message read", chatId);
    });

    socket.on("message deleted", (messageData) => {
        if (!messageData || !messageData.chat || !messageData.chat.users) return;
        var chat = messageData.chat;
        chat.users.forEach((user) => {
            if (user._id.toString() === messageData.sender.toString()) return;
            socket.in(user._id.toString()).emit("message deleted", messageData);
        });
    });

    socket.on("message edited", (messageData) => {
        if (!messageData || !messageData.chat || !messageData.chat.users) return;
        var chat = messageData.chat;
        chat.users.forEach((user) => {
            if (user._id.toString() === messageData.sender._id.toString()) return;
            socket.in(user._id.toString()).emit("message edited", messageData);
        });
    });

    // WebRTC Signaling
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        socket.in(userToCall).emit("callUser", { signal: signalData, from, name });
    });

    socket.on("answerCall", (data) => {
        socket.in(data.to).emit("callAccepted", data.signal);
    });

    socket.on("endCall", ({ to }) => {
        socket.in(to).emit("callEnded");
    });

    socket.on("rejectCall", ({ to }) => {
        socket.in(to).emit("callRejected");
    });

    socket.on("disconnect", async () => {
        console.log("USER DISCONNECTED", socket.id);
        const userId = socket.userId;
        if (userId) {
            onlineUsers.delete(userId);
            io.emit("get-online-users", Array.from(onlineUsers.keys()));
            // Update lastSeen in DB
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date(), isOnline: false });
            } catch (err) {
                console.error("Error updating lastSeen:", err.message);
            }
        }
    });
});
