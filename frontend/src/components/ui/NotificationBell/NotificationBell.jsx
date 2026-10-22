import { useState, useEffect, useRef } from 'react';
import { Bell, Smartphone, Check, Send } from 'lucide-react';
import { notificationApi } from '../../../api/notifications';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useSound } from '../../../hooks/useSound';
import { toast } from '../../../utils/toast';
import {
    isPushSupported,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    checkIsSubscribed,
    sendTestPush
} from '../../../utils/pushNotifications';
import './NotificationBell.css';

/**
 * @param {Function} onNavigate - Called with a section string (e.g. 'messages', 'appointments')
 *                                when user clicks a notification. Optional.
 */
export default function NotificationBell({ onNavigate }) {
    const { token } = useAuth();
    const socket = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { play } = useSound();
    const prevUnreadCount = useRef(0);

    // Push notification states
    const [pushSupported, setPushSupported] = useState(false);
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead && n.type !== 'NEW_MESSAGE').length;

    useEffect(() => {
        let isCancelled = false;
        if (token) {
            notificationApi.getMy(token).then(data => {
                if (!isCancelled) {
                    setNotifications(data.filter(n => n.type !== 'NEW_MESSAGE'));
                }
            }).catch(err => {
                console.error('Failed to fetch notifications:', err);
            });
        }

        if (socket) {
            const handleNewNotification = (newNotif) => {
                if (newNotif.type === 'NEW_MESSAGE') return; // Ignore messages in the bell
                setNotifications(prev => [newNotif, ...prev]);
            };

            socket.on('new_notification', handleNewNotification);

            return () => {
                isCancelled = true;
                socket.off('new_notification', handleNewNotification);
            };
        }

        return () => {
            isCancelled = true;
        };
    }, [token, socket]);

    // Play sound when new notifications arrive
    useEffect(() => {
        if (unreadCount > prevUnreadCount.current) {
            play('notification');
        }
        prevUnreadCount.current = unreadCount;
    }, [unreadCount, play]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /** Derive the dashboard section from the notification type */
    const getSectionFromNotif = (notif) => {
        if (notif.type === 'NEW_MESSAGE') return 'messages';
        if (notif.type.startsWith('BOOKING_') || notif.type === 'APPOINTMENT_REMINDER') return 'bookings';
        if (notif.type === 'NEW_REVIEW') return 'reviews';
        return null;
    };

    const handleNotifClick = async (notif) => {
        // Mark as read
        if (!notif.isRead) {
            try {
                await notificationApi.markAsRead(notif.id, token);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            } catch (err) {
                console.error(err);
            }
        }

        // Navigate to the relevant section
        const section = getSectionFromNotif(notif);
        if (section && onNavigate) {
            onNavigate(section);
            setShowDropdown(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead(token);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        }
    };

    // Check Push status when dropdown opens
    useEffect(() => {
        if (showDropdown && isPushSupported()) {
            setPushSupported(true);
            checkIsSubscribed().then(setPushSubscribed);
        }
    }, [showDropdown]);

    const handleTogglePush = async () => {
        if (!token) return;
        setPushLoading(true);
        try {
            if (pushSubscribed) {
                await unsubscribeFromWebPush(token);
                setPushSubscribed(false);
                toast.info('Browser desktop notifications turned off.');
            } else {
                await subscribeToWebPush(token);
                setPushSubscribed(true);
                toast.success('Native browser desktop notifications activated!');
            }
        } catch (err) {
            toast.error(err.message || 'Could not update notification permission');
        } finally {
            setPushLoading(false);
        }
    };

    const handleSendTestPush = async () => {
        if (!token) return;
        setPushLoading(true);
        try {
            await sendTestPush(token);
            toast.success('Test alert dispatched! Look at your desktop.');
        } catch (err) {
            toast.error(err.message || 'Failed to dispatch test notification');
        } finally {
            setPushLoading(false);
        }
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className={`bell-btn ${unreadCount > 0 ? 'bell-btn--active' : ''}`}
                onClick={() => setShowDropdown(!showDropdown)}
                aria-label="Notifications"
            >
                <Bell size={20} strokeWidth={2} className="bell-icon" />
                {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>

            {showDropdown && (
                <div className="notification-dropdown animate-fade-in">
                    <div className="notif-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Native Desktop / Web Push Banner */}
                    {pushSupported && (
                        <div className={`notif-push-banner ${pushSubscribed ? 'notif-push-banner--active' : ''}`}>
                            <div className="notif-push-info">
                                {pushSubscribed ? (
                                    <Check size={14} className="notif-push-icon notif-push-icon--success" />
                                ) : (
                                    <Smartphone size={14} className="notif-push-icon" />
                                )}
                                <div>
                                    <div className="notif-push-title">
                                        {pushSubscribed ? 'Desktop Alerts Active' : 'Enable Desktop Alerts'}
                                    </div>
                                    <div className="notif-push-desc">
                                        {pushSubscribed ? 'Receiving background notifications' : 'Get alerts even when tab is closed'}
                                    </div>
                                </div>
                            </div>
                            <div className="notif-push-actions">
                                {pushSubscribed ? (
                                    <>
                                        <button
                                            type="button"
                                            className="notif-push-btn notif-push-btn--test"
                                            onClick={handleSendTestPush}
                                            disabled={pushLoading}
                                            title="Send a test notification to your desktop"
                                        >
                                            <Send size={11} /> Test
                                        </button>
                                        <button
                                            type="button"
                                            className="notif-push-btn notif-push-btn--disable"
                                            onClick={handleTogglePush}
                                            disabled={pushLoading}
                                            title="Disable desktop notifications"
                                        >
                                            Off
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="notif-push-btn notif-push-btn--enable"
                                        onClick={handleTogglePush}
                                        disabled={pushLoading}
                                    >
                                        {pushLoading ? '...' : 'Enable'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="notif-list">
                        {notifications.length === 0 ? (
                            <div className="notif-empty">No notifications yet.</div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${!n.isRead ? 'notif-item--unread' : ''} ${getSectionFromNotif(n) ? 'notif-item--clickable' : ''}`}
                                    onClick={() => handleNotifClick(n)}
                                >
                                    <div className="notif-item-top">
                                        <span className="notif-type-tag" data-type={n.type}>
                                            {n.type.replace('BOOKING_', '').replace('NEW_', '').toLowerCase()}
                                        </span>
                                        <span className="notif-time">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="notif-title">{n.title}</h4>
                                    <p className="notif-message">{n.message}</p>
                                    {!n.isRead && <span className="unread-dot" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
