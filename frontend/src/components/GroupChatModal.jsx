import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUrl';

const GroupChatModal = ({ isOpen, onClose }) => {
    const [groupChatName, setGroupChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user, chats, setChats } = ChatState();

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

    const handleSelectUser = (userToAdd) => {
        if (selectedUsers.find((u) => u._id === userToAdd._id)) {
            toast.error('User already added');
            return;
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    const handleDelete = (userToDelete) => {
        setSelectedUsers(selectedUsers.filter((sel) => sel._id !== userToDelete._id));
    };

    const handleSubmit = async () => {
        if (!groupChatName || selectedUsers.length < 2) {
            toast.error('Please name the group and select at least 2 other users');
            return;
        }

        try {
            const { data } = await api.post('/chat/group', {
                name: groupChatName,
                users: JSON.stringify(selectedUsers.map((u) => u._id)),
            });
            setChats([data, ...chats]);
            toast.success('Group chat created!');
            onClose();
        } catch (error) {
            toast.error('Failed to create the group');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-green-600 p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold">New Group Chat</h2>
                    <X className="w-6 h-6 cursor-pointer hover:rotate-90 transition-transform" onClick={onClose} />
                </div>

                <div className="p-6 space-y-4">
                    {/* Group Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Family Group"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                            value={groupChatName}
                            onChange={(e) => setGroupChatName(e.target.value)}
                        />
                    </div>

                    {/* User Search Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Add Members</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Selected Users Tags */}
                    <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((u) => (
                            <div key={u._id} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1">
                                <span>{u.name}</span>
                                <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => handleDelete(u)} />
                            </div>
                        ))}
                    </div>

                    {/* Search Results */}
                    <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Searching...</div>
                        ) : searchResults?.slice(0, 4).map((res) => (
                            <div
                                key={res._id}
                                onClick={() => handleSelectUser(res)}
                                className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                            >
                                <img src={getAvatarUrl(res.avatar)} alt={res.name} className="w-8 h-8 rounded-full border" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium">{res.name}</p>
                                    <p className="text-[10px] text-gray-500">{res.email}</p>
                                </div>
                                {selectedUsers.find(sel => sel._id === res._id) && <Check className="ml-auto w-4 h-4 text-green-600" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 active:scale-95 transition-all shadow-lg"
                    >
                        Create Group
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupChatModal;
