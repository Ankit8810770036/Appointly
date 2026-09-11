import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { sound } from '../utils/sound';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    useEffect(() => {
        let newSocket;

        if (user && token) {
            // Ensure socketUrl points to the root, not /api
            const rawUrl = import.meta.env.VITE_API_URL;
            const socketUrl = rawUrl ? rawUrl.replace('/api', '') : (import.meta.env.PROD ? '/' : 'http://localhost:5000');

            newSocket = io(socketUrl, {
                transports: ['websocket', 'polling'],
                auth: { token }
            });

            newSocket.on('connect', () => {
                console.log('Connected securely to socket server:', newSocket.id);
            });

            // Receive initial list of online users
            newSocket.on('online_users_list', (userIds) => {
                if (Array.isArray(userIds)) {
                    setOnlineUsers(new Set(userIds));
                }
            });

            // Listen for user presence changes (online / offline)
            newSocket.on('user_presence_change', ({ userId, isOnline }) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    if (isOnline) {
                        next.add(userId);
                    } else {
                        next.delete(userId);
                    }
                    return next;
                });
            });

            newSocket.on('new_notification', (notif) => {
                console.log('New notification received:', notif);
                sound.notification();
            });

            Promise.resolve().then(() => {
                setSocket(newSocket);
            });
        }

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
            setSocket(null);
            setOnlineUsers(new Set());
        };
    }, [user, token]);

    const isUserOnline = useCallback((userId) => {
        if (!userId) return false;
        return onlineUsers.has(userId);
    }, [onlineUsers]);

    const value = {
        socket,
        onlineUsers,
        isUserOnline
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    return context?.socket || null;
};

export const usePresence = () => {
    const context = useContext(SocketContext);
    return {
        onlineUsers: context?.onlineUsers || new Set(),
        isUserOnline: context?.isUserOnline || (() => false)
    };
};
