import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import { ChatState } from './ChatProvider';
import toast from 'react-hot-toast';

const CallContext = createContext();

const CallProvider = ({ children }) => {
    const { socket, user } = ChatState();

    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [stream, setStream] = useState(null);
    const [name, setName] = useState('');
    const [call, setCall] = useState({});
    const [isCallUIOpen, setIsCallUIOpen] = useState(false);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        if (!socket) return;

        socket.on('callUser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal });
        });

        socket.on('callRejected', () => {
            toast.error("Call Rejected");
            resetCallState();
        });

        socket.on('endCall', () => {
            resetCallState();
        });

        return () => {
            socket.off('callUser');
            socket.off('callRejected');
            socket.off('endCall');
        };
    }, [socket]);

    const resetCallState = () => {
        setCallAccepted(false);
        setCallEnded(true);
        setIsCallUIOpen(false);
        setCall({});
        if (connectionRef.current) {
            connectionRef.current.destroy();
            connectionRef.current = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const answerCall = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream);
            setIsCallUIOpen(true);
            if (myVideo.current) myVideo.current.srcObject = currentStream;

            setCallAccepted(true);

            const peer = new Peer({
                initiator: false,
                trickle: false,
                stream: currentStream,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                    ],
                },
            });

            peer.on('signal', (data) => {
                socket.emit('answerCall', { signal: data, to: call.from });
            });

            peer.on('stream', (remoteStream) => {
                if (userVideo.current) userVideo.current.srcObject = remoteStream;
            });

            peer.signal(call.signal);
            connectionRef.current = peer;
        }).catch((err) => {
            toast.error("Failed to access camera/microphone");
            console.error(err);
        });
    };

    const callUser = (id, currentStream) => {
        setIsCallUIOpen(true);
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: currentStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });

        peer.on('signal', (data) => {
            socket.emit('callUser', {
                userToCall: id,
                signalData: data,
                from: user._id,
                name: user.name,
            });
        });

        peer.on('stream', (remoteStream) => {
            if (userVideo.current) userVideo.current.srcObject = remoteStream;
        });

        socket.on('callAccepted', (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const rejectCall = () => {
        if (call.from) {
            socket.emit('rejectCall', { to: call.from });
        }
        resetCallState();
    };

    const leaveCall = () => {
        const to = call.from || call.userToCall; // Need to ensure we have the target ID
        if (to) {
            socket.emit('endCall', { to });
        }
        resetCallState();
    };

    return (
        <CallContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            userVideo,
            stream,
            setStream,
            name,
            setName,
            callEnded,
            me: user?._id,
            isCallUIOpen,
            setIsCallUIOpen,
            callUser,
            leaveCall,
            answerCall,
            rejectCall,
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const CallState = () => useContext(CallContext);

export default CallProvider;
