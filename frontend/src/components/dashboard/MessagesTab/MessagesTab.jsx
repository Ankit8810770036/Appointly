import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, MessageSquare, Phone, Video, Info, Paperclip, Smile, Check, CheckCheck, Lock, ShieldCheck } from 'lucide-react';
import { toast } from '../../../utils/toast';
import { messageApi } from '../../../api/messages';
import { useAuth } from '../../../context/AuthContext';
import { useSocket, usePresence } from '../../../context/SocketContext';
import Skeleton from '../../ui/Skeleton/Skeleton';
import './MessagesTab.css';

function getInitials(name = '') {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function renderMessageStatusTick(msg, currentUserId) {
    if (msg.senderId !== currentUserId) return null;

    const isRead = msg.status === 'READ' || msg.isRead;
    const isDelivered = msg.status === 'DELIVERED';

    if (isRead) {
        return (
            <span className="msg-tick-wrap msg-tick-wrap--read" title="Seen / Read">
                <CheckCheck size={14} className="msg-tick msg-tick--read" />
            </span>
        );
    }
    if (isDelivered) {
        return (
            <span className="msg-tick-wrap msg-tick-wrap--delivered" title="Delivered">
                <CheckCheck size={14} className="msg-tick msg-tick--delivered" />
            </span>
        );
    }
    return (
        <span className="msg-tick-wrap msg-tick-wrap--sent" title="Sent">
            <Check size={13} className="msg-tick msg-tick--sent" />
        </span>
    );
}

export default function MessagesTab({ initialUserId }) {
    const { token, user } = useAuth();
    const socket = useSocket();
    const { isUserOnline } = usePresence();

    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(initialUserId || null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [isOtherTyping, setIsOtherTyping] = useState(false);

    const chatEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const selectConversation = (id) => {
        setSelectedId(id);
        setConversations(prev =>
            prev.map(c => c.otherUser.id === id ? { ...c, unreadCount: 0 } : c)
        );
        if (socket && id) {
            socket.emit('mark_read', { otherUserId: id });
            messageApi.markAsRead(id, token).catch(() => {});
        }
    };

    const fetchConversations = useCallback(async () => {
        try {
            const data = await messageApi.getConversations(token);
            setConversations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchMessages = useCallback(async (id, silent = false) => {
        try {
            const data = await messageApi.getChatHistory(id, token);
            setMessages(data);
            if (socket && id) {
                socket.emit('mark_read', { otherUserId: id });
            }
            if (!silent) setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error(err);
        }
    }, [token, socket]);

    useEffect(() => {
        const load = async () => {
            await fetchConversations();
            if (initialUserId) setSelectedId(initialUserId);
        };
        load();
    }, [initialUserId, fetchConversations]);

    useEffect(() => {
        if (selectedId) {
            fetchMessages(selectedId);
        }
    }, [selectedId, fetchMessages]);

    // Real-Time Socket Event Listeners
    useEffect(() => {
        if (!socket) return;

        const handleMsg = (msg) => {
            if (msg.senderId === selectedId || msg.receiverId === selectedId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                if (msg.senderId === selectedId) {
                    socket.emit('mark_read', { otherUserId: selectedId });
                }
                setTimeout(scrollToBottom, 100);
            }
            fetchConversations();
        };

        const handleRead = ({ readerId }) => {
            if (readerId === selectedId) {
                setMessages(prev =>
                    prev.map(m => m.senderId === user.id ? { ...m, status: 'READ', isRead: true } : m)
                );
            }
            setConversations(prev =>
                prev.map(c => {
                    if (c.otherUser.id === readerId && c.lastMessage?.senderId === user.id) {
                        return { ...c, lastMessage: { ...c.lastMessage, status: 'READ', isRead: true } };
                    }
                    return c;
                })
            );
        };

        const handleDelivered = ({ recipientId }) => {
            if (recipientId === selectedId) {
                setMessages(prev =>
                    prev.map(m => (m.senderId === user.id && m.status === 'SENT') ? { ...m, status: 'DELIVERED' } : m)
                );
            }
            setConversations(prev =>
                prev.map(c => {
                    if (c.otherUser.id === recipientId && c.lastMessage?.senderId === user.id && c.lastMessage?.status === 'SENT') {
                        return { ...c, lastMessage: { ...c.lastMessage, status: 'DELIVERED' } };
                    }
                    return c;
                })
            );
        };

        const handleTyping = ({ senderId, isTyping }) => {
            if (senderId === selectedId) {
                setIsOtherTyping(isTyping);
            }
        };

        const handleNotif = (notif) => {
            if (notif.type === 'NEW_MESSAGE') {
                fetchConversations();
                if (selectedId) fetchMessages(selectedId, true);
            }
        };

        socket.on('receive_message', handleMsg);
        socket.on('message_sent', handleMsg);
        socket.on('messages_read', handleRead);
        socket.on('messages_delivered', handleDelivered);
        socket.on('user_typing', handleTyping);
        socket.on('new_notification', handleNotif);

        return () => {
            socket.off('receive_message', handleMsg);
            socket.off('message_sent', handleMsg);
            socket.off('messages_read', handleRead);
            socket.off('messages_delivered', handleDelivered);
            socket.off('user_typing', handleTyping);
            socket.off('new_notification', handleNotif);
        };
    }, [socket, selectedId, user.id, fetchConversations, fetchMessages]);

    // Handle User Typing
    const handleInputChange = (e) => {
        setReply(e.target.value);
        if (socket && selectedId) {
            socket.emit('typing_start', { receiverId: selectedId });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing_stop', { receiverId: selectedId });
            }, 1800);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!reply.trim() || !selectedId) return;
        const msgContent = reply.trim();
        setSending(true);
        setReply('');

        if (socket && selectedId) {
            socket.emit('typing_stop', { receiverId: selectedId });
        }

        try {
            const sentMsg = await messageApi.send({ receiverId: selectedId, content: msgContent }, token);
            if (sentMsg) {
                setMessages(prev => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
            }
            fetchConversations();
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            toast.error('Failed to send: ' + (err.message || 'Server error'));
            setReply(msgContent); // Restore on error
        } finally {
            setSending(false);
        }
    };

    const filteredConvs = conversations.filter(c =>
        c.otherUser.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="msg-tab animate-fade-in">
            <div className="msg-layout">
                <div className="msg-sidebar">
                    <div className="msg-sidebar__header">
                        <h2>Chats</h2>
                    </div>
                    <div className="msg-sidebar__list">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="msg-conv-item">
                                <Skeleton variant="circle" width="44px" height="44px" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton variant="text" width="55%" height="0.9rem" style={{ marginBottom: '6px' }} />
                                    <Skeleton variant="text" width="80%" height="0.75rem" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="msg-chat-area msg-chat-area--loading">
                    <Skeleton variant="rect" height="100%" style={{ borderRadius: 0 }} />
                </div>
            </div>
        </div>
    );

    const selectedConv = conversations.find(c => c.otherUser.id === selectedId);
    const isSelectedOnline = selectedId ? isUserOnline(selectedId) : false;

    // Group messages by date
    const grouped = [];
    let lastDate = null;
    messages.forEach(msg => {
        const d = formatDate(msg.createdAt);
        if (d !== lastDate) {
            grouped.push({ type: 'divider', label: d });
            lastDate = d;
        }
        grouped.push({ type: 'msg', data: msg });
    });

    return (
        <div className="msg-tab animate-fade-in">
            <div className="msg-layout">
                {/* ── Sidebar ── */}
                <div className="msg-sidebar">
                    <div className="msg-sidebar__header">
                        <h2>Chats</h2>
                        {conversations.some(c => c.unreadCount > 0) && (
                            <span className="msg-total-unread">
                                {conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
                            </span>
                        )}
                    </div>

                    {/* Search */}
                    <div className="msg-search-wrap">
                        <Search size={15} className="msg-search-icon" />
                        <input
                            className="msg-search-input"
                            placeholder="Search or start new chat..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="msg-sidebar__list">
                        {filteredConvs.length === 0 ? (
                            <div className="msg-empty-list">No conversations yet.</div>
                        ) : (
                            filteredConvs.map(conv => {
                                const isOnline = isUserOnline(conv.otherUser.id);
                                return (
                                    <div
                                        key={conv.otherUser.id}
                                        className={`msg-conv-item ${selectedId === conv.otherUser.id ? 'msg-conv-item--active' : ''}`}
                                        onClick={() => selectConversation(conv.otherUser.id)}
                                    >
                                        <div className="msg-conv-avatar-wrap">
                                            <div className="msg-conv-avatar">
                                                {getInitials(conv.otherUser.name)}
                                            </div>
                                            <span
                                                className={`msg-presence-badge ${isOnline ? 'msg-presence-badge--online' : 'msg-presence-badge--offline'}`}
                                                title={isOnline ? 'Online' : 'Offline'}
                                            />
                                        </div>
                                        <div className="msg-conv-info">
                                            <div className="msg-conv-top">
                                                <span className="msg-conv-name">{conv.otherUser.name}</span>
                                                <span className={`msg-conv-time ${conv.unreadCount > 0 ? 'msg-conv-time--unread' : ''}`}>
                                                    {formatDate(conv.lastMessage.createdAt)}
                                                </span>
                                            </div>
                                            <div className="msg-conv-bottom">
                                                <span className={`msg-conv-preview ${conv.unreadCount > 0 ? 'msg-conv-preview--unread' : ''}`}>
                                                    {conv.lastMessage.senderId === user.id && (
                                                        renderMessageStatusTick(conv.lastMessage, user.id)
                                                    )}
                                                    <span className="msg-preview-text">{conv.lastMessage.content}</span>
                                                </span>
                                                {conv.unreadCount > 0 && (
                                                    <span className="msg-unread-badge">
                                                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Chat Area ── */}
                <div className="msg-chat-area">
                    {selectedId ? (
                        <>
                            {/* Chat Header */}
                            <div className="msg-chat-header">
                                <div className="msg-chat-header-user">
                                    <div className="msg-chat-avatar-wrap">
                                        <div className="msg-chat-avatar">
                                            {getInitials(selectedConv?.otherUser.name || '')}
                                        </div>
                                        <span className={`msg-presence-badge ${isSelectedOnline ? 'msg-presence-badge--online' : 'msg-presence-badge--offline'}`} />
                                    </div>
                                    <div>
                                        <div className="msg-chat-name">{selectedConv?.otherUser.name}</div>
                                        <div className="msg-chat-role">
                                            {isOtherTyping ? (
                                                <span className="msg-typing-indicator animate-pulse">typing...</span>
                                            ) : isSelectedOnline ? (
                                                <span className="msg-status-online">● Active now</span>
                                            ) : (
                                                <span className="msg-status-offline">○ Offline</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="msg-chat-header-actions">
                                    <button className="msg-header-btn" title="Start Audio Call" onClick={() => toast.info('Starting voice call connection...')}>
                                        <Phone size={18} />
                                    </button>
                                    <button className="msg-header-btn" title="Start Video Consultation" onClick={() => toast.info('Starting video consultation...')}>
                                        <Video size={18} />
                                    </button>
                                    <button className="msg-header-btn" title="Conversation Details">
                                        <Info size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Body */}
                            <div className="msg-history">
                                {/* Encryption indicator banner */}
                                <div className="msg-security-banner">
                                    <Lock size={12} />
                                    <span>Messages are end-to-end encrypted and confidential</span>
                                </div>

                                {grouped.map((item, idx) =>
                                    item.type === 'divider' ? (
                                        <div key={idx} className="msg-date-divider">
                                            <span>{item.label}</span>
                                        </div>
                                    ) : (
                                        <div
                                            key={item.data.id}
                                            className={`msg-bubble-wrap ${item.data.senderId === user.id ? 'msg-bubble-wrap--sent' : 'msg-bubble-wrap--received'}`}
                                        >
                                            <div className={`msg-bubble ${item.data.senderId === user.id ? 'msg-bubble--sent' : 'msg-bubble--received'}`}>
                                                <div className="msg-bubble-text">{item.data.content}</div>
                                                <div className="msg-bubble-meta">
                                                    <span className="msg-bubble-time">{formatTime(item.data.createdAt)}</span>
                                                    {item.data.senderId === user.id && renderMessageStatusTick(item.data, user.id)}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Bar */}
                            <form className="msg-input-bar" onSubmit={handleSend}>
                                <button type="button" className="msg-input-action-btn" title="Attach Document / Media" onClick={() => toast.info('File attachment ready')}>
                                    <Paperclip size={20} />
                                </button>
                                <input
                                    type="text"
                                    className="msg-input"
                                    placeholder="Message..."
                                    value={reply}
                                    onChange={handleInputChange}
                                    autoFocus
                                />
                                <button type="button" className="msg-input-action-btn" title="Insert Emoji" onClick={() => setReply(prev => prev + ' 😊')}>
                                    <Smile size={20} />
                                </button>
                                <button
                                    type="submit"
                                    className="msg-send-btn"
                                    disabled={!reply.trim() || sending}
                                    aria-label="Send Message"
                                >
                                    <Send size={17} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="msg-empty-chat">
                            <div className="msg-empty-chat__icon">
                                <MessageSquare size={48} strokeWidth={1.5} />
                            </div>
                            <h3>Appointly Direct Messaging</h3>
                            <p>Select a consultation chat on the left to view messages and connect in real-time.</p>
                            <div className="msg-empty-security-pill">
                                <ShieldCheck size={15} color="#25D366" />
                                <span>End-to-end encrypted consultations</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
