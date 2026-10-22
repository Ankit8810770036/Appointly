import { useState, useEffect, useRef } from 'react';
import { toast } from '../../utils/toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { addressApi } from '../../api/addresses';
import { detectCoordinatesAndAddress } from '../../utils/geolocation';
import { CalendarDays, Clock, MapPin, Navigation, CheckCircle2, CheckCircle, XCircle, MessageCircle, Stethoscope, Star, Heart, Inbox, UserRound, Sparkles, UserCircle, Mail, User, Phone, ShieldCheck, Globe, Calendar, Lock, Edit3, Eye, Hourglass, Home, Briefcase, Trash2, Plus, Compass, Camera, Loader2, ShieldAlert, AlertTriangle, HelpCircle, Copy } from 'lucide-react';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Card from '../../components/ui/Card/Card';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi } from '../../api/appointments';
import { favoriteApi } from '../../api/favorites';
import { complaintApi } from '../../api/complaints';
import { authApi } from '../../api/auth';
import { notificationApi } from '../../api/notifications';
import ReviewModal from '../../components/modals/ReviewModal/ReviewModal';
import ComplaintModal from '../../components/modals/ComplaintModal/ComplaintModal';
import CancellationModal from '../../components/modals/CancellationModal/CancellationModal';
import { reviewApi } from '../../api/reviews';
import { messageApi } from '../../api/messages';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../../components/ui/NotificationBell/NotificationBell';
import MessagesTab from '../../components/dashboard/MessagesTab/MessagesTab';
import Sidebar from '../../components/ui/Sidebar/Sidebar';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import VideoGuideModal from '../../components/modals/VideoGuideModal/VideoGuideModal';
import WatchGuidesTab from '../../components/dashboard/WatchGuidesTab/WatchGuidesTab';
import MapPicker from '../../components/ui/Map/MapPicker';
import MapViewer from '../../components/ui/Map/MapViewer';
import MapDirectionsModal from '../../components/modals/MapDirectionsModal/MapDirectionsModal';
import NearbyProvidersMapModal from '../../components/modals/NearbyProvidersMapModal/NearbyProvidersMapModal';
import CalendarExportDropdown from '../../components/ui/CalendarExport/CalendarExportDropdown';
import '../ProviderDashboard/ProviderDashboard.css';
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

/* ─── Sub-components ─────────────────────────────── */

function AppointmentCard({ appt, onCancel, onRebook, onReview, onMessage, onShowMap, onComplain, index = 0 }) {
    const navigate = useNavigate();

    const handleViewProfile = () => {
        const targetId = appt.providerId || appt.providerProfileId;
        if (targetId) {
            navigate(`/provider/${targetId}`);
        }
    };

    return (
        <motion.div
            className={`my-booking-card my-booking-card--${appt.status}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            {/* Column 1: Provider & Service Details (Clickable to view Provider Profile) */}
            <div
                className="my-booking-profile-col"
                onClick={handleViewProfile}
                title="Click to view Specialist Profile & Services"
                style={{ cursor: 'pointer' }}
            >
                <div className="my-booking-avatar">
                    {appt.providerAvatarUrl ? (
                        <img src={appt.providerAvatarUrl} alt={appt.provider} className="my-booking-avatar-img" />
                    ) : (
                        <UserRound size={22} />
                    )}
                </div>
                <div className="my-booking-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h3 className="my-booking-name">{appt.provider}</h3>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(226, 137, 47, 0.15)', color: 'var(--amber, #E2892F)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(226, 137, 47, 0.3)' }}>
                            View Profile ↗
                        </span>
                        {appt.id && (
                            <span
                                className="client-booking-id-tag"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(appt.id);
                                    toast.success(`Copied Booking ID: #APT-${appt.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`);
                                }}
                                title="Click to copy Booking ID for admin support"
                            >
                                #APT-{appt.id.replace(/-/g, '').slice(0, 8).toUpperCase()} <Copy size={10} />
                            </span>
                        )}
                    </div>
                    <span className="my-booking-service">{appt.service} • {appt.specialty}</span>
                    <div className="my-booking-location-row">
                        <MapPin size={13} color="#c084fc" />
                        <span>{appt.serviceAddress ? `Service At: ${appt.serviceAddress}` : `Location: ${appt.location || 'Connaught Place, New Delhi'}`}</span>
                    </div>
                </div>
            </div>

            {/* Column 2: Date & Time */}
            <div className="my-booking-datetime-col">
                <div className="my-booking-meta-group">
                    <Calendar size={18} className="my-booking-meta-icon" />
                    <div className="my-booking-meta-info">
                        <span className="my-booking-meta-label">Date</span>
                        <span className="my-booking-meta-val">{appt.date}</span>
                    </div>
                </div>
                <div className="my-booking-meta-group">
                    <Clock size={18} className="my-booking-meta-icon" />
                    <div className="my-booking-meta-info">
                        <span className="my-booking-meta-label">Time & Duration</span>
                        <span className="my-booking-meta-val">{appt.time} • {appt.duration}min</span>
                    </div>
                </div>
            </div>

            {/* Column 3: Amount & Status Pill */}
            <div className="my-booking-amount-col">
                <div>
                    <span className="my-booking-amount-label">Amount</span>
                    <div className="my-booking-amount-val">₹{appt.price}</div>
                </div>
                <div className={`my-booking-status-pill my-booking-status-pill--${appt.status}`}>
                    {appt.status === 'confirmed' && <CheckCircle size={14} />}
                    {appt.status === 'completed' && <CheckCircle size={14} />}
                    {appt.status === 'pending' && <Hourglass size={14} />}
                    {appt.status === 'cancelled' && <XCircle size={14} />}
                    <span>{STATUS_LABEL[appt.status] || appt.status}</span>
                </div>
            </div>

            {/* Column 4: Actions Stack */}
            <div className="my-booking-actions-col">
                <button
                    className="my-booking-btn"
                    onClick={() => onShowMap(appt)}
                    title="Get Turn-by-Turn GPS Directions"
                >
                    <Navigation size={13} /> Get Directions
                </button>

                {(appt.status === 'pending' || appt.status === 'confirmed') && (() => {
                    const apptDate = new Date(appt.rawDate || `${appt.date}T${appt.time}:00Z`);
                    const diffHours = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);
                    const isUnder2Hours = diffHours < 2;

                    return (
                        <>
                            <CalendarExportDropdown
                                title={`${appt.service || 'Appointment'} with Dr. ${appt.provider}`}
                                details={`Appointly consultation with Dr. ${appt.provider}\nService: ${appt.service}\nSpecialty: ${appt.specialty}\nLocation: ${appt.serviceAddress || appt.location || 'Consultation'}\n\nDashboard: https://appointly.live/dashboard/client`}
                                location={appt.serviceAddress || appt.location || 'Appointly Consultation'}
                                startDate={new Date(appt.rawDate || `${appt.date}T${appt.time}:00Z`)}
                                durationMinutes={parseInt(appt.duration, 10) || 30}
                                size="sm"
                                variant="outline"
                                fullWidth={true}
                                buttonText="Add to Calendar"
                            />
                            <button className="my-booking-btn" onClick={() => onMessage(appt)}>
                                <MessageCircle size={13} /> Message
                            </button>
                            <button
                                className={`my-booking-btn ${isUnder2Hours ? 'my-booking-btn--subtle' : 'my-booking-btn--danger'}`}
                                onClick={() => onCancel(appt)}
                                title={isUnder2Hours ? 'Cancellation policy locked: Less than 2 hours before start time' : 'Cancel Appointment (Structured Policy)'}
                            >
                                <XCircle size={13} /> {isUnder2Hours ? 'Cancel (Locked <2h)' : 'Cancel Booking'}
                            </button>
                        </>
                    );
                })()}

                {appt.status === 'completed' && (
                    <>
                        <button className="my-booking-btn my-booking-btn--primary" onClick={() => onRebook(appt)}>
                            <Sparkles size={13} /> Rebook (1-Click)
                        </button>
                        {!appt.review && (
                            <button className="my-booking-btn my-booking-btn--amber" onClick={() => onReview(appt)}>
                                <Star size={13} /> Rate & Review
                            </button>
                        )}
                    </>
                )}

                {appt.status === 'cancelled' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                        <button className="my-booking-btn my-booking-btn--primary" onClick={() => onRebook(appt)}>
                            <Sparkles size={13} /> Rebook Session
                        </button>
                        {appt.cancellationReason && (
                            <div style={{
                                fontSize: '0.74rem',
                                color: '#f87171',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                lineHeight: '1.3'
                            }}>
                                <strong>Cancelled {appt.cancelledBy ? `by ${appt.cancelledBy.toLowerCase()}` : ''}:</strong> {appt.cancellationReason}
                            </div>
                        )}
                    </div>
                )}

                {/* Direct Admin Escalation / Complaint Button */}
                <button
                    className="my-booking-btn my-booking-btn--subtle"
                    onClick={() => onComplain && onComplain(appt)}
                    title="Report issue or dispute directly to Admin"
                    style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                >
                    <ShieldAlert size={13} color="#ef4444" /> Report Issue
                </button>
            </div>

        </motion.div>
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
    const [showVideoGuide, setShowVideoGuide] = useState(false);

    // Dynamic data state
    const [appointments, setAppointments] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [complaintTarget, setComplaintTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncTick, setSyncTick] = useState(0);
    const [reviewingAppointment, setReviewingAppointment] = useState(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadAppointments, setUnreadAppointments] = useState(0);
    const [mapTarget, setMapTarget] = useState(null);
    const [cancellingAppointment, setCancellingAppointment] = useState(null);
    const socket = useSocket();

    const [savedLocation, setSavedLocation] = useState(() => {
        try {
            const saved = localStorage.getItem('appointly_client_location');
            if (saved) return JSON.parse(saved);
        } catch {
            // Ignore
        }
        if (user?.latitude && user?.longitude) {
            return {
                lat: user.latitude,
                lng: user.longitude,
                name: user.location || user.city || 'My Location',
                city: user.city || user.location
            };
        }
        return null;
    });
    const [showLocationModal, setShowLocationModal] = useState(false);

    useEffect(() => {
        if (activeSection === 'messages') setUnreadMessages(0);
        if (activeSection === 'appointments') {
            setUnreadAppointments(0);
            const hasPending = appointments.some(a => a.status === 'pending');
            if (hasPending) {
                setFilter('pending');
            }
        }
    }, [activeSection, appointments]);

    // Called by NotificationBell when user clicks a notification
    const handleNotifNavigate = (section) => {
        const mappedSection = section === 'bookings' ? 'appointments' : section;
        setActiveSection(mappedSection);
        if (mappedSection === 'messages') setUnreadMessages(0);
        if (mappedSection === 'appointments') {
            setUnreadAppointments(0);
            const hasPending = appointments.some(a => a.status === 'pending');
            if (hasPending) {
                setFilter('pending');
            }
        }
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

    const activeSectionRef = useRef(activeSection);
    useEffect(() => {
        activeSectionRef.current = activeSection;
    }, [activeSection]);

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const [apptData, favData, msgsData, notifData, complaintData] = await Promise.all([
                    appointmentApi.getMy(token).catch(err => { console.error('Error fetching appointments:', err); return []; }),
                    favoriteApi.getMy(token).catch(err => { console.error('Error fetching favorites:', err); return []; }),
                    messageApi.getConversations(token).catch(err => { console.error('Error fetching conversations:', err); return []; }),
                    notificationApi.getMy(token).catch(err => { console.error('Error fetching notifications:', err); return []; }),
                    complaintApi.getMy(token).catch(err => { console.error('Error fetching complaints:', err); return []; })
                ]);

                setComplaints(Array.isArray(complaintData) ? complaintData : []);

                // Initial Message Count
                const validMsgs = Array.isArray(msgsData) ? msgsData : [];
                const sum = validMsgs.reduce((acc, c) => acc + (c?.unreadCount || 0), 0);
                if (activeSectionRef.current !== 'messages') {
                    setUnreadMessages(sum);
                }

                // Initial Appointment Status Notification Count
                const validNotifs = Array.isArray(notifData) ? notifData : [];
                const unreadNotifs = validNotifs.filter(n => n && !n.isRead && n.type && n.type.startsWith('BOOKING_')).length;
                if (activeSectionRef.current !== 'appointments') {
                    setUnreadAppointments(unreadNotifs);
                }

                const validAppts = Array.isArray(apptData) ? apptData : [];
                const formattedAppts = validAppts.map(appt => {
                    const dateObj = new Date(appt.date);
                    const pad = (n) => String(n).padStart(2, '0');
                    const hours = pad(dateObj.getUTCHours());
                    const minutes = pad(dateObj.getUTCMinutes());
                    const hNum = parseInt(hours, 10);
                    const period = hNum >= 12 ? 'PM' : 'AM';
                    const h12 = hNum % 12 === 0 ? 12 : hNum % 12;
                    const timeFormatted = `${h12}:${minutes} ${period}`;
                    const dateFormatted = `${dateObj.getUTCFullYear()}-${pad(dateObj.getUTCMonth() + 1)}-${pad(dateObj.getUTCDate())}`;

                    return {
                        id: appt.id,
                        providerId: appt.provider?.userId || appt.provider?.id || appt.providerId,
                        providerProfileId: appt.provider?.id,
                        rawProvider: appt.provider,
                        provider: appt.provider?.user?.name || 'Provider',
                        providerName: appt.provider?.user?.name || 'Provider',
                        specialty: appt.provider?.specialty || 'General',
                        service: appt.service?.name || 'Service',
                        serviceName: appt.service?.name || 'Service',
                        rawDate: appt.date,
                        date: dateFormatted,
                        time: timeFormatted,
                        duration: appt.service?.duration || 30,
                        price: appt.service?.price || 0,
                        status: appt.status.toLowerCase(),
                        cancellationReason: appt.cancellationReason,
                        cancelledBy: appt.cancelledBy,
                        cancelledAt: appt.cancelledAt,
                        review: appt.review,
                        serviceAddress: appt.serviceAddress,
                        address: appt.address,
                        providerAvatarUrl: appt.provider?.user?.avatarUrl || null,
                        avatar: <UserCircle size={24} className="icon-muted" />,
                        location: appt.provider?.user?.location || appt.provider?.location || 'Not specified',
                        latitude: appt.provider?.user?.latitude,
                        longitude: appt.provider?.user?.longitude,
                    };
                });
                setAppointments(formattedAppts);
                const hasPendingAppts = formattedAppts.some(a => a.status === 'pending');
                if (hasPendingAppts) {
                    setFilter('pending');
                }

                const validFavs = Array.isArray(favData) ? favData : [];
                const formattedFavs = validFavs.filter(f => f && f.providerProfile).map(f => ({
                    id: f.id,
                    providerProfileId: f.providerProfile.id,
                    providerId: f.providerProfile.userId,
                    name: f.providerProfile.user?.name || 'Provider',
                    avatarUrl: f.providerProfile.user?.avatarUrl || null,
                    specialty: f.providerProfile.specialty,
                    rating: f.providerProfile.rating && Number(f.providerProfile.rating) > 0 ? Number(f.providerProfile.rating).toFixed(1) : '5.0',
                    avatar: <UserCircle size={24} className="icon-muted" />,
                    location: f.providerProfile.location || 'Not specified',
                    price: f.providerProfile.services?.[0]?.price || 0
                }));
                setFavorites(formattedFavs);
            } catch (err) {
                console.error('ClientDashboard fetchData error:', err);
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

    const handleCancel = (appt) => {
        setCancellingAppointment(appt);
    };

    const handleRebook = (appt) => {
        const targetId = appt.providerId || appt.providerProfileId || appt.rawProvider?.userId;
        if (targetId) navigate(`/provider/${targetId}`);
    };

    const handleMessage = (appt) => {
        const isObj = typeof appt === 'object' && appt !== null;
        const target = isObj ? appt : appointments.find(a => a.providerId === appt || a.id === appt) || {};
        const recipientUserId = target.providerId || target.rawProvider?.userId || target.provider?.userId || (typeof appt === 'string' ? appt : null);
        setMessageTarget({
            id: recipientUserId,
            name: target.providerName || target.provider || 'Specialist',
            avatarUrl: target.providerAvatarUrl || target.provider?.user?.avatarUrl || target.avatarUrl || null,
            title: target.specialty || target.service || 'Medical Specialist',
            specialty: target.specialty || target.service,
            providerProfile: { specialty: target.specialty || target.service }
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

    // Build user view object
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';

    const displayUser = {
        name: user?.name || 'Client',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl,
        avatar: user?.avatarUrl || <UserRound size={20} />,
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
                    { id: 'complaints', icon: 'ShieldAlert', label: 'Disputes & Support', badgeCount: complaints.filter(c => c.status === 'PENDING').length },
                    { id: 'settings', icon: 'Settings', label: 'Settings' },
                ]}
                footerItems={[
                    { id: 'guides', icon: 'PlayCircle', label: 'Watch Guides', onClick: () => setShowVideoGuide(true) },
                    { id: 'browse', icon: 'Search', label: 'Browse Services', to: '/' },
                    { id: 'logout', icon: 'LogOut', label: 'Sign Out', onClick: () => { logout(); navigate('/'); }, className: 'sidebar__nav-item--logout' },
                ]}
            />

            <main className="dashboard__main">
                {loading ? (
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
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '1rem', color: 'var(--paper)', textAlign: 'center', padding: '2rem' }}>
                        <AlertTriangle size={36} color="var(--amber, #E2892F)" />
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Unable to load dashboard data</h3>
                        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px', maxWidth: '400px' }}>{error}</p>
                        <Button variant="primary" size="sm" onClick={() => { setError(null); setLoading(true); setSyncTick(t => t + 1); }}>
                            Retry Now
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* ── Overview ── */}
                        {activeSection === 'overview' && (
                            <div className="dashboard__content animate-fade-in">
                                <div className="dashboard__header">
                                    <div>
                                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {(() => {
                                                const h = new Date().getHours();
                                                return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
                                            })()}, {displayUser.name.split(' ')[0]} <Sparkles size={24} className="text-primary" />
                                        </h1>
                                        <p>Here's a summary of your appointments.</p>
                                        <div className="client-location-banner">
                                            <span className="client-location-pill">
                                                <MapPin size={14} strokeWidth={2} className="client-location-icon" />
                                                <span>Showing specialists within <strong className="client-location-strong">50 km</strong> of <strong className="client-location-strong">{savedLocation?.name || user?.city || 'My Location'}</strong></span>
                                                <span className="client-location-divider">·</span>
                                                <button
                                                    type="button"
                                                    className="client-location-change-btn"
                                                    onClick={() => setShowLocationModal(true)}
                                                >
                                                    Change
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="header-actions">
                                        <ThemeToggle />
                                        <NotificationBell onNavigate={handleNotifNavigate} />
                                        <Button variant="primary" onClick={() => navigate('/', { state: { askLocation: true } })}>+ New Booking</Button>
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
                                    ? <EmptyState onBook={() => navigate('/', { state: { askLocation: true, autoOpenMap: true } })} />
                                    : appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').map(a => (
                                        <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} onShowMap={(appt) => setMapTarget(appt)} onComplain={(appt) => setComplaintTarget(appt)} />
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
                                    <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} onShowMap={(appt) => setMapTarget(appt)} onComplain={(appt) => setComplaintTarget(appt)} />
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
                                <NotificationBell onNavigate={handleNotifNavigate} />
                                <Button variant="primary" onClick={() => navigate('/', { state: { askLocation: true, autoOpenMap: true } })}>+ New Booking</Button>
                            </div>
                        </div>

                        <FilterBar active={filter} onChange={setFilter} counts={counts} />

                        <div className="appointments-list">
                            {filtered.length === 0
                                ? <EmptyState onBook={() => navigate('/', { state: { askLocation: true, autoOpenMap: true } })} />
                                : filtered.map((a, i) => (
                                    <AppointmentCard key={a.id} appt={a} index={i} onCancel={handleCancel} onRebook={handleRebook} onReview={setReviewingAppointment} onMessage={() => handleMessage(a)} onShowMap={(appt) => setMapTarget(appt)} onComplain={(appt) => setComplaintTarget(appt)} />
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
                                <NotificationBell onNavigate={handleNotifNavigate} />
                            </div>
                        </div>
                        <div className="favourites-grid">
                            {favorites.length === 0 ? (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-state__icon"><Heart size={40} strokeWidth={1.5} /></div>
                                    <h3>No favourites yet</h3>
                                    <p>Browse providers and click the heart icon to save them here.</p>
                                    <Button variant="primary" onClick={() => navigate('/', { state: { askLocation: true, autoOpenMap: true } })}>Browse Services</Button>
                                </div>
                            ) : (
                                favorites.map(p => (
                                    <Card
                                        key={p.id}
                                        variant="default"
                                        hover
                                        className="fav-card"
                                        onClick={() => navigate(`/provider/${p.providerId || p.providerProfileId}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="fav-avatar" style={{ overflow: 'hidden' }}>
                                            {p.avatarUrl ? (
                                                <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                            ) : (
                                                <Stethoscope size={24} strokeWidth={1.5} />
                                            )}
                                        </div>
                                        <div className="fav-name">{p.name}</div>
                                        <div className="fav-specialty">{p.specialty}</div>
                                        <div className="fav-meta"><Star size={14} fill="currentColor" /> {p.rating} · from ₹{p.price}</div>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRebook(p);
                                            }}
                                            className="fav-btn"
                                        >
                                            Book Again
                                        </Button>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── Complaints & Disputes Tab ── */}
                {activeSection === 'complaints' && (
                    <div className="dashboard__content animate-fade-in">
                        <div className="dashboard__header">
                            <div>
                                <h1>Disputes & Admin Escalations</h1>
                                <p>Track your complaints and admin resolution decisions in real time.</p>
                            </div>
                            <div className="header-actions">
                                <Button variant="primary" onClick={() => setComplaintTarget({})}>
                                    <ShieldAlert size={15} /> + File New Issue / Dispute
                                </Button>
                            </div>
                        </div>

                        {complaints.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state__icon"><ShieldCheck size={42} strokeWidth={1.5} color="#10b981" /></div>
                                <h3>No Active Complaints or Disputes</h3>
                                <p>All your consultations and bookings are in good standing. If you ever face an issue with a provider, service quality, or billing, report it here for immediate admin intervention.</p>
                                <Button variant="outline" onClick={() => setComplaintTarget({})}>File an Escalation</Button>
                            </div>
                        ) : (
                            <div className="complaints-grid-container">
                                {complaints.map(c => {
                                    const statusMap = {
                                        PENDING: { label: 'Under Review', color: '#e2892f', bg: 'rgba(226, 137, 47, 0.15)' },
                                        UNDER_REVIEW: { label: 'Investigating', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
                                        RESOLVED: { label: 'Resolved by Admin', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                                        DISMISSED: { label: 'Dismissed', color: '#9ba3af', bg: 'rgba(155, 163, 175, 0.15)' },
                                    };
                                    const badge = statusMap[c.status] || statusMap.PENDING;
                                    const dateStr = new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const provUser = c.appointment?.provider?.user || c.providerUser;

                                    return (
                                        <Card key={c.id} variant="default" className="client-complaint-card">
                                            <div className="c-card-top">
                                                <div className="c-card-category-badge">
                                                    <span>{c.category?.replace('_', ' ') || 'SERVICE ISSUE'}</span>
                                                </div>
                                                <div className="c-card-status-pill" style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.color}40` }}>
                                                    ● {badge.label}
                                                </div>
                                            </div>

                                            <h3 className="c-card-subject">{c.subject}</h3>
                                            <p className="c-card-desc">{c.description}</p>

                                            <div className="c-card-meta-row">
                                                {provUser && (
                                                    <div className="c-card-prov">
                                                        <span className="c-label">Provider:</span>
                                                        <strong>{provUser.name}</strong>
                                                    </div>
                                                )}
                                                {c.appointment && (
                                                    <div className="c-card-appt">
                                                        <span className="c-label">Booking:</span>
                                                        <span>#{c.appointment.id.slice(0, 8)} ({c.appointment.service?.name})</span>
                                                    </div>
                                                )}
                                                <div className="c-card-date">
                                                    <span className="c-label">Submitted:</span>
                                                    <span>{dateStr}</span>
                                                </div>
                                            </div>

                                            {c.adminNotes && (
                                                <div className="c-card-admin-response">
                                                    <div className="c-admin-response-title">
                                                        <ShieldCheck size={14} color="#10b981" />
                                                        <span>Admin Resolution & Findings:</span>
                                                    </div>
                                                    <p className="c-admin-response-text">{c.adminNotes}</p>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Settings ── */}
                {activeSection === 'settings' && (
                    <ClientSettingsTab displayUser={displayUser} />
                )}
                    </>
                )}

                {complaintTarget && (
                    <ComplaintModal
                        appointment={complaintTarget?.id ? complaintTarget : null}
                        onClose={() => setComplaintTarget(null)}
                        onSuccess={() => {
                            setSyncTick(t => t + 1);
                        }}
                    />
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
                {cancellingAppointment && (
                    <CancellationModal
                        appointment={cancellingAppointment}
                        userRole="CLIENT"
                        onClose={() => setCancellingAppointment(null)}
                        onSuccess={(updated) => {
                            setAppointments(prev => prev.map(a => a.id === cancellingAppointment.id ? {
                                ...a,
                                status: 'cancelled',
                                cancellationReason: updated.cancellationReason || 'Cancelled by client'
                            } : a));
                            setSyncTick(t => t + 1);
                        }}
                    />
                )}
            </main>

            <AnimatePresence>
                {showVideoGuide && (
                    <VideoGuideModal onClose={() => setShowVideoGuide(false)} />
                )}
            </AnimatePresence>

            <MapDirectionsModal
                isOpen={!!mapTarget}
                onClose={() => setMapTarget(null)}
                providerPos={{
                    lat: mapTarget?.latitude || 28.6315,
                    lng: mapTarget?.longitude || 77.2167
                }}
                clientPos={{
                    lat: user?.latitude || 28.6139,
                    lng: user?.longitude || 77.2090
                }}
                clientName={user?.name || "Me"}
            />

            {showLocationModal && (
                <NearbyProvidersMapModal
                    isOpen={showLocationModal}
                    onClose={() => setShowLocationModal(false)}
                    providers={[]}
                    initialLocation={savedLocation}
                    currentLocationName={savedLocation?.name || user?.city || 'My Location'}
                    onSelectLocation={(loc) => {
                        setSavedLocation(loc);
                        if (loc) {
                            try {
                                localStorage.setItem('appointly_client_location', JSON.stringify(loc));
                            } catch {
                                // Ignore
                            }
                            toast.success(`📍 Location set to ${loc.name || loc.city || 'Selected Location'}`);
                        } else {
                            try {
                                localStorage.removeItem('appointly_client_location');
                            } catch {
                                // Ignore
                            }
                            toast.info('Location cleared. Showing nationwide specialists.');
                        }
                    }}
                />
            )}
        </div>
    );
}

function ClientSettingsTab() {
    const { user, token, login, updateUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    // Form fields
    const nameParts = (user?.name || '').split(' ');
    const [firstName, setFirstName] = useState(nameParts[0] || '');
    const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [city, setCity] = useState(user?.city || '');
    const [state, setState] = useState(user?.state || '');
    const [country, setCountry] = useState(user?.country || 'IND');
    const [streetAddress, setStreetAddress] = useState(user?.streetAddress || '');
    const [zipCode, setZipCode] = useState(user?.zipCode || '');
    const [latitude, setLatitude] = useState(user?.latitude || null);
    const [longitude, setLongitude] = useState(user?.longitude || null);
    const [saving, setSaving] = useState(false);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file (PNG, JPG, WEBP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be under 5MB.');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setUploadingAvatar(true);
        try {
            const res = await authApi.uploadAvatar(formData);
            if (updateUser) {
                updateUser({ avatarUrl: res.avatarUrl });
            } else if (res.user) {
                login(res.user, token);
            }
            toast.success('Profile photo uploaded to Cloudinary CDN successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to upload profile photo');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            const updated = await authApi.updateMe({
                name: fullName,
                phone,
                city,
                state,
                country,
                streetAddress,
                zipCode,
                latitude,
                longitude
            }, token);
            if (updateUser) {
                updateUser(updated);
            } else {
                login(updated, token);
            }
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const avatarUrl = user?.avatarUrl || null;
    const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const memberSinceStr = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '27 Jan 2025';

    return (
        <div className="pcd-settings-wrap animate-fade-in">
            {/* Top Profile Header Card */}
            <div className="pcd-settings-profile-card">
                <div className="pcd-settings-profile-left">
                    <div className="pcd-settings-profile-avatar-container">
                        <div className="pcd-settings-profile-avatar">
                            {uploadingAvatar ? (
                                <Loader2 size={24} className="pcd-avatar-spinner" />
                            ) : avatarUrl ? (
                                <img src={avatarUrl} alt={user?.name} />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        <label className="pcd-avatar-upload-badge" title="Upload new photo (Cloudinary CDN)">
                            <Camera size={14} />
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/webp, image/gif"
                                style={{ display: 'none' }}
                                onChange={handleAvatarUpload}
                                disabled={uploadingAvatar}
                            />
                        </label>
                    </div>
                    <div className="pcd-settings-profile-meta">
                        <div className="pcd-settings-profile-name-row">
                            <h2 className="pcd-settings-profile-name">{user?.name || '-'}</h2>
                            <span className="pcd-settings-profile-badge">✓ Verified Client</span>
                        </div>
                        <div className="pcd-settings-profile-start-date">
                            <Calendar size={14} className="pcd-settings-cal-icon" />
                            <span>Start date: {memberSinceStr}</span>
                        </div>
                    </div>
                </div>
                <button className="pcd-settings-edit-btn" onClick={() => setIsEditing(!isEditing)}>
                    <Edit3 size={15} />
                    <span>{isEditing ? 'View details' : 'Edit profile'}</span>
                </button>
            </div>

            {/* Details or Edit Form Card */}
            <div className="pcd-settings-details-card">
                <div className="pcd-settings-details-header">
                    <h3>Profile details</h3>
                    {!isEditing && (
                        <button className="pcd-settings-details-inline-edit" onClick={() => setIsEditing(true)}>
                            <Edit3 size={15} /> Edit
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <form onSubmit={handleSave}>
                        <div className="pcd-settings-edit-fields-grid">
                            <div className="pcd-settings-edit-field">
                                <label>First Name</label>
                                <input
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="First Name"
                                    required
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Last Name</label>
                                <input
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="Last Name"
                                    required
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Email Address</label>
                                <input value={user?.email || ''} className="pcd-settings-edit-input pcd-settings-edit-input--readonly" readOnly />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Phone</label>
                                <input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Country</label>
                                <input
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="Country"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>City</label>
                                <input
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="City"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>State</label>
                                <input
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="State"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Street Address</label>
                                <input
                                    value={streetAddress}
                                    onChange={e => setStreetAddress(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="Street Address"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Postal Code</label>
                                <input
                                    value={zipCode}
                                    onChange={e => setZipCode(e.target.value)}
                                    className="pcd-settings-edit-input"
                                    placeholder="Postal Code"
                                />
                            </div>
                            <div className="pcd-settings-edit-field" style={{ gridColumn: 'span 2' }}>
                                <MapPicker
                                    value={{ lat: latitude, lng: longitude }}
                                    onChange={(pos) => { setLatitude(pos.lat); setLongitude(pos.lng); }}
                                    onAddressUpdate={(addr) => {
                                        setStreetAddress(addr.street || streetAddress);
                                        setCity(addr.city || city);
                                        setState(addr.state || state);
                                        setZipCode(addr.zipCode || zipCode);
                                        setCountry(addr.country || country);
                                    }}
                                    label="Pin Your Location"
                                />
                            </div>
                        </div>
                        <div className="pcd-settings-edit-actions">
                            <button type="button" className="cs-btn cs-btn--secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                            <button type="submit" className="cs-btn cs-btn--primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="pcd-settings-details-grid">
                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <UserRound size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">FULL NAME</span>
                                <span className="pcd-settings-details-value">{user?.name || '-'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Mail size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">EMAIL</span>
                                <span className="pcd-settings-details-value">
                                    {user?.email || '-'}
                                </span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <CalendarDays size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">ROLE</span>
                                <span className="pcd-settings-details-value">Client Account</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Phone size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">NUMBER</span>
                                <span className="pcd-settings-details-value">
                                    {user?.phone || '-'}
                                </span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Globe size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">COUNTRY</span>
                                <span className="pcd-settings-details-value">{country || '-'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <MapPin size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">OFFICE ADDRESS</span>
                                <span className="pcd-settings-details-value">{streetAddress || '-'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Globe size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">CITY / STATE</span>
                                <span className="pcd-settings-details-value">{[city, state].filter(Boolean).join(', ') || '-'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Clock size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">POSTAL CODE</span>
                                <span className="pcd-settings-details-value">{zipCode || '-'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Saved Addresses Management Card (Blinkit Multi-Address) ── */}
            <SavedAddressesManager token={token} user={user} />

            {/* Bottom Teaser Banner: 2-Factor Authentication */}
            <div className="pcd-settings-teaser-banner">
                <div className="pcd-settings-teaser-left">
                    <div className="pcd-settings-teaser-icon-wrap">
                        <Lock size={20} />
                    </div>
                    <div className="pcd-settings-teaser-text">
                        <h4>2-Factor Authentication</h4>
                        <p>Add an extra layer of security to your account with two-Factor authentication.</p>
                    </div>
                </div>
                <button type="button" className="pcd-settings-teaser-btn" onClick={() => toast.info('2FA settings coming soon!')}>Manage</button>
            </div>
        </div>
    );
}

function SavedAddressesManager({ token }) {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [form, setForm] = useState({
        label: 'Home',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        isDefault: false
    });

    const loadAddresses = async () => {
        if (!token) return;
        try {
            const data = await addressApi.getAll(token);
            setAddresses(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAddresses();
    }, [token]);

    const handleGpsDetect = async () => {
        setGpsLoading(true);
        try {
            const loc = await detectCoordinatesAndAddress();
            setForm(prev => ({
                ...prev,
                streetAddress: loc.streetAddress || loc.name || prev.streetAddress,
                city: loc.city || prev.city,
                state: loc.state || prev.state,
                zipCode: loc.zipCode || prev.zipCode
            }));
            toast.success(`📍 GPS Location detected: ${loc.city}`);
        } catch (err) {
            toast.error(err.message || 'Could not detect GPS location');
        } finally {
            setGpsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.streetAddress.trim() || !form.city.trim()) {
            toast.error('Street address and city are required.');
            return;
        }

        try {
            await addressApi.create(form, token);
            toast.success('Address added successfully!');
            setShowAddForm(false);
            setForm({
                label: 'Home',
                streetAddress: '',
                city: '',
                state: '',
                zipCode: '',
                isDefault: false
            });
            loadAddresses();
        } catch (err) {
            toast.error(err.message || 'Failed to save address');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this address?')) return;
        try {
            await addressApi.delete(id, token);
            toast.success('Address deleted');
            loadAddresses();
        } catch (err) {
            toast.error(err.message || 'Failed to delete address');
        }
    };

    const handleSetDefault = async (id) => {
        try {
            await addressApi.setDefault(id, token);
            toast.success('Default address updated');
            loadAddresses();
        } catch (err) {
            toast.error(err.message || 'Failed to update default address');
        }
    };

    return (
        <div className="pcd-settings-details-card" style={{ marginTop: '1.5rem' }}>
            <div className="pcd-settings-details-header">
                <div>
                    <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={18} color="var(--amber)" /> Saved Addresses
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--muted)' }}>
                        Manage your saved home, work, and custom addresses for 1-click consultation bookings.
                    </p>
                </div>
                {!showAddForm && (
                    <button
                        type="button"
                        className="pcd-settings-details-inline-edit"
                        onClick={() => setShowAddForm(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={14} /> Add Address
                    </button>
                )}
            </div>

            {/* Add New Address Form Drawer */}
            {showAddForm && (
                <form onSubmit={handleSave} className="animate-fade-in" style={{ background: '#141720', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--amber)' }}>ADD NEW SAVED ADDRESS</strong>
                        <button
                            type="button"
                            className="blinkit-gps-btn"
                            onClick={handleGpsDetect}
                            disabled={gpsLoading}
                        >
                            <span className="blinkit-gps-pulse-dot" />
                            <Compass size={13} />
                            <span>{gpsLoading ? 'Detecting...' : 'Autofill with GPS'}</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        {['Home', 'Work', 'Other'].map(lbl => (
                            <button
                                key={lbl}
                                type="button"
                                className={`blinkit-label-btn ${form.label === lbl ? 'blinkit-label-btn--active' : ''}`}
                                onClick={() => setForm({ ...form, label: lbl })}
                            >
                                {lbl === 'Home' && '🏠 '}
                                {lbl === 'Work' && '💼 '}
                                {lbl === 'Other' && '📍 '}
                                {lbl}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                            className="blinkit-input"
                            placeholder="Flat / House / Floor / Building / Street Address *"
                            value={form.streetAddress}
                            onChange={e => setForm({ ...form, streetAddress: e.target.value })}
                            required
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <input
                                className="blinkit-input"
                                placeholder="City *"
                                value={form.city}
                                onChange={e => setForm({ ...form, city: e.target.value })}
                                required
                            />
                            <input
                                className="blinkit-input"
                                placeholder="State"
                                value={form.state}
                                onChange={e => setForm({ ...form, state: e.target.value })}
                            />
                            <input
                                className="blinkit-input"
                                placeholder="Postal Code"
                                value={form.zipCode}
                                onChange={e => setForm({ ...form, zipCode: e.target.value })}
                            />
                        </div>

                        <label className="blinkit-save-checkbox-row" style={{ marginTop: '4px' }}>
                            <input
                                type="checkbox"
                                checked={form.isDefault}
                                onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                            />
                            <span>Set as default address for future bookings</span>
                        </label>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button type="button" className="cs-btn cs-btn--secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                            <button type="submit" className="cs-btn cs-btn--primary">Save Address</button>
                        </div>
                    </div>
                </form>
            )}

            {/* Address List */}
            {loading ? (
                <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Loading saved addresses...</p>
            ) : addresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>No saved addresses yet. Click "+ Add Address" above or use GPS during booking to save one!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {addresses.map(addr => {
                        const lbl = (addr.label || 'home').toLowerCase();
                        return (
                            <div
                                key={addr.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: 'var(--panel-2)',
                                    borderRadius: '8px',
                                    border: `1px solid ${addr.isDefault ? 'var(--amber)' : 'var(--line)'}`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <span className={`blinkit-tag-badge blinkit-tag-badge--${lbl === 'work' ? 'work' : lbl === 'home' ? 'home' : 'other'}`}>
                                        {lbl === 'home' && <Home size={12} />}
                                        {lbl === 'work' && <Briefcase size={12} />}
                                        {lbl !== 'home' && lbl !== 'work' && <MapPin size={12} />}
                                        {addr.label}
                                    </span>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--paper)' }}>
                                            {addr.streetAddress}
                                            {addr.isDefault && <span className="blinkit-default-pill">DEFAULT</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                                            {[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {!addr.isDefault && (
                                        <button
                                            type="button"
                                            className="pane-chat-btn"
                                            onClick={() => handleSetDefault(addr.id)}
                                            style={{ fontSize: '11px', padding: '4px 8px' }}
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="msg-modal-close"
                                        onClick={() => handleDelete(addr.id)}
                                        title="Delete Address"
                                        style={{ width: '28px', height: '28px' }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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
