import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { messageApi } from '../../../api/messages';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import Card from '../../ui/Card/Card';
import Button from '../../ui/Button/Button';
import Skeleton from '../../ui/Skeleton/Skeleton';
import './MessagesTab.css';

export default function MessagesTab() {
    const { token, user } = useAuth();
    const socket = useSocket();
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Clear unread badge instantly when conversation is opened
    const selectConversation = (id) => {
        setSelectedId(id);
        setConversations(prev =>
            prev.map(c => c.otherUser.id === id ? { ...c, unreadCount: 0 } : c)
        );
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedId) {
            fetchMessages(selectedId);
        }
    }, [selectedId]);

    // Socket listener for new messages
    useEffect(() => {
        if (socket) {
            const handleNotif = (notif) => {
                if (notif.type === 'NEW_MESSAGE') {
                    fetchConversations();
                    // Refetch messages if the current conversation is open
                    if (selectedId) fetchMessages(selectedId, true);
                }
            };
            socket.on('new_notification', handleNotif);
            return () => socket.off('new_notification', handleNotif);
        }
    }, [socket, selectedId]);

    const fetchConversations = async () => {
        try {
            const data = await messageApi.getConversations(token);
            setConversations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (id, silent = false) => {
        try {
            const data = await messageApi.getChatHistory(id, token);
            setMessages(data);
            if (!silent) {
                // Scroll to bottom
                setTimeout(() => {
                    const container = document.querySelector('.chat-history');
                    if (container) container.scrollTop = container.scrollHeight;
                }, 100);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!reply.trim() || !selectedId) return;

        setSending(true);
        try {
            await messageApi.send({ receiverId: selectedId, content: reply.trim() }, token);
            setReply('');
            fetchMessages(selectedId);
            fetchConversations();
        } catch (err) {
            toast.error('Failed to send: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="messages-tab animate-fade-in">
            <div className="messages-layout">
                <div className="conversations-list">
                    <div className="conv-header">
                        <Skeleton variant="text" width="100px" height="1.5rem" />
                    </div>
                    <div className="conv-items-container">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="conv-item">
                                <Skeleton variant="circle" width="40px" height="40px" />
                                <div className="conv-info">
                                    <Skeleton variant="text" width="60%" />
                                    <Skeleton variant="text" width="90%" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="chat-area" style={{ display: 'flex', flexDirection: 'column', padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                        <Skeleton variant="circle" width="50px" height="50px" />
                        <div style={{ flex: 1 }}>
                            <Skeleton variant="text" width="150px" height="1.2rem" />
                            <Skeleton variant="text" width="80px" />
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Skeleton variant="rect" height="300px" />
                    </div>
                    <div style={{ marginTop: '2rem' }}>
                        <Skeleton variant="rect" height="50px" />
                    </div>
                </div>
            </div>
        </div>
    );

    const selectedConv = conversations.find(c => c.otherUser.id === selectedId);

    return (
        <div className="messages-tab animate-fade-in">
            <div className="messages-layout">
                {/* Conversations List */}
                <div className="conversations-list">
                    <div className="conv-header">
                        <h3>Messages</h3>
                    </div>
                    <div className="conv-items-container">
                        {conversations.length === 0 ? (
                            <div className="empty-convs">No messages yet.</div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.otherUser.id}
                                    className={`conv-item ${selectedId === conv.otherUser.id ? 'conv-item--active' : ''} ${conv.unreadCount > 0 ? 'conv-item--unread' : ''}`}
                                    onClick={() => selectConversation(conv.otherUser.id)}
                                >
                                    <div className="conv-avatar">👤</div>
                                    <div className="conv-info">
                                        <div className="conv-name">
                                            {conv.otherUser.name}
                                        </div>
                                        <div className={`conv-last-msg ${conv.unreadCount > 0 ? 'conv-last-msg--unread' : ''}`}>
                                            {conv.lastMessage.senderId === user.id ? 'You: ' : ''}
                                            {conv.lastMessage.content}
                                        </div>
                                    </div>
                                    <div className="conv-meta">
                                        <div className="conv-time">
                                            {new Date(conv.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="unread-badge">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="chat-area">
                    {selectedId ? (
                        <>
                            <div className="chat-header">
                                <div className="conv-avatar">👤</div>
                                <div>
                                    <div className="chat-title">{selectedConv?.otherUser.name}</div>
                                    <div className="chat-status">{selectedConv?.otherUser.role}</div>
                                </div>
                            </div>

                            <div className="chat-history">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`message-bubble ${msg.senderId === user.id ? 'message-bubble--sent' : 'message-bubble--received'}`}>
                                        <div className="bubble-content">{msg.content}</div>
                                        <div className="bubble-time">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form className="chat-input-area" onSubmit={handleSend}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    autoFocus
                                />
                                <Button variant="primary" type="submit" disabled={!reply.trim() || sending}>
                                    {sending ? '...' : 'Send'}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="chat-placeholder">
                            <div className="placeholder-icon">💬</div>
                            <h3>Select a conversation</h3>
                            <p>Pick a thread from the left to start messaging.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
