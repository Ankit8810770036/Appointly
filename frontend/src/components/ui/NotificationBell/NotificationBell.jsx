import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notificationApi } from '../../../api/notifications';
import { useAuth } from '../../../context/AuthContext';
import { useSocket } from '../../../context/SocketContext';
import { useSound } from '../../../hooks/useSound';
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

    const unreadCount = notifications.filter(n => !n.isRead && n.type !== 'NEW_MESSAGE').length;

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const data = await notificationApi.getMy(token);
            // Filter out messages from the bell
            setNotifications(data.filter(n => n.type !== 'NEW_MESSAGE'));
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        if (socket) {
            const handleNewNotification = (newNotif) => {
                if (newNotif.type === 'NEW_MESSAGE') return; // Ignore messages in the bell
                setNotifications(prev => [newNotif, ...prev]);
            };

            socket.on('new_notification', handleNewNotification);

            return () => {
                socket.off('new_notification', handleNewNotification);
            };
        }
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
