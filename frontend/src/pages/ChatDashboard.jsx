import React, { useState } from 'react';
import { ChatState } from '../context/ChatProvider';
import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';

const ChatDashboard = () => {
    const { user } = ChatState();
    const [fetchAgain, setFetchAgain] = useState(false);

    if (!user) return null;

    return (
        <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
            {/* Sidebar - Chat List & Search */}
            <div className="w-full md:w-1/3 lg:w-1/4 h-full border-r border-gray-300 bg-white">
                <Sidebar fetchAgain={fetchAgain} />
            </div>

            {/* Main Chat Area */}
            <div className="hidden md:flex flex-col w-full md:w-2/3 lg:w-3/4 h-full bg-[#efeae2]">
                <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
            </div>
        </div>
    );
};

export default ChatDashboard;
