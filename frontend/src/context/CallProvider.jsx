import React, { createContext, useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { ChatState } from './ChatProvider';

const SocketContext = createContext();

const CallProvider = ({ children }) => {
    const [stream, setStream] = useState(null);
    const [me, setMe] = useState('');
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('');

    const { user } = ChatState();

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const socketRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Create socket connection only when user is available
        const socket = io('http://localhost:5000');
        socketRef.current = socket;

        socket.emit('setup', user);

        socket.on('me', (id) => setMe(id));

        socket.on('callUser', ({ from, name: callerName, signal }) => {
            setCall({ isReceivingCall: true, from, name: callerName, signal });
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const answerCall = async () => {
        setCallAccepted(true);

        try {
            const Peer = (await import('simple-peer')).default;
            const peer = new Peer({ initiator: false, trickle: false, stream });

            peer.on('signal', (data) => {
                socketRef.current?.emit('answerCall', { signal: data, to: call.from });
            });

            peer.on('stream', (currentStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = currentStream;
                }
            });

            peer.signal(call.signal);
            connectionRef.current = peer;
        } catch (err) {
            console.error('Error answering call:', err);
        }
    };

    const callUser = async (id) => {
        try {
            const Peer = (await import('simple-peer')).default;
            const peer = new Peer({ initiator: true, trickle: false, stream });

            peer.on('signal', (data) => {
                socketRef.current?.emit('callUser', {
                    userToCall: id,
                    signalData: data,
                    from: me,
                    name: user?.name
                });
            });

            peer.on('stream', (currentStream) => {
                if (userVideo.current) {
                    userVideo.current.srcObject = currentStream;
                }
            });

            socketRef.current?.on('callAccepted', (signal) => {
                setCallAccepted(true);
                peer.signal(signal);
            });

            connectionRef.current = peer;
        } catch (err) {
            console.error('Error calling user:', err);
        }
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        socketRef.current?.emit('endCall', { to: call.from });
    };

    return (
        <SocketContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            userVideo,
            stream,
            name,
            setName,
            callEnded,
            me,
            callUser,
            leaveCall,
            answerCall,
            setStream
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export { CallProvider, SocketContext };
