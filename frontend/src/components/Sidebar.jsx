import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, MessageSquarePlus, LogOut, Pin, PinOff } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getSender, getSenderFull } from '../utils/chatLogics';
import { useNavigate } from 'react-router-dom';
import GroupChatModal from './GroupChatModal';
import ProfileModal from './ProfileModal';
import useDebounce from '../hooks/useDebounce';

const Sidebar = ({ fetchAgain }) => {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const { user, setUser, selectedChat, setSelectedChat, chats, setChats, onlineUsers, setNotification } = ChatState();
    const navigate = useNavigate();

    const debouncedSearch = useDebounce(search, 500);

    const handleSearch = (e) => {
        setSearch(e.target.value);
    };

    useEffect(() => {
        const performSearch = async () => {
            if (!debouncedSearch) {
                setSearchResults([]);
                return;
            }
            try {
                setLoading(true);
                const { data } = await api.get(`/user?search=${debouncedSearch}`);
                setLoading(false);
                setSearchResults(data);
            } catch (error) {
                toast.error('Failed to load search results');
                setLoading(false);
            }
        };
        performSearch();
    }, [debouncedSearch]);

    const accessChat = async (userId) => {
        try {
            setLoadingChat(true);
            const { data } = await api.post('/chat', { userId });
            if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
            setSelectedChat(data);
            setLoadingChat(false);
            setSearch('');
            setSearchResults([]);
        } catch (error) {
            toast.error('Error fetching the chat');
            setLoadingChat(false);
        }
    };

    const fetchChats = async () => {
        try {
            const { data } = await api.get('/chat');
            setChats(data);
        } catch (error) {
            toast.error('Failed to load chats');
        }
    };

    const handlePinChat = async (e, chatId) => {
        e.stopPropagation();
        try {
            const { data } = await api.put('/chat/pin', { chatId });
            setChats(chats.map(c => c._id === chatId ? data : c));
        } catch (error) {
            toast.error('Failed to pin chat');
        }
    };

    const sortedChats = chats ? [...chats].sort((a, b) => {
        const aPinned = a.pinnedBy?.includes(user?._id);
        const bPinned = b.pinnedBy?.includes(user?._id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
    }) : [];

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        setUser(null);
        setSelectedChat(null);
        setChats([]);
        setNotification([]);
        navigate('/');
    };

    useEffect(() => {
        fetchChats();
    }, [fetchAgain]);

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-300">
                <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-10 h-10 rounded-full cursor-pointer object-cover hover:opacity-80 transition-opacity"
                    onClick={() => setIsProfileModalOpen(true)}
                />
                <div className="flex space-x-3 text-gray-600 relative">
                    <MessageSquarePlus
                        className="w-6 h-6 cursor-pointer hover:text-green-500 transition-colors"
                        onClick={() => setIsGroupModalOpen(true)}
                    />
                    <div className="relative">
                        <MoreVertical
                            className="w-6 h-6 cursor-pointer hover:text-green-500 transition-colors"
                            onClick={() => setShowMenu(!showMenu)}
                        />
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-white shadow-xl rounded-lg py-2 w-48 z-50 border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        setIsProfileModalOpen(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
                                >
                                    <span>Profile</span>
                                </button>
                                <hr className="my-1 border-gray-100" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <GroupChatModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
            <ProfileModal user={user} isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200">
                <div className="relative flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                    <Search className="w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search or start new chat"
                        className="w-full bg-transparent outline-none ml-3 text-sm"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                ) : searchResults?.length > 0 ? (
                    // Search Results
                    searchResults.map((result) => (
                        <div
                            key={result._id}
                            onClick={() => accessChat(result._id)}
                            className="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 transition-colors"
                        >
                            <img
                                src={result.avatar}
                                alt={result.name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="ml-4 flex-1">
                                <h3 className="text-md font-medium text-gray-900">{result.name}</h3>
                                <p className="text-sm text-gray-500 truncate">{result.email}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    // Existing Chats
                    sortedChats ? (
                        sortedChats.map((chat) => {
                            const isPinned = chat.pinnedBy?.includes(user?._id);
                            return (
                                <div
                                    key={chat._id}
                                    onClick={() => setSelectedChat(chat)}
                                    className={`flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 transition-colors group ${selectedChat?._id === chat._id ? 'bg-gray-200' : ''
                                        }`}
                                >
                                    <div className="relative">
                                        <img
                                            src={
                                                !chat.isGroupChat
                                                    ? getSenderFull(user, chat.users)?.avatar
                                                    : 'https://cdn-icons-png.flaticon.com/512/615/615075.png'
                                            }
                                            alt="Avatar"
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {!chat.isGroupChat && onlineUsers?.includes(getSenderFull(user, chat.users)?._id) && (
                                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-md font-medium text-gray-900">
                                                {!chat.isGroupChat
                                                    ? getSender(user, chat.users)
                                                    : chat.chatName}
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                {isPinned && <Pin className="w-3.5 h-3.5 text-green-600 fill-green-600" />}
                                                <button
                                                    onClick={(e) => handlePinChat(e, chat._id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-300 rounded"
                                                >
                                                    {isPinned ? <PinOff className="w-4 h-4 text-gray-400" /> : <Pin className="w-4 h-4 text-gray-400" />}
                                                </button>
                                            </div>
                                        </div>
                                        {chat.latestMessage && (
                                            <p className="text-sm text-gray-500 truncate">
                                                {chat.latestMessage.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-4 text-center text-gray-500">No chats available</div>
                    )
                )}
                {loadingChat && (
                    <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
