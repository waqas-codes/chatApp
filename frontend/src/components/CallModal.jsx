import React, { useContext } from 'react';
import { CallState } from '../context/CallProvider';

const CallModal = () => {
    const { answerCall, call, callAccepted } = CallState();

    return (
        <>
            {call.isReceivingCall && !callAccepted && (
                <div className="fixed bottom-10 right-10 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center space-y-4 animate-bounce">
                    <div className="text-white text-lg font-semibold animate-pulse">
                        <span className="text-green-400">{call.name}</span> is calling...
                    </div>
                    <div className="flex space-x-6">
                        <button
                            className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-full font-bold text-white transition-colors"
                            onClick={answerCall}
                        >
                            Accept
                        </button>
                        <button
                            className="bg-red-500 hover:bg-red-600 px-6 py-2 rounded-full font-bold text-white transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default CallModal;
