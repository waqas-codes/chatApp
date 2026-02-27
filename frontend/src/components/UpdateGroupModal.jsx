import React, { useState } from 'react';
import { X, UserPlus, Settings, LogOut, Search } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';
import api from '../services/api';
import toast from 'react-hot-toast';

const UpdateGroupModal = ({ fetchAgain, setFetchAgain, fetchMessages }) => {
    const [groupChatName, setGroupChatName] = useState('');
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [renameLoading, setRenameLoading] = useState(false);

    const { selectedChat, setSelectedChat, user } = ChatState();

    if (!selectedChat) return null;

    const handleRemove = async (userToRemove) => {
        if (selectedChat.groupAdmin._id !== user._id && userToRemove._id !== user._id) {
            toast.error("Only admins can remove someone!");
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.put(`/chat/groupremove`, {
                chatId: selectedChat._id,
                userId: userToRemove._id,
            });

            userToRemove._id === user._id ? setSelectedChat() : setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            fetchMessages(); // Refresh messages if user removed themselves
            setLoading(false);
            toast.success(userToRemove._id === user._id ? "You left the group" : "User removed");
        } catch (error) {
            toast.error("Failed to remove/leave group");
            setLoading(false);
        }
    };

    const handleRename = async () => {
        if (!groupChatName) return;

        try {
            setRenameLoading(true);
            const { data } = await api.put(`/chat/rename`, {
                chatId: selectedChat._id,
                chatName: groupChatName,
            });

            setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            setRenameLoading(false);
            setGroupChatName("");
            toast.success("Group renamed!");
        } catch (error) {
            toast.error("Failed to rename group");
            setRenameLoading(false);
            setGroupChatName("");
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get(`/user?search=${query}`);
            setLoading(false);
            setSearchResults(data);
        } catch (error) {
            toast.error('Failed to load search results');
            setLoading(false);
        }
    };

    const handleAddUser = async (userToAdd) => {
        if (selectedChat.users.find((u) => u._id === userToAdd._id)) {
            toast.error("User already in group!");
            return;
        }

        if (selectedChat.groupAdmin._id !== user._id) {
            toast.error("Only admins can add members!");
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.put(`/chat/groupadd`, {
                chatId: selectedChat._id,
                userId: userToAdd._id,
            });

            setSelectedChat(data);
            setFetchAgain(!fetchAgain);
            setLoading(false);
            toast.success("User added!");
        } catch (error) {
            toast.error("Failed to add user");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-green-600 p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold">{selectedChat.chatName} Settings</h2>
                    <X className="w-6 h-6 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setSelectedChat({ ...selectedChat, showUpdateModal: false })} />
                </div>

                <div className="p-6 space-y-6">
                    {/* Member Tags */}
                    <div className="flex flex-wrap gap-2">
                        {selectedChat.users.map((u) => (
                            <div key={u._id} className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1 ${u._id === selectedChat.groupAdmin._id ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                <span>{u.name} {u._id === selectedChat.groupAdmin._id && "(Admin)"}</span>
                                {u._id !== user._id && (
                                    <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => handleRemove(u)} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Rename Section */}
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="New Group Name"
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
                            value={groupChatName}
                            onChange={(e) => setGroupChatName(e.target.value)}
                        />
                        <button
                            onClick={handleRename}
                            disabled={renameLoading}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                        >
                            Update
                        </button>
                    </div>

                    {/* Add User Section */}
                    {selectedChat.groupAdmin._id === user._id && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 flex items-center"><UserPlus className="w-4 h-4 mr-2" /> Add Members</label>
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-green-500"
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {loading && <div className="text-xs text-center text-gray-500">Searching...</div>}
                                {searchResults?.slice(0, 3).map((res) => (
                                    <div
                                        key={res._id}
                                        onClick={() => handleAddUser(res)}
                                        className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                                    >
                                        <img src={res.avatar} alt={res.name} className="w-6 h-6 rounded-full border" />
                                        <span className="ml-2 text-sm">{res.name}</span>
                                        <UserPlus className="ml-auto w-4 h-4 text-green-600" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 flex justify-between">
                    <button
                        onClick={() => handleRemove(user)}
                        className="bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-200 flex items-center"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> Leave Group
                    </button>
                    <button
                        onClick={() => setSelectedChat({ ...selectedChat, showUpdateModal: false })}
                        className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-300"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateGroupModal;
