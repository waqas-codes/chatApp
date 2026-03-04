import React, { useEffect, useState, useRef, useContext, useCallback } from 'react';
import { Send, Phone, Video, MoreHorizontal, Paperclip, Smile, Search, ArrowLeft, Reply, Forward, X } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';
import { SocketContext } from '../context/CallProvider';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getSender, getSenderFull } from '../utils/chatLogics';
import UpdateGroupModal from './UpdateGroupModal';
import ProfileModal from './ProfileModal';
import useDebounce from '../hooks/useDebounce';
import io from 'socket.io-client';

const ENDPOINT = 'http://localhost:5000';
let socket;
let selectedChatCompare;

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
    const { callUser, myVideo, userVideo, callAccepted, callEnded, stream, setStream, leaveCall } = useContext(SocketContext);
    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const { selectedChat, user, notification, setNotification, chats } = ChatState();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatAreaRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '💯', '🙏', '😴', '🤣', '😊', '🥺', '😤', '🤝', '💪', '✨', '🌟', '💀', '🫡', '🤗', '😏', '🙄', '😬'];

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Socket setup
    useEffect(() => {
        socket = io(ENDPOINT);
        if (user) {
            socket.emit('setup', user);
        }
        socket.on('connected', () => setSocketConnected(true));
        socket.on('typing', () => setIsTyping(true));
        socket.on('stop typing', () => setIsTyping(false));

        return () => {
            socket.disconnect();
        };
    }, [user]);

    // Fetch messages when chat changes
    const fetchMessages = useCallback(async () => {
        if (!selectedChat) return;
        try {
            setLoading(true);
            const { data } = await api.get(`/message/${selectedChat._id}`);
            setMessages(data);
            setLoading(false);
            socket.emit('join chat', selectedChat._id);
        } catch (error) {
            toast.error('Failed to load messages');
            setLoading(false);
        }
    }, [selectedChat]);

    useEffect(() => {
        fetchMessages();
        selectedChatCompare = selectedChat;
    }, [selectedChat, fetchMessages]);

    // Mark messages as read + scroll
    useEffect(() => {
        if (selectedChat && messages.length > 0) {
            const unreadMessages = messages.filter(
                m => m.sender._id !== user._id && !m.readBy?.includes(user._id)
            );
            if (unreadMessages.length > 0) {
                api.put('/message/read', { chatId: selectedChat._id })
                    .then(() => {
                        socket.emit('message read', selectedChat._id);
                    })
                    .catch(console.error);
            }
        }
        scrollToBottom();
    }, [messages, isTyping, selectedChat, user]);

    // Socket listeners for real-time events
    useEffect(() => {
        if (!socket) return;

        const handleMessageReceived = (newMessageReceived) => {
            if (newMessageReceived.sender._id === user._id) return;

            if (
                !selectedChatCompare ||
                selectedChatCompare._id !== newMessageReceived.chat._id
            ) {
                setNotification(prev => {
                    if (!prev.find(n => n._id === newMessageReceived._id)) {
                        return [newMessageReceived, ...prev];
                    }
                    return prev;
                });
                setFetchAgain(prev => !prev);
            } else {
                setMessages(prev => [...prev, newMessageReceived]);
            }
        };

        const handleMessageRead = (chatId) => {
            if (selectedChatCompare && selectedChatCompare._id === chatId) {
                setMessages(prevMessages =>
                    prevMessages.map(msg => {
                        if (msg.sender._id === user?._id) {
                            const otherUser = selectedChatCompare.users?.find(u => u._id !== user._id);
                            if (otherUser && !msg.readBy?.includes(otherUser._id)) {
                                return { ...msg, readBy: [...(msg.readBy || []), otherUser._id] };
                            }
                        }
                        return msg;
                    })
                );
            }
        };

        const handleMessageDeleted = (deletedMessage) => {
            if (deletedMessage.sender === user._id) return;
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === deletedMessage._id ? deletedMessage : msg
                )
            );
        };

        const handleMessageEdited = (editedMessage) => {
            if (editedMessage.sender._id === user._id) return;
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === editedMessage._id ? editedMessage : msg
                )
            );
        };

        socket.on('message recieved', handleMessageReceived);
        socket.on('message read', handleMessageRead);
        socket.on('message deleted', handleMessageDeleted);
        socket.on('message edited', handleMessageEdited);

        return () => {
            socket.off('message recieved', handleMessageReceived);
            socket.off('message read', handleMessageRead);
            socket.off('message deleted', handleMessageDeleted);
            socket.off('message edited', handleMessageEdited);
        };
    }, [user, setNotification, setFetchAgain]);

    // Send message handler
    const sendMessage = async (e) => {
        if (e.key && e.key !== 'Enter') return;
        if (e.type === 'keydown' && e.key !== 'Enter') return;

        if (!newMessage && !selectedFile) return;
        if (!selectedChat) return;

        socket.emit('stop typing', selectedChat._id);
        try {
            let msgContent = newMessage;
            let msgType = 'text';

            if (selectedFile) {
                setIsUploading(true);
                const formData = new FormData();
                formData.append('media', selectedFile);

                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                msgContent = uploadRes.data.filePath;

                if (selectedFile.type.startsWith('image/')) msgType = 'image';
                else if (selectedFile.type.startsWith('video/')) msgType = 'video';
                else if (selectedFile.type.startsWith('audio/')) msgType = 'voice';
                else msgType = 'document';

                setSelectedFile(null);
                setIsUploading(false);
            }

            setNewMessage('');
            const { data } = await api.post('/message', {
                content: msgContent,
                chatId: selectedChat._id,
                type: msgType,
                replyTo: replyToMessage?._id || null,
            });

            socket.emit('new message', data);
            setMessages(prev => [...prev, data]);
            setReplyToMessage(null);
            setFetchAgain(prev => !prev);
        } catch (error) {
            setIsUploading(false);
            toast.error('Failed to send message');
        }
    };

    const forwardMessage = async (targetChatId) => {
        try {
            const { data } = await api.post('/message', {
                content: messageToForward.content,
                chatId: targetChatId,
                type: messageToForward.type,
                isForwarded: true
            });
            socket.emit('new message', data);
            setShowForwardModal(false);
            setMessageToForward(null);
            toast.success('Message forwarded');
            setFetchAgain(prev => !prev);
        } catch (error) {
            toast.error('Failed to forward message');
        }
    };

    // Filtered messages for search
    const filteredMessages = messages.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const debouncedNewMessage = useDebounce(newMessage, 1000);

    const typingHandler = (e) => {
        setNewMessage(e.target.value);
        if (!socketConnected || !selectedChat) return;

        if (!typing) {
            setTyping(true);
            socket.emit('typing', selectedChat._id);
        }
    };

    useEffect(() => {
        if (!debouncedNewMessage && typing && selectedChat) {
            socket.emit('stop typing', selectedChat._id);
            setTyping(false);
        }
        // If message stays same for 3s, stop typing
        const timer = setTimeout(() => {
            if (typing && selectedChat) {
                socket.emit('stop typing', selectedChat._id);
                setTyping(false);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [debouncedNewMessage, typing, selectedChat]);


    // Delete message handler
    const handleDelete = async (messageId) => {
        if (window.confirm("Are you sure you want to delete this message?")) {
            try {
                const { data } = await api.delete(`/message/${messageId}/delete`, {
                    data: { deleteForEveryone: true }
                });
                socket.emit("message deleted", data);
                setMessages(prev => prev.map(msg => msg._id === messageId ? data : msg));
            } catch (error) {
                toast.error("Failed to delete message");
            }
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    // Emoji click
    const handleEmojiClick = (emoji) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div
            className="flex flex-col h-full w-full relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragOver && (
                <div className="absolute inset-0 z-50 bg-green-500/20 border-4 border-dashed border-green-500 flex items-center justify-center rounded-lg">
                    <div className="bg-white px-8 py-4 rounded-xl shadow-2xl">
                        <p className="text-green-600 font-semibold text-lg">Drop file to send</p>
                    </div>
                </div>
            )}

            {!selectedChat ? (
                // Empty State
                <div className="flex items-center justify-center flex-1 h-full bg-[#fdfdfd]">
                    <div className="text-center">
                        <div className="w-64 h-64 mx-auto mb-6 opacity-30">
                            <svg viewBox="0 0 303 172" className="w-full h-full">
                                <path fill="#364147" d="M229.565 160.229c32.647-16.166 55.455-50.484 55.455-90.229C285.021 31.337 243.683 0 192.5 0 152.037 0 117.312 21.259 99.487 52.771c-10.804-4.514-22.637-7.021-35.007-7.021C28.928 45.75 0 76.414 0 114.375c0 20.703 8.903 39.322 23.063 52.102H0v5.25h303.02v-5.25h-26.578c-16.836 0-32.478-2.162-46.877-6.248z"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-light text-gray-500 mb-4">WhatsApp Web</h1>
                        <p className="text-gray-400">Send and receive messages directly from your browser.</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex z-10 items-center border-b border-gray-300 justify-between p-3 bg-gray-100 w-full h-16 shadow-sm">
                        <div
                            className="flex items-center cursor-pointer flex-1"
                            onClick={() => {
                                if (selectedChat.isGroupChat) {
                                    setSelectedChat({ ...selectedChat, showUpdateModal: true });
                                } else {
                                    setIsProfileModalOpen(true);
                                }
                            }}
                        >
                            <img
                                src={
                                    !selectedChat.isGroupChat
                                        ? getSenderFull(user, selectedChat.users)?.avatar
                                        : 'https://cdn-icons-png.flaticon.com/512/615/615075.png'
                                }
                                alt="Avatar"
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="ml-4">
                                <h3 className="text-md font-medium text-gray-900">
                                    {!selectedChat.isGroupChat
                                        ? getSender(user, selectedChat.users)
                                        : selectedChat.chatName?.toUpperCase()}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {isTyping ? 'typing...' : 'Click for info'}
                                </p>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex space-x-5 text-gray-500 mr-2">
                            <Video
                                className="w-6 h-6 cursor-pointer hover:text-green-500 transition-colors"
                                onClick={() => {
                                    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
                                        setStream(currentStream);
                                        if (myVideo.current) {
                                            myVideo.current.srcObject = currentStream;
                                        }
                                        if (!selectedChat.isGroupChat) {
                                            const otherUser = getSenderFull(user, selectedChat.users);
                                            callUser(otherUser._id);
                                            setIsVideoCallActive(true);
                                        }
                                    }).catch(() => {
                                        toast.error("Camera/Mic permission denied");
                                    });
                                }}
                            />
                            <Phone className="w-6 h-6 cursor-pointer hover:text-green-500 transition-colors" />
                            <div className="w-px h-6 bg-gray-300 mx-2"></div>
                            <Search
                                className={`w-6 h-6 cursor-pointer hover:text-gray-700 transition-colors ${showSearchBar ? 'text-green-500' : ''}`}
                                onClick={() => setShowSearchBar(!showSearchBar)}
                            />
                            <MoreHorizontal className="w-6 h-6 cursor-pointer hover:text-gray-700 transition-colors" />
                        </div>
                    </div>

                    {/* Search Bar UI */}
                    {showSearchBar && (
                        <div className="bg-white p-2 border-b border-gray-200 flex items-center">
                            <input
                                type="text"
                                placeholder="Search messages..."
                                className="flex-1 bg-gray-100 rounded-lg px-4 py-2 outline-none text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <X className="w-5 h-5 ml-2 cursor-pointer text-gray-400" onClick={() => { setShowSearchBar(false); setSearchQuery(''); }} />
                        </div>
                    )}

                    {/* Active Call UI Layer */}
                    {isVideoCallActive && (
                        <div className="absolute top-16 left-0 w-full h-[calc(100%-4rem)] bg-black z-20 flex flex-col pt-2">
                            <div className="flex-1 flex justify-center items-center relative">
                                {callAccepted && !callEnded ? (
                                    <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-white text-xl animate-pulse">Dialing...</div>
                                )}
                                {stream && (
                                    <video
                                        playsInline
                                        muted
                                        ref={myVideo}
                                        autoPlay
                                        className="absolute bottom-5 right-5 w-32 h-48 rounded-xl border-2 border-white object-cover shadow-lg"
                                    />
                                )}
                            </div>
                            <div className="h-20 bg-gray-900 flex items-center justify-center space-x-8">
                                <button
                                    onClick={() => {
                                        leaveCall();
                                        setIsVideoCallActive(false);
                                    }}
                                    className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                                >
                                    <Phone className="w-6 h-6 text-white transform rotate-[135deg]" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div
                        ref={chatAreaRef}
                        className="flex-1 overflow-y-auto p-6 bg-cover flex flex-col space-y-2 relative"
                        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                            </div>
                        ) : (
                            filteredMessages && filteredMessages.map((m) => {
                                const isSelf = m.sender._id === user._id;
                                const isRead = m.readBy?.length > 0;
                                return (
                                    <div key={m._id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-full group`}>
                                        <div className="flex items-center space-x-2 relative group">
                                            {/* Action Menu (Visible on hover) */}
                                            <div className="hidden group-hover:flex items-center space-x-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm transition-opacity z-10">
                                                <button
                                                    onClick={() => {
                                                        setReplyToMessage(m);
                                                    }}
                                                    className="text-gray-600 hover:bg-gray-100 p-1 rounded-full"
                                                    title="Reply"
                                                >
                                                    <Reply className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setMessageToForward(m);
                                                        setShowForwardModal(true);
                                                    }}
                                                    className="text-gray-600 hover:bg-gray-100 p-1 rounded-full"
                                                    title="Forward"
                                                >
                                                    <Forward className="w-4 h-4" />
                                                </button>
                                                {isSelf && !m.isDeletedForEveryone && (
                                                    <button
                                                        onClick={() => handleDelete(m._id)}
                                                        className="text-red-500 hover:bg-red-100 p-1 rounded-full text-xs"
                                                        title="Delete for everyone"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            <div
                                                className={`px-4 py-2 rounded-lg max-w-md md:max-w-lg lg:max-w-xl shadow-sm relative ${isSelf ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'
                                                    } ${m.isDeletedForEveryone ? 'italic text-gray-500' : ''}`}
                                            >
                                                {selectedChat.isGroupChat && !isSelf && (
                                                    <p className="text-xs font-bold text-green-600 mb-1">{m.sender.name}</p>
                                                )}

                                                {/* Reply Content inside Bubble */}
                                                {m.replyTo && !m.isDeletedForEveryone && (
                                                    <div className="bg-black/5 border-l-4 border-green-500 p-1 mb-1 rounded text-xs opacity-70">
                                                        <p className="font-bold">{m.replyTo.sender?.name || 'User'}</p>
                                                        <p className="truncate">{m.replyTo.content || `[${m.replyTo.type}]`}</p>
                                                    </div>
                                                )}

                                                {/* Forward Label */}
                                                {m.isForwarded && (
                                                    <div className="flex items-center space-x-1 text-gray-400 italic text-[11px] mb-1">
                                                        <Forward className="w-3 h-3" />
                                                        <span>forwarded</span>
                                                    </div>
                                                )}

                                                {/* Render Media or Text */}
                                                {m.type === 'image' && !m.isDeletedForEveryone ? (
                                                    <img src={`http://localhost:5000${m.content}`} alt="attachment" className="rounded-lg max-w-[250px] max-h-[250px] object-cover mb-1 border" />
                                                ) : m.type === 'video' && !m.isDeletedForEveryone ? (
                                                    <video src={`http://localhost:5000${m.content}`} controls className="rounded-lg max-w-[250px] max-h-[250px] mb-1 border" />
                                                ) : m.type === 'voice' && !m.isDeletedForEveryone ? (
                                                    <audio src={`http://localhost:5000${m.content}`} controls className="mb-1 max-w-[250px]" />
                                                ) : m.type === 'document' && !m.isDeletedForEveryone ? (
                                                    <a href={`http://localhost:5000${m.content}`} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-blue-600 underline mb-1">
                                                        <Paperclip className="w-4 h-4" /> <span>Download Document</span>
                                                    </a>
                                                ) : (
                                                    <p className="text-[15px] text-gray-800 break-words whitespace-pre-wrap">{m.content}</p>
                                                )}

                                                <div className="flex items-center justify-end space-x-1 mt-1">
                                                    <p className="text-[10px] text-gray-500">
                                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {m.isEdited && (
                                                        <span className="text-[10px] text-gray-400 italic">edited</span>
                                                    )}
                                                    {isSelf && (
                                                        <span className={`text-[12px] ${isRead ? 'text-[#53bdeb]' : 'text-gray-400'}`}>✓✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex items-start">
                                <div className="bg-white px-4 py-2 rounded-lg shadow-sm rounded-tl-none max-w-[100px] flex gap-1 items-center justify-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-20 left-4 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-72">
                            <div className="grid grid-cols-6 gap-2">
                                {emojis.map((emoji, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-gray-100 flex flex-col w-full border-t border-gray-300 mt-auto relative">
                        {/* Reply Preview */}
                        {replyToMessage && (
                            <div className="bg-white border-l-4 border-green-500 p-2 mb-2 rounded flex justify-between items-center animate-in slide-in-from-bottom-2 duration-200">
                                <div>
                                    <p className="text-xs font-bold text-green-700">Replying to {replyToMessage.sender.name}</p>
                                    <p className="text-xs text-gray-500 truncate max-w-[400px]">
                                        {replyToMessage.type === 'text' ? replyToMessage.content : `[${replyToMessage.type}]`}
                                    </p>
                                </div>
                                <X className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => setReplyToMessage(null)} />
                            </div>
                        )}

                        <div className="flex items-center space-x-3">
                            {selectedFile && (
                                <div className="absolute -top-12 left-14 bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200 text-sm flex items-center space-x-2">
                                    <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                                    <button onClick={() => setSelectedFile(null)} className="text-red-500 font-bold ml-2">x</button>
                                </div>
                            )}

                            <Smile
                                className={`w-7 h-7 cursor-pointer transition-colors ${showEmojiPicker ? 'text-green-500' : 'text-gray-500'}`}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            />

                            <input
                                type="file"
                                ref={fileInputRef}
                                id="file-upload"
                                className="hidden"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                            <label htmlFor="file-upload">
                                <Paperclip className="w-7 h-7 text-gray-500 cursor-pointer hover:text-green-600 transition" />
                            </label>

                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder={isUploading ? "Uploading file..." : "Type a message"}
                                    disabled={isUploading}
                                    className="w-full bg-white rounded-lg px-4 py-3 outline-none focus:ring-1 border-transparent focus:border-green-500"
                                    value={newMessage}
                                    onChange={typingHandler}
                                    onKeyDown={sendMessage}
                                />
                            </div>
                            <button
                                onClick={sendMessage}
                                className="bg-green-600 rounded-full p-2.5 hover:bg-green-700 transition disabled:opacity-50"
                                disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                            >
                                {isUploading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-0.5"></div>
                                ) : (
                                    <Send className="w-5 h-5 text-white ml-0.5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Forward Modal */}
                    {showForwardModal && (
                        <div className="absolute inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                    <h2 className="text-lg font-bold">Forward to...</h2>
                                    <X className="w-5 h-5 cursor-pointer text-gray-500" onClick={() => setShowForwardModal(false)} />
                                </div>
                                <div className="p-2 max-h-[400px] overflow-y-auto">
                                    {chats.map(chat => (
                                        <div key={chat._id} onClick={() => forwardMessage(chat._id)} className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center space-x-3">
                                            <img src={chat.isGroupChat ? 'https://cdn-icons-png.flaticon.com/512/615/615075.png' : getSenderFull(user, chat.users).avatar} className="w-10 h-10 rounded-full" />
                                            <span className="font-medium">{chat.isGroupChat ? chat.chatName : getSender(user, chat.users)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modals */}
                    {selectedChat.isGroupChat && selectedChat.showUpdateModal && (
                        <UpdateGroupModal
                            fetchAgain={fetchAgain}
                            setFetchAgain={setFetchAgain}
                            fetchMessages={fetchMessages}
                        />
                    )}
                    {!selectedChat.isGroupChat && (
                        <ProfileModal
                            user={getSenderFull(user, selectedChat.users)}
                            isOpen={isProfileModalOpen}
                            onClose={() => setIsProfileModalOpen(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default ChatBox;
