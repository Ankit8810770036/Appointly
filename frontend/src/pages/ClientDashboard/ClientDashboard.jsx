import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, MapPin, CheckCircle2, XCircle, MessageCircle, Stethoscope, Star, Heart, Inbox, UserRound, Sparkles, UserCircle } from 'lucide-react';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Card from '../../components/ui/Card/Card';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi } from '../../api/appointments';
import { favoriteApi } from '../../api/favorites';
import { authApi } from '../../api/auth';
import { notificationApi } from '../../api/notifications';
import ReviewModal from '../../components/modals/ReviewModal/ReviewModal';
import { reviewApi } from '../../api/reviews';
import { messageApi } from '../../api/messages';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../../components/ui/NotificationBell/NotificationBell';
import MessagesTab from '../../components/dashboard/MessagesTab/MessagesTab';
import Sidebar from '../../components/ui/Sidebar/Sidebar';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import './ClientDashboard.css';



const STATUS_LABEL = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

const STATUS_VARIANT = {
    pending: 'warning',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger'
};

// Dynamic stats are calculated in the main component

/* ─── Sub-components ─────────────────────────────── */

function AppointmentCard({ appt, onCancel, onRebook, onReview, onMessage, index = 0 }) {
    const [showCancel, setShowCancel] = useState(false);
    const isPast = appt.status !== 'upcoming';

    return (
        <Card variant="default" className={`appt-card appt-card--${appt.status}`} animate delay={index * 0.05}>
            <div className="appt-card__main">
                <div className="appt-avatar"><Stethoscope size={24} strokeWidth={1.5} /></div>
                <div className="appt-info">
                    <div className="appt-info__top">
                        <div>
                            <span className="appt-provider">{appt.provider}</span>
                            <span className="appt-specialty">{appt.specialty}</span>
                        </div>
                        <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
                    </div>
                    <div className="appt-service">{appt.service}</div>
                    <div className="appt-meta">
                        <span><CalendarDays size={13} /> {appt.date}</span>
                        <span><Clock size={13} /> {appt.time}</span>
                        <span><Clock size={13} /> {appt.duration} min</span>
                        <span><MapPin size={13} /> {appt.location}</span>
                        <span className="appt-price">₹{appt.price}</span>
                    </div>
                    {appt.review && (
                        <div className="appt-rating">
                            Your rating: {Array.from({ length: appt.review.rating }, (_, i) => <Star key={i} size={14} fill="currentColor" />)}
                        </div>
                    )}
                </div>
            </div>

            <div className="appt-card__actions">
                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => onMessage(appt.providerId)} title="Message Provider">
                            <MessageCircle size={16} />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowCancel(true)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={() => onRebook(appt)}>Provider Profile</Button>
                    </>
                )}
                {appt.status === 'completed' && (
                    <>
                        {!appt.review && <Button variant="primary" size="sm" onClick={() => onReview(appt)}>Rate & Review</Button>}
                        <Button variant="primary" size="sm" onClick={() => onRebook(appt)}>Book Again</Button>
                    </>
                )}
                {appt.status === 'cancelled' && (
                    <Button variant="outline" size="sm" onClick={() => onRebook(appt)}>Rebook</Button>
                )}
            </div>

            {/* Cancel confirmation */}
            {showCancel && (
                <div className="appt-cancel-confirm">
                    <p>Are you sure you want to cancel this appointment?</p>
                    <div className="appt-cancel-confirm__actions">
                        <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Keep it</Button>
                        <Button variant="danger" size="sm" onClick={() => { onCancel(appt.id); setShowCancel(false); }}>
                            Yes, cancel
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}


/* ─── Filter bar ─── */
function FilterBar({ active, onChange, counts }) {
    const filters = [
        { key: 'all', label: 'All' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];
    return (
        <div className="filter-bar">
            {filters.map(f => (
                <button
                    key={f.key}
                    className={`filter-btn ${active === f.key ? 'filter-btn--active' : ''}`}
                    onClick={() => onChange(f.key)}
                >
                    {f.label}
                    {counts[f.key] > 0 && <span className="filter-btn__count">{counts[f.key]}</span>}
                </button>
            ))}
        </div>
    );
}

/* ─── Main Dashboard ────────────────────────────── */
export default function ClientDashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState('overview');
    const [filter, setFilter] = useState('all');
    const [messageTarget, setMessageTarget] = useState(null);

    // Dynamic data state
    const [appointments, setAppointments] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncTick, setSyncTick] = useState(0);
    const [reviewingAppointment, setReviewingAppointment] = useState(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadAppointments, setUnreadAppointments] = useState(0);
    const socket = useSocket();

    useEffect(() => {
        if (activeSection === 'messages') setUnreadMessages(0);
        if (activeSection === 'appointments') setUnreadAppointments(0);
    }, [activeSection]);

    // Called by NotificationBell when user clicks a notification
    const handleNotifNavigate = (section) => {
        const mappedSection = section === 'bookings' ? 'appointments' : section;
        setActiveSection(mappedSection);
        if (mappedSection === 'messages') setUnreadMessages(0);
        if (mappedSection === 'appointments') setUnreadAppointments(0);
    };

    useEffect(() => {
        if (!socket) return;
        const handleNotif = (notif) => {
            if (notif.type === 'NEW_MESSAGE') {
                if (activeSection !== 'messages') {
                    setUnreadMessages(prev => prev + 1);
                }
                setSyncTick(t => t + 1);
            } else if (notif.type.startsWith('BOOKING_') || notif.type === 'APPOINTMENT_REMINDER') {
                if (activeSection !== 'appointments') {
                    setUnreadAppointments(prev => prev + 1);
                }
                setSyncTick(t => t + 1);
            }
        };
        socket.on('new_notification', handleNotif);
        return () => socket.off('new_notification', handleNotif);
    }, [socket, activeSection]);

    useEffect(() => {
        if (!token) return;
        setLoading(true);

        const fetchData = async () => {
            try {
                const [apptData, favData, msgsData, notifData] = await Promise.all([
                    appointmentApi.getMy(token),
                    favoriteApi.getMy(token),
                    messageApi.getConversations(token),
                    notificationApi.getMy(token)
                ]);

                // Initial Message Count
                const sum = msgsData.reduce((acc, c) => acc + c.unreadCount, 0);
                if (activeSection !== 'messages') {
                    setUnreadMessages(sum);
                }

                // Initial Appointment Status Notification Count
                const unreadNotifs = notifData.filter(n => !n.isRead && n.type.startsWith('BOOKING_')).length;
                if (activeSection !== 'appointments') {
                    setUnreadAppointments(unreadNotifs);
                }

                const formattedAppts = apptData.map(appt => {
                    const dateObj = new Date(appt.date);
                    return {
                        id: appt.id,
                        providerId: appt.provider?.userId,
                        provider: appt.provider?.user?.name || 'Provider',
                        providerName: appt.provider?.user?.name || 'Provider',
                        specialty: appt.provider?.specialty || 'General',
                        service: appt.service?.name || 'Service',
                        serviceName: appt.service?.name || 'Service',
                        date: dateObj.toISOString().split('T')[0],
                        time: dateObj.toTimeString().substring(0, 5),
                        duration: appt.service?.duration || 30,
                        price: appt.service?.price || 0,
                        status: appt.status.toLowerCase(),
                        review: appt.review,
                        avatar: <UserCircle size={24} className="icon-muted" />,
                        location: appt.provider?.location || 'Not specified',
                    };
                });
                setAppointments(formattedAppts);

                const formattedFavs = favData.map(f => ({
                    id: f.id,
                    providerProfileId: f.providerProfile.id,
                    providerId: f.providerProfile.userId,
                    name: f.providerProfile.user.name,
                    specialty: f.providerProfile.specialty,
                    rating: f.providerProfile.rating || 4.5,
                    avatar: <UserCircle size={24} className="icon-muted" />,
                    location: f.providerProfile.location || 'Not specified',
                    price: f.providerProfile.services?.[0]?.price || 0
                }));
                setFavorites(formattedFavs);
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, syncTick]);

    const filtered = filter === 'all'
        ? appointments
        : filter === 'upcoming'
            ? appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')
            : appointments.filter(a => a.status === filter);

    const counts = {
        all: appointments.length,
        upcoming: appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
    };

    const handleCancel = async (id) => {
        try {
            await appointmentApi.updateStatus(id, 'cancelled', token);
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
            toast.success('Appointment cancelled successfully');
            setSyncTick(t => t + 1);
        } catch (err) {
            toast.error('Failed to cancel appointment: ' + err.message);
        }
    };

    const handleRebook = (appt) => navigate(`/provider/${appt.providerId}`);

    const handleMessage = (appt) => {
        setMessageTarget({
            id: appt.providerId,
            name: appt.providerName || appt.provider
        });
    };

    const handleReviewSubmit = async (payload) => {
        try {
            await reviewApi.create(payload, token);
            setSyncTick(t => t + 1);
            setReviewingAppointment(null);
            toast.success('Review submitted successfully!');
        } catch (err) {
            toast.error('Failed to submit review: ' + err.message);
        }
    };

    if (loading) return (
        <div className="dashboard">
            <Sidebar
                user={{
                    name: user?.name || 'Client',
                    email: user?.email || '',
                    avatar: '👤'
                }}
                activeSection="overview"
                navItems={[
                    { id: 'overview', icon: 'LayoutDashboard', label: 'Overview' },
                    { id: 'appointments', icon: 'Calendar', label: 'My Appointments' },
                    { id: 'favorites', icon: 'Heart', label: 'Favorites' },
                    { id: 'messages', icon: 'MessageSquare', label: 'Messages' },
                    { id: 'settings', icon: 'Settings', label: 'Settings' },
                ]}
                footerItems={[
                    { id: 'logout', icon: 'LogOut', label: 'Sign Out', onClick: () => { logout(); navigate('/'); } },
                ]}
            />
            <main className="dashboard__main">
                <div className="dashboard__content animate-fade-in">
                    <div className="dashboard__header">
                        <div>
                            <Skeleton variant="text" width="250px" height="2.5rem" />
                            <Skeleton variant="text" width="350px" />
                        </div>
                    </div>
                    <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                        {Array(4).fill(0).map((_, i) => (
                            <Card key={i} variant="default" className="stat-card">
                                <Skeleton variant="circle" width="30px" height="30px" />
                                <Skeleton variant="text" width="40%" height="2rem" style={{ margin: '1rem 0' }} />
                                <Skeleton variant="text" width="60%" />
                            </Card>
                        ))}
                    </div>
                    <div className="dashboard__section">
                        <Skeleton variant="text" width="200px" height="1.8rem" style={{ marginBottom: '1.5rem' }} />
                        <div className="appointments-list">
                            {Array(2).fill(0).map((_, i) => (
                                <Card key={i} variant="default" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        <Skeleton variant="circle" width="60px" height="60px" />
                                        <div style={{ flex: 1 }}>
                                            <Skeleton variant="text" width="30%" height="1.2rem" />
                                            <Skeleton variant="text" width="20%" />
                                            <Skeleton variant="text" width="80%" style={{ marginTop: '1rem' }} />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
    if (error) return <div className="dashboard"><main className="dashboard__main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'red' }}>{error}</main></div>;

    // Build user view object
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';

    const displayUser = {
        name: user?.name || 'Client',
        email: user?.email || '',
        avatar: <UserRound size={20} />,
        memberSince
    };

    // Calculate quick stats with dynamic counts
    const dynamicStats = [
        { label: 'Total Bookings', value: counts.all, icon: <CalendarDays size={22} />, color: 'var(--primary)' },
        { label: 'Upcoming', value: counts.upcoming, icon: <Clock size={22} />, color: 'hsl(38, 80%, 45%)' },
        { label: 'Completed', value: counts.completed, icon: <CheckCircle2 size={22} />, color: 'hsl(142, 70%, 40%)' },
        { label: 'Cancelled', value: counts.cancelled, icon: <XCircle size={22} />, color: 'hsl(0, 75%, 55%)' },
        { label: 'Messages', value: 'New', icon: <MessageCircle size={22} />, color: 'var(--accent)', onClick: () => setActiveSection('messages') },
    ];

    return (
        <div className="dashboard">
            <Sidebar
                user={displayUser}
                activeSection={activeSection}
                onNav={setActiveSection}
                navItems={[
                    { id: 'overview', icon: 'Home', label: 'Overview' },
                    { id: 'appointments', icon: 'Calendar', label: 'Appointments', badgeCount: unreadAppointments },
                    { id: 'messages', icon: 'MessageSquare', label: 'Messages', badgeCount: unreadMessages },
                    { id: 'favourites', icon: 'Heart', label: 'Favourites' },
                    { id: 'settings', icon: 'Settings', label: 'Settings' },
                ]}
                footerItems={[
                    { id: 'browse', icon: 'Search', label: 'Browse Services', to: '/' },
                    { id: 'logout', icon: 'LogOut', label: 'Sign Out', onClick: () => { logout(); navigate('/'); }, className: 'sidebar__nav-item--logout' },
                ]}
            />

            <main className="dashboard__main">
                {/* ── Overview ── */}
                {activeSection === 'overview' && (
                    <div className="dashboard__content animate-fade-in">
                        <div className="dashboard__header">
                            <div>
                                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    Good evening, {displayUser.name.split(' ')[0]} <Sparkles size={24} className="text-primary" />
                                </h1>
                                <p>Here's a summary of your appointments.</p>
                            </div>
                            <div className="header-actions">
                                <ThemeToggle />
                                <NotificationBell onNavigate={handleNotifNavigate} />
                                <Button variant="primary" onClick={() => navigate('/')}>+ New Booking</Button>
                            </div>
                        </div>

                        <div className="stats-grid">
                            {dynamicStats.map((stat, i) => (
                                <Card
                                    key={stat.label}
                                    variant="default"
                                    className="stat-card"
                                    style={{ '--stat-color': stat.color }}
                                    animate
                                    delay={i * 0.1}
                                    onClick={stat.onClick}
                                >
                                    <div className="stat-card__icon">{stat.icon}</div>
                                    <div className="stat-card__value">{stat.value}</div>
                                    <div className="stat-card__label">{stat.label}</div>
                                </Card>
                            ))}
                        </div>

                        {/* Upcoming */}
                        <div className="dashboard__section">
                            <div className="dashboard__section-header">
                                <h2>Upcoming Appointments</h2>
                                <button className="see-all-btn" onClick={() => setActiveSection('appointments')}>See all →</button>
                            </div>
                            <div className="appointments-list">
                                {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length === 0
                                    ? <EmptyState onBook={() => navigate('/')} />
                                    : appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').map(a => (
                                        <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} />
                                    ))
                                }
                            </div>
                        </div>

                        {/* Recent history */}
                        <div className="dashboard__section">
                            <div className="dashboard__section-header">
                                <h2>Recent History</h2>
                            </div>
                            <div className="appointments-list">
                                {appointments.filter(a => a.status === 'completed' || a.status === 'cancelled').slice(0, 3).map(a => (
                                    <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Appointments tab ── */}
                {activeSection === 'appointments' && (
                    <div className="dashboard__content animate-fade-in">
                        <div className="dashboard__header">
                            <div>
                                <h1>My Appointments</h1>
                                <p>View and manage all your bookings.</p>
                            </div>
                            <div className="header-actions">
                                <ThemeToggle />
                                <NotificationBell onNavigate={handleNotifNavigate} />
                                <Button variant="primary" onClick={() => navigate('/')}>+ New Booking</Button>
                            </div>
                        </div>

                        <FilterBar active={filter} onChange={setFilter} counts={counts} />

                        <div className="appointments-list">
                            {filtered.length === 0
                                ? <EmptyState onBook={() => navigate('/')} />
                                : filtered.map((a, i) => (
                                    <AppointmentCard key={a.id} appt={a} index={i} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} />
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* ── Messages ── */}
                {activeSection === 'messages' && (
                    <div className="dashboard__content animate-fade-in">
                        <div className="dashboard__header">
                            <div>
                                <h1>Messages</h1>
                                <p>Chat with your providers about your bookings.</p>
                            </div>
                            <div className="header-actions">
                                <ThemeToggle />
                                <NotificationBell onNavigate={handleNotifNavigate} />
                            </div>
                        </div>
                        <MessagesTab />
                    </div>
                )}

                {/* ── Favourites ── */}
                {activeSection === 'favourites' && (
                    <div className="dashboard__content animate-fade-in">
                        <div className="dashboard__header">
                            <div><h1>Favourites</h1><p>Providers you've saved.</p></div>
                            <div className="header-actions">
                                <ThemeToggle />
                                <NotificationBell onNavigate={handleNotifNavigate} />
                            </div>
                        </div>
                        <div className="favourites-grid">
                            {favorites.length === 0 ? (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-state__icon"><Heart size={40} strokeWidth={1.5} /></div>
                                    <h3>No favourites yet</h3>
                                    <p>Browse providers and click the heart icon to save them here.</p>
                                    <Button variant="primary" onClick={() => navigate('/')}>Browse Services</Button>
                                </div>
                            ) : (
                                favorites.map(p => (
                                    <Card key={p.id} variant="default" hover className="fav-card">
                                        <div className="fav-avatar"><Stethoscope size={24} strokeWidth={1.5} /></div>
                                        <div className="fav-name">{p.name}</div>
                                        <div className="fav-specialty">{p.specialty}</div>
                                        <div className="fav-meta"><Star size={14} fill="currentColor" /> {p.rating} · from ₹{p.price}</div>
                                        <Button variant="primary" size="sm" onClick={() => handleRebook(p)} className="fav-btn">Book Again</Button>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── Settings ── */}
                {activeSection === 'settings' && (
                    <ClientSettingsTab displayUser={displayUser} />
                )}

                {reviewingAppointment && (
                    <ReviewModal
                        appointment={reviewingAppointment}
                        onClose={() => setReviewingAppointment(null)}
                        onSubmit={handleReviewSubmit}
                    />
                )}

                {messageTarget && (
                    <MessageModal
                        provider={messageTarget}
                        onClose={() => setMessageTarget(null)}
                        onSuccess={() => {
                            toast.success('Message sent! You can follow up in the Messages tab.');
                            setSyncTick(t => t + 1);
                        }}
                    />
                )}
            </main>
        </div>
    );
}

function ClientSettingsTab({ displayUser }) {
    const { user, token, login } = useAuth();
    const [name, setName] = useState(displayUser.name);
    const [phone, setPhone] = useState(user?.phone || '');
    const [location, setLocation] = useState(user?.location || '');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        setSuccessMsg('');
        try {
            const updatedUser = await authApi.updateMe({ name, phone, location }, token);
            login(updatedUser, token);
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard__content animate-fade-in">
            <div className="dashboard__header">
                <div><h1>Account Settings</h1><p>Manage your profile and preferences.</p></div>
                <div className="header-actions">
                    <ThemeToggle />
                    <NotificationBell />
                </div>
            </div>

            <Card variant="default" padding="lg" className="settings-card">
                <h3 className="settings-section-title">Personal Information</h3>
                {successMsg && <p style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 600 }}>{successMsg}</p>}
                <div className="settings-fields">
                    <div className="settings-field">
                        <label>Full Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="settings-input"
                            placeholder="Your full name"
                        />
                    </div>
                    <div className="settings-field">
                        <label>Email Address</label>
                        <input value={displayUser.email} className="settings-input" readOnly />
                    </div>
                    <div className="settings-field">
                        <label>Phone Number</label>
                        <input
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="settings-input"
                            placeholder="+91 98765 43210"
                        />
                    </div>
                    <div className="settings-field">
                        <label>Address / Location</label>
                        <input
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className="settings-input"
                            placeholder="Koramangala, Bengaluru"
                        />
                    </div>
                    <div className="settings-field">
                        <label>Member Since</label>
                        <input value={displayUser.memberSince} className="settings-input" readOnly />
                    </div>
                </div>
                <div className="settings-actions">
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Card>

            <Card variant="default" padding="lg" className="settings-card">
                <h3 className="settings-section-title">Notifications</h3>
                {[
                    { label: 'Appointment reminders', checked: true },
                    { label: 'Booking confirmations', checked: true },
                    { label: 'Promotional offers', checked: false },
                ].map(n => (
                    <label key={n.label} className="settings-toggle">
                        <span>{n.label}</span>
                        <input type="checkbox" defaultChecked={n.checked} />
                    </label>
                ))}
            </Card>
        </div>
    );
}

function EmptyState({ onBook }) {
    return (
        <div className="empty-state">
            <div className="empty-state__icon"><Inbox size={40} strokeWidth={1.5} /></div>
            <h3>No appointments here</h3>
            <p>Book your first appointment with one of our verified professionals.</p>
            <Button variant="primary" onClick={onBook}>Browse Services</Button>
        </div>
    );
}
