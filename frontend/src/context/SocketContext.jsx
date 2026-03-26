import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        let newSocket;

        if (user && token) {
            // Ensure socketUrl points to the root, not /api
            const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const socketUrl = rawUrl.replace('/api', '');

            newSocket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                auth: { token }
            });

            newSocket.on('connect', () => {
                console.log('Connected securely to socket server:', newSocket.id);
            });

            setSocket(newSocket);
        }

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [user, token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    return useContext(SocketContext);
};
