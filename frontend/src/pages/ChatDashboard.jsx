import React, { useState } from 'react';
import { ChatState } from '../context/ChatProvider';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';

const ChatDashboard = () => {
    const { user, selectedChat } = ChatState();
    const [fetchAgain, setFetchAgain] = useState(false);

    if (!user) return null;

    return (
        <div className="flex h-screen w-full bg-gray-100 overflow-hidden relative">
            {/* Sidebar - Chat List & Search */}
            <div className={`w-full md:w-1/3 lg:w-1/4 h-full border-r border-gray-300 bg-white ${selectedChat ? 'hidden md:block' : 'block'}`}>
                <Sidebar fetchAgain={fetchAgain} />
            </div>

            {/* Main Chat Area */}
            <div className={`flex flex-col w-full md:w-2/3 lg:w-3/4 h-full bg-[#efeae2] ${selectedChat ? 'block' : 'hidden md:flex items-center justify-center'}`}>
                {selectedChat ? (
                    <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-50">
                        <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-6xl text-gray-400">💬</span>
                        </div>
                        <h2 className="text-2xl font-light text-gray-600">WhatsApp Clone</h2>
                        <p className="text-gray-500">Select a contact or group to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatDashboard;
