import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import Peer from 'simple-peer';
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

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        if (!socket) return;

        socket.on('callUser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal });
        });

        return () => {
            socket.off('callUser');
        };
    }, [socket]);

    const answerCall = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
            setStream(currentStream);
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

    const leaveCall = () => {
        setCallEnded(true);
        if (connectionRef.current) connectionRef.current.destroy();
        window.location.reload();
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
            callUser,
            leaveCall,
            answerCall,
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const CallState = () => useContext(CallContext);

export default CallProvider;
