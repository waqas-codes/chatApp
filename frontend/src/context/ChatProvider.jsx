import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

export const ENDPOINT = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
    const [selectedChat, setSelectedChat] = useState();
    const [user, setUser] = useState();
    const [notification, setNotification] = useState([]);
    const [chats, setChats] = useState([]);
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

    const navigate = useNavigate();

    // Load user from localStorage on mount
    useEffect(() => {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (userInfo) {
            setUser(userInfo);
        } else {
            navigate("/");
        }
    }, [navigate]);

    // Manage socket connection reactively based on user state
    useEffect(() => {
        if (user && user._id) {
            const newSocket = io(ENDPOINT, {
                query: { userId: user._id }
            });

            setSocket(newSocket);

            // CRITICAL: Identify the user to the server
            newSocket.emit("setup", user);

            newSocket.on("connected", () => {
                console.log("Socket connected and identified");
            });

            newSocket.on("get-online-users", (users) => {
                setOnlineUsers(users);
            });

            return () => {
                newSocket.off("get-online-users");
                newSocket.off("connected");
                newSocket.disconnect();
                setSocket(null);
            };
        }
    }, [user]);

    return (
        <ChatContext.Provider
            value={{
                selectedChat,
                setSelectedChat,
                user,
                setUser,
                notification,
                setNotification,
                chats,
                setChats,
                socket,
                onlineUsers
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const ChatState = () => {
    return useContext(ChatContext);
};

export default ChatProvider;
