import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from '../../utils/toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Card from '../../components/ui/Card/Card';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { appointmentApi } from '../../api/appointments';
import { providerApi } from '../../api/providers';
import { messageApi } from '../../api/messages';
import { useSocket } from '../../context/SocketContext';
import NotificationBell from '../../components/ui/NotificationBell/NotificationBell';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import MessagesTab from '../../components/dashboard/MessagesTab/MessagesTab';
import Sidebar from '../../components/ui/Sidebar/Sidebar';
import {
    IndianRupee, TrendingUp, Hourglass as HourglassIcon, CheckCircle2, CalendarDays,
    Star, Clock, Calendar, XCircle, CheckCircle, UserRound,
    Settings, Sparkles, PartyPopper, MessageCircle,
    CloudUpload, ShieldAlert, FileText, Upload, Trash2, Zap, MapPin,
    Edit3, User, Mail, Phone, Globe, Shield, ShieldCheck
} from 'lucide-react';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import MapDirectionsModal from '../../components/modals/MapDirectionsModal/MapDirectionsModal';
import { reviewApi } from '../../api/reviews';
import VideoGuideModal from '../../components/modals/VideoGuideModal/VideoGuideModal';
import WatchGuidesTab from '../../components/dashboard/WatchGuidesTab/WatchGuidesTab';
import MapPicker from '../../components/ui/Map/MapPicker';
import MapViewer from '../../components/ui/Map/MapViewer';
import ReviewCard from '../../components/ui/ReviewCard/ReviewCard';
import ClientProfileModal from '../../components/modals/ClientProfileModal/ClientProfileModal';
import './ProviderDashboard.css';

// Earnings are calculated dynamically below

const TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00'
];

const STATUS_VARIANT = { confirmed: 'success', pending: 'warning', completed: 'default', cancelled: 'danger' };
const STATUS_LABEL = { confirmed: 'Confirmed', pending: 'Pending', completed: 'Done', cancelled: 'Cancelled' };

/* ─── Sidebar ────────────────────────────────────── */

/* ─── Premium Earnings Chart ────────────────────────── */
function EarningsChart({ data }) {
    if (!data || data.length === 0) return <p className="empty-hint">No earnings data yet.</p>;

    return (
        <div style={{ width: '100%', height: 300, marginTop: '1.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-md)',
                            background: 'var(--bg)'
                        }}
                        formatter={(value) => [`₹${value}`, 'Earnings']}
                    />
                    <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorEarnings)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ─── Booking Row Component ──────────────────────── */
function BookingRow({ booking, onAccept, onDecline, onComplete, onMessage, onShowMap, onShowClientProfile, providerCoords }) {
    const handleGetDirections = (e) => {
        e.stopPropagation();
        if (onShowMap) {
            onShowMap(booking);
        } else {
            if (!booking.latitude || !booking.longitude) return;
            let url = "";
            if (providerCoords?.lat && providerCoords?.lng) {
                url = `https://www.google.com/maps/dir/?api=1&origin=${providerCoords.lat},${providerCoords.lng}&destination=${booking.latitude},${booking.longitude}&travelmode=driving`;
            } else {
                url = `https://www.google.com/maps/search/?api=1&query=${booking.latitude},${booking.longitude}`;
            }
            window.open(url, '_blank');
        }
    };

    return (
        <div
            className={`my-booking-card my-booking-card--${booking.status} animate-fade-in`}
        >
            {/* Column 1: Client & Service Info (Clicking profile logo/name opens Client Profile) */}
            <div
                className="my-booking-profile-col"
                onClick={() => onShowClientProfile && onShowClientProfile(booking)}
                title="Click to view full Client Profile details"
                style={{ cursor: 'pointer' }}
            >
                <div className="my-booking-avatar">
                    <UserRound size={22} />
                </div>
                <div className="my-booking-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 className="my-booking-name">{booking.client}</h3>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                            View Profile ↗
                        </span>
                    </div>
                    <span className="my-booking-service">{booking.service}</span>
                    <div className="my-booking-location-row">
                        <MapPin size={13} color="#c084fc" />
                        <span>Location: {booking.location || 'Connaught Place, New Delhi'}</span>
                    </div>
                </div>
            </div>

            {/* Column 2: Date & Time */}
            <div className="my-booking-datetime-col">
                <div className="my-booking-meta-group">
                    <Calendar size={18} className="my-booking-meta-icon" />
                    <div className="my-booking-meta-info">
                        <span className="my-booking-meta-label">Date</span>
                        <span className="my-booking-meta-val">{booking.date}</span>
                    </div>
                </div>
                <div className="my-booking-meta-group">
                    <Clock size={18} className="my-booking-meta-icon" />
                    <div className="my-booking-meta-info">
                        <span className="my-booking-meta-label">Time & Duration</span>
                        <span className="my-booking-meta-val">{booking.time} • {booking.duration}min</span>
                    </div>
                </div>
            </div>

            {/* Column 3: Amount & Status Pill */}
            <div className="my-booking-amount-col">
                <div>
                    <span className="my-booking-amount-label">Amount</span>
                    <div className="my-booking-amount-val">₹{booking.price}</div>
                </div>
                <div className={`my-booking-status-pill my-booking-status-pill--${booking.status}`}>
                    {booking.status === 'confirmed' && <CheckCircle size={14} />}
                    {booking.status === 'completed' && <CheckCircle size={14} />}
                    {booking.status === 'pending' && <HourglassIcon size={14} />}
                    {booking.status === 'cancelled' && <XCircle size={14} />}
                    <span>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                </div>
            </div>

            {/* Column 4: Action Buttons Stack */}
            <div className="my-booking-actions-col">
                <button
                    className="my-booking-btn"
                    onClick={handleGetDirections}
                    title="View Location on Map"
                >
                    <MapPin size={13} /> View Location
                </button>

                {booking.status === 'pending' && (
                    <>
                        <button className="my-booking-btn" onClick={() => onAccept(booking.id)}>
                            <CheckCircle size={14} /> Accept Booking
                        </button>
                        <button className="my-booking-btn my-booking-btn--danger" onClick={() => onDecline(booking.id)}>
                            <XCircle size={14} /> Decline
                        </button>
                    </>
                )}

                {booking.status === 'confirmed' && (
                    <>
                        <button className="my-booking-btn" onClick={() => onComplete(booking.id)}>
                            <CheckCircle size={14} /> Mark as Done
                        </button>
                        <button className="my-booking-btn my-booking-btn--danger" onClick={() => onDecline(booking.id)}>
                            <XCircle size={14} /> Cancel Booking
                        </button>
                    </>
                )}

                {booking.status === 'completed' && (
                    <button className="my-booking-btn" onClick={() => onMessage(booking.clientId)}>
                        <MessageCircle size={14} /> Message Client
                    </button>
                )}

                {booking.status === 'cancelled' && (
                    <button className="my-booking-btn" onClick={() => onMessage(booking.clientId)}>
                        <MessageCircle size={14} /> Message Client
                    </button>
                )}
            </div>
        </div>
    );
}

/* ─── Schedule Tab ───────────────────────────────── */
const DAYS_MAP = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function ScheduleTab({ user, token, onUpdate }) {
    const { login } = useAuth();
    const profile = user?.providerProfile;

    const [selectedDay, setSelectedDay] = useState('MON');

    // workSchedule state: { MON: ['09:00', ...], TUE: [...] }
    const [workSchedule, setWorkSchedule] = useState(() => {
        if (profile?.workSchedule && Object.keys(profile.workSchedule).length > 0) {
            return profile.workSchedule;
        }
        // Fallback to old availableSlots if workSchedule is empty
        const initialSlots = (profile?.availableSlots && profile.availableSlots.length > 0) ? profile.availableSlots : TIME_SLOTS;
        return Object.fromEntries(DAYS_MAP.map(d => [d.toUpperCase(), [...initialSlots]]));
    });

    const availability = useMemo(() => {
        return Object.fromEntries(DAYS_MAP.map(d => [
            d.toUpperCase(),
            (workSchedule[d.toUpperCase()]?.length || 0) > 0
        ]));
    }, [workSchedule]);

    const [blockDates, setBlockDates] = useState(profile?.blockedDates || []);
    const [newBlock, setNewBlock] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.workSchedule && Object.keys(profile.workSchedule).length > 0) {
            setWorkSchedule(profile.workSchedule);
        } else if (profile?.availableSlots && profile.availableSlots.length > 0) {
            const initialSlots = profile.availableSlots;
            setWorkSchedule(Object.fromEntries(DAYS_MAP.map(d => [d.toUpperCase(), [...initialSlots]])));
        } else {
            setWorkSchedule(Object.fromEntries(DAYS_MAP.map(d => [d.toUpperCase(), [...TIME_SLOTS]])));
        }
        if (profile?.blockedDates) {
            setBlockDates(profile.blockedDates);
        }
    }, [profile?.workSchedule, profile?.availableSlots, profile?.blockedDates]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const workingDays = Object.entries(workSchedule)
                .filter(([, slots]) => slots.length > 0)
                .map(([day]) => day);

            // Sort workSchedule keys & slot arrays
            const sortedWorkSchedule = Object.fromEntries(
                Object.entries(workSchedule).map(([day, slots]) => [
                    day,
                    [...slots].sort((a, b) => a.localeCompare(b))
                ])
            );

            // Flatten unique slots for backward compatibility
            const availableSlots = [...new Set(Object.values(sortedWorkSchedule).flat())].sort((a, b) => a.localeCompare(b));

            const updatedUser = await providerApi.updateProfile({
                workingDays,
                availableSlots,
                workSchedule: sortedWorkSchedule,
                blockedDates: blockDates
            }, token);

            login(updatedUser, token); // Persist changes to local storage & context
            if (onUpdate) onUpdate();
            toast.success('Schedule saved successfully!');
        } catch (err) {
            toast.error('Failed to save schedule: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleSlot = (day, slot) => {
        setWorkSchedule(prev => {
            const currentSlots = prev[day] || [];
            const newSlots = currentSlots.includes(slot)
                ? currentSlots.filter(s => s !== slot)
                : [...currentSlots, slot];
            return { ...prev, [day]: newSlots.sort((a, b) => a.localeCompare(b)) };
        });
    };

    const copyToAll = () => {
        const currentSlots = workSchedule[selectedDay] || [];
        const newSchedule = Object.fromEntries(DAYS_MAP.map(d => [d.toUpperCase(), [...currentSlots]]));
        setWorkSchedule(newSchedule);
    };

    return (
        <div className="schedule-tab">
            <Card variant="default" padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 className="settings-section-title" style={{ margin: 0 }}>Working Hours per Day</h3>
                    <Button variant="ghost" size="sm" onClick={copyToAll}>Copy current day to all days</Button>
                </div>

                <div className="schedule-days-tabs">
                    {DAYS_MAP.map(d => {
                        const dayKey = d.toUpperCase();
                        const isActive = selectedDay === dayKey;
                        const isWorking = availability[dayKey];
                        return (
                            <button
                                key={d}
                                className={`day-tab ${isActive ? 'day-tab--active' : ''} ${!isWorking ? 'day-tab--off' : ''}`}
                                onClick={() => setSelectedDay(dayKey)}
                            >
                                <span className="day-tab__short">{d}</span>
                                <span className="day-tab__status">{isWorking ? '●' : '○'}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="day-schedule-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h4 className="day-title">{selectedDay} Availability</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {workSchedule[selectedDay]?.length || 0} slots selected
                        </div>
                    </div>

                    <div className="slot-grid">
                        {TIME_SLOTS.map(t => (
                            <label key={t} className={`slot-toggle ${(workSchedule[selectedDay] || []).includes(t) ? 'slot-toggle--on' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={(workSchedule[selectedDay] || []).includes(t)}
                                    onChange={() => toggleSlot(selectedDay, t)}
                                />
                                {t}
                            </label>
                        ))}
                    </div>
                    {(workSchedule[selectedDay]?.length || 0) === 0 && (
                        <p className="empty-hint" style={{ marginTop: '1rem', textAlign: 'center' }}>
                            No slots selected for {selectedDay}. You will be marked as unavailable.
                        </p>
                    )}
                </div>
            </Card>

            <Card variant="default" padding="md">
                <h3 className="settings-section-title">Block Specific Dates</h3>
                <div className="block-date-row">
                    <input
                        type="date"
                        className="settings-input"
                        value={newBlock}
                        onChange={e => setNewBlock(e.target.value)}
                        style={{ maxWidth: 200 }}
                    />
                    <Button variant="outline" size="sm" onClick={() => {
                        if (newBlock && !blockDates.includes(newBlock)) {
                            setBlockDates(b => [...b, newBlock]);
                            setNewBlock('');
                        }
                    }}>Add</Button>
                </div>
                <div className="blocked-dates">
                    {blockDates.map(d => (
                        <span key={d} className="blocked-date-chip">
                            {d}
                            <button onClick={() => setBlockDates(b => b.filter(x => x !== d))}>✕</button>
                        </span>
                    ))}
                    {blockDates.length === 0 && <p className="empty-hint">No blocked dates.</p>}
                </div>
                <Button variant="primary" size="sm" style={{ marginTop: 'var(--space-4)' }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
            </Card>
        </div>
    );
}

/* ─── Services Tab Component ─────────────────────── */
function ServicesTab({ initialServices = [], onUpdate }) {
    const { user, token } = useAuth();
    const [services, setServices] = useState(initialServices);
    const [showAdd, setShowAdd] = useState(false);
    const [newService, setNewService] = useState({ name: '', price: '', duration: '30', category: 'Consultation' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setServices(initialServices);
    }, [initialServices]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user?.providerProfile) {
            toast.warning('Please set up your professional profile in the Settings tab first!');
            return;
        }
        setLoading(true);
        try {
            const added = await providerApi.addService(newService, token);
            const updatedServices = [...services, added];
            setServices(updatedServices);
            setNewService({ name: '', price: '', duration: '30', category: 'Consultation' });
            setShowAdd(false);
            if (onUpdate) onUpdate();
            toast.success('New service published successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to add service');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this service?')) return;
        try {
            await providerApi.deleteService(id, token);
            const updatedServices = services.filter(s => s.id !== id);
            setServices(updatedServices);
            if (onUpdate) onUpdate();
            toast.success('Service removed.');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const avgPrice = services.length > 0
        ? Math.round(services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) / services.length)
        : 0;

    if (!user?.providerProfile) {
        return (
            <div className="pcd-services-wrap animate-fade-in">
                <div className="my-bookings-header">
                    <div className="my-bookings-header-left">
                        <div className="my-bookings-header-icon">
                            <Zap size={24} />
                        </div>
                        <div className="my-bookings-header-text">
                            <h2>Manage Services</h2>
                            <p>Configure your consultation offerings and pricing</p>
                        </div>
                    </div>
                </div>

                <div className="pcd-services-setup-alert">
                    <div className="pcd-services-setup-icon">
                        <Settings size={36} />
                    </div>
                    <h3>Profile Setup Required</h3>
                    <p>You need to set up your professional profile (Specialty, Location, Bio) before adding consultation services for clients to book.</p>
                    <button
                        className="my-booking-btn my-booking-btn--purple"
                        style={{ padding: '10px 20px', fontSize: '0.95rem' }}
                        onClick={() => window.dispatchEvent(new CustomEvent('nav-dashboard', { detail: 'settings' }))}
                    >
                        Go to Settings Profile →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pcd-services-wrap animate-fade-in">
            {/* Header Card */}
            <div className="my-bookings-header">
                <div className="my-bookings-header-left">
                    <div className="my-bookings-header-icon">
                        <Zap size={24} />
                    </div>
                    <div className="my-bookings-header-text">
                        <h2>Manage Services</h2>
                        <p>Create, customize, and price your consultation offerings</p>
                    </div>
                </div>

                <button
                    className="pcd-services-add-btn"
                    onClick={() => setShowAdd(!showAdd)}
                >
                    <Sparkles size={16} />
                    {showAdd ? 'Close Form' : '+ Add New Service'}
                </button>
            </div>

            {/* Quick KPI Stats Row */}
            <div className="pcd-services-kpi-grid">
                <div className="pcd-services-kpi-card">
                    <div className="pcd-services-kpi-icon" style={{ background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea' }}>
                        <Zap size={20} />
                    </div>
                    <div>
                        <span className="pcd-services-kpi-label">Active Services</span>
                        <div className="pcd-services-kpi-val">{services.length}</div>
                    </div>
                </div>

                <div className="pcd-services-kpi-card">
                    <div className="pcd-services-kpi-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' }}>
                        <IndianRupee size={20} />
                    </div>
                    <div>
                        <span className="pcd-services-kpi-label">Avg. Consultation Fee</span>
                        <div className="pcd-services-kpi-val">₹{avgPrice.toLocaleString()}</div>
                    </div>
                </div>

                <div className="pcd-services-kpi-card">
                    <div className="pcd-services-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <span className="pcd-services-kpi-label">Standard Duration</span>
                        <div className="pcd-services-kpi-val">30 mins</div>
                    </div>
                </div>
            </div>

            {/* Add Service Form Drawer */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        className="pcd-services-form-card"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="pcd-services-form-header">
                            <h3>Publish New Consultation Service</h3>
                            <p>Enter service name, duration, category, and consultation fee</p>
                        </div>

                        <form onSubmit={handleAdd} className="pcd-services-form-grid">
                            <div className="pcd-services-field">
                                <label><FileText size={14} /> Service Name</label>
                                <input
                                    required
                                    className="pcd-services-input"
                                    placeholder="e.g. General Health Consultation"
                                    value={newService.name}
                                    onChange={e => setNewService({ ...newService, name: e.target.value })}
                                />
                            </div>

                            <div className="pcd-services-field">
                                <label><IndianRupee size={14} /> Fee Amount (₹)</label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    className="pcd-services-input"
                                    placeholder="500"
                                    value={newService.price}
                                    onChange={e => setNewService({ ...newService, price: e.target.value })}
                                />
                            </div>

                            <div className="pcd-services-field">
                                <label><Clock size={14} /> Duration</label>
                                <div className="pcd-services-duration-pills">
                                    {['15', '30', '45', '60', '90'].map(dur => (
                                        <button
                                            type="button"
                                            key={dur}
                                            className={`pcd-services-duration-pill ${newService.duration === dur ? 'active' : ''}`}
                                            onClick={() => setNewService({ ...newService, duration: dur })}
                                        >
                                            {dur} min
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pcd-services-field">
                                <label><Sparkles size={14} /> Category</label>
                                <input
                                    className="pcd-services-input"
                                    placeholder="e.g. Consultation, Therapy, Checkup"
                                    value={newService.category}
                                    onChange={e => setNewService({ ...newService, category: e.target.value })}
                                />
                            </div>

                            <div className="pcd-services-form-actions" style={{ gridColumn: 'span 2' }}>
                                <button type="button" className="my-booking-btn" onClick={() => setShowAdd(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="pcd-services-add-btn" disabled={loading}>
                                    {loading ? 'Publishing...' : 'Save & Publish Service'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Service Cards Grid */}
            {services.length === 0 ? (
                <div className="pcd-services-empty-card">
                    <div className="pcd-services-empty-icon">
                        <Sparkles size={36} />
                    </div>
                    <h3>No Consultation Services Yet</h3>
                    <p>Add your first service offerings so clients can browse and book appointments with you.</p>
                    <button className="pcd-services-add-btn" onClick={() => setShowAdd(true)} style={{ margin: '0 auto' }}>
                        + Add Your First Service
                    </button>
                </div>
            ) : (
                <div className="pcd-services-grid">
                    {services.map((s, i) => (
                        <motion.div
                            key={s.id}
                            className="pcd-service-card"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            {/* Card Header & Badge */}
                            <div className="pcd-service-card-top">
                                <span className="pcd-service-cat-badge">{s.category || 'Consultation'}</span>
                                <span className="pcd-service-status-badge">✓ Active</span>
                            </div>

                            {/* Main Info */}
                            <div className="pcd-service-card-body">
                                <div className="pcd-service-icon-box">
                                    <Zap size={22} />
                                </div>
                                <div className="pcd-service-title-wrap">
                                    <h3>{s.name}</h3>
                                    <div className="pcd-service-duration-line">
                                        <Clock size={14} color="#9333ea" />
                                        <span>{s.duration} minutes consultation</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price & Action Row */}
                            <div className="pcd-service-card-footer">
                                <div>
                                    <span className="pcd-service-fee-label">Consultation Fee</span>
                                    <div className="pcd-service-fee-val">₹{s.price}</div>
                                </div>

                                <button
                                    className="pcd-service-del-btn"
                                    onClick={() => handleDelete(s.id)}
                                    title="Delete Service"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Reviews Tab ────────────────────────────────── */
function ReviewsTab({ reviews }) {
    if (reviews.length === 0) {
        return (
            <div className="reviews-tab">
                <div className="dashboard__header">
                    <div><h1>Client Reviews</h1><p>Feedback from your clients.</p></div>
                </div>
                <Card variant="default" padding="lg" style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', color: '#ffb800' }}>
                        <Star size={40} />
                    </div>
                    <h3>No reviews yet</h3>
                    <p style={{ color: 'var(--text-light)' }}>Reviews will appear here once your clients start leaving feedback.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="reviews-tab">
            <div className="dashboard__header">
                <div><h1>Client Reviews</h1><p>See what your customers are saying about your consultation services.</p></div>
            </div>
            <div className="reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {reviews.map((r, idx) => (
                    <ReviewCard key={r.id || idx} review={r} />
                ))}
            </div>
        </div>
    );
}

/* ─── Settings Tab ───────────────────────────────── */
function SettingsTab() {
    const { user, token, login } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        specialty: user?.providerProfile?.specialty || '',
        phone: user?.phone || user?.providerProfile?.phone || '',
        location: user?.location || user?.providerProfile?.location || '',
        streetAddress: user?.streetAddress || '',
        city: user?.city || '',
        state: user?.state || '',
        zipCode: user?.zipCode || '',
        country: user?.country || 'IND',
        latitude: user?.latitude || null,
        longitude: user?.longitude || null,
        about: user?.providerProfile?.about || '',
    });
    const [saving, setSaving] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUploadDoc = async () => {
        if (!file) {
            toast.error('Please select a file first.');
            return;
        }
        setUploading(true);
        try {
            const res = await providerApi.uploadVerification(file, token);
            toast.success(res.message);
            login(res.user, token);
            setFile(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!formData.name || !formData.specialty || !formData.about) {
            toast.error('All professional details are required!');
            return;
        }
        if (formData.about.length < 50) {
            toast.error('Bio/About must be at least 50 characters long.');
            return;
        }
        setSaving(true);
        try {
            const updatedUser = await providerApi.updateProfile(formData, token);
            login(updatedUser, token); // Update context
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            toast.error(`Failed: ${err.message || 'Server error'}`);
        } finally {
            setSaving(false);
        }
    };

    const avatarUrl = user?.avatarUrl || null;
    const initials = (user?.name || 'P').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const memberSinceStr = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '27 Jan 2025';

    return (
        <div className="pcd-settings-wrap animate-fade-in">
            {/* Top Profile Header Card */}
            <div className="pcd-settings-profile-card">
                <div className="pcd-settings-profile-left">
                    <div className="pcd-settings-profile-avatar">
                        {avatarUrl
                            ? <img src={avatarUrl} alt={user?.name} />
                            : <span>{initials}</span>
                        }
                    </div>
                    <div className="pcd-settings-profile-meta">
                        <div className="pcd-settings-profile-name-row">
                            <h2 className="pcd-settings-profile-name">{user?.name || '—'}</h2>
                            {user.providerProfile?.isVerified && (
                                <span className="pcd-settings-profile-badge">✓ Verified Provider</span>
                            )}
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
                    <h3>Professional details</h3>
                    {!isEditing && (
                        <button className="pcd-settings-details-inline-edit" onClick={() => setIsEditing(true)}>
                            <Edit3 size={14} /> Edit
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <form onSubmit={handleSave}>
                        <div className="pcd-settings-edit-fields-grid">
                            <div className="pcd-settings-edit-field">
                                <label>Full Name</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="Full Name"
                                    required
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Email Address</label>
                                <input value={user?.email || ''} className="pcd-settings-edit-input pcd-settings-edit-input--readonly" readOnly />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Specialty</label>
                                <input
                                    name="specialty"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="e.g. Dentist"
                                    required
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Phone Number</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="+91 88107 70036"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>City</label>
                                <input
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="City"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>State</label>
                                <input
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="State"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Office Address</label>
                                <input
                                    name="streetAddress"
                                    value={formData.streetAddress}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="Office Address"
                                />
                            </div>
                            <div className="pcd-settings-edit-field">
                                <label>Postal Code</label>
                                <input
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="Postal Code"
                                />
                            </div>
                            <div className="pcd-settings-edit-field" style={{ gridColumn: 'span 2' }}>
                                <label>About / Bio (min 50 chars)</label>
                                <textarea
                                    name="about"
                                    rows={4}
                                    value={formData.about}
                                    onChange={handleChange}
                                    className="pcd-settings-edit-input"
                                    placeholder="Tell patients about your experience..."
                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                    required
                                />
                            </div>
                            <div className="pcd-settings-edit-field" style={{ gridColumn: 'span 2' }}>
                                <MapPicker
                                    value={{ lat: formData.latitude, lng: formData.longitude }}
                                    onChange={(pos) => setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }))}
                                    onAddressUpdate={(addr) => setFormData(prev => ({
                                        ...prev,
                                        streetAddress: addr.street || prev.streetAddress,
                                        city: addr.city || prev.city,
                                        state: addr.state || prev.state,
                                        zipCode: addr.zipCode || prev.zipCode,
                                        country: addr.country || prev.country
                                    }))}
                                    label="Pin Your Office Location"
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
                                <User size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">FULL NAME</span>
                                <span className="pcd-settings-details-value">{formData.name || user?.name || '—'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Mail size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">EMAIL</span>
                                <span className="pcd-settings-details-value">
                                    {user?.email || '—'}
                                </span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Star size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">SPECIALTY</span>
                                <span className="pcd-settings-details-value">{formData.specialty || 'Dentist'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Phone size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">NUMBER</span>
                                <span className="pcd-settings-details-value">
                                    {formData.phone || '—'}
                                </span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <FileText size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">ABOUT / BIO</span>
                                <span className="pcd-settings-details-value">{formData.about || 'Experienced dental surgeon with a focus on painless treatments.'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Globe size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">CITY / STATE</span>
                                <span className="pcd-settings-details-value">{[formData.city, formData.state].filter(Boolean).join(', ') || 'Delhi, Delhi'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <MapPin size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">OFFICE ADDRESS</span>
                                <span className="pcd-settings-details-value">{formData.streetAddress || 'Shop 20, Main Road'}</span>
                            </div>
                        </div>

                        <div className="pcd-settings-details-item">
                            <div className="pcd-settings-item-icon-box">
                                <Clock size={18} />
                            </div>
                            <div className="pcd-settings-details-info">
                                <span className="pcd-settings-details-label">POSTAL CODE</span>
                                <span className="pcd-settings-details-value">{formData.zipCode || '110001'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Card: Professional Verification */}
            <div className="pcd-settings-verify-card">
                <div className="pcd-settings-verify-left">
                    <div className="pcd-settings-verify-icon-wrap">
                        <Shield size={20} />
                    </div>
                    <div className="pcd-settings-verify-text">
                        <h4>Professional verification</h4>
                        {user.providerProfile?.isVerified ? (
                            <p className="pcd-settings-verify-success">✓ Account Verified & Credentials Approved</p>
                        ) : (
                            <p>Upload a certificate to build trust and unlock your "Verified" badge.</p>
                        )}
                    </div>
                </div>

                {!user.providerProfile?.isVerified && (
                    <div className="pcd-settings-verify-actions">
                        <input
                            type="file"
                            id="cert-upload-banner"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files[0])}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="cert-upload-banner" className="pcd-settings-cert-btn">
                            <Upload size={15} />
                            <span>{file ? file.name : 'Select file'}</span>
                        </label>
                        {file && (
                            <button className="pcd-settings-cert-submit" onClick={handleUploadDoc} disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Submit'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Main Dashboard ─────────────────────────────── */
export default function ProviderDashboard() {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();
    const [section, setSection] = useState('overview');
    const [bookings, setBookings] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [bookFilter, setBookFilter] = useState('all');
    const [syncTick, setSyncTick] = useState(0);
    const [fullProfile, setFullProfile] = useState(null);
    const [hasVisitedBookings, setHasVisitedBookings] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [messageTarget, setMessageTarget] = useState(null);
    const [mapTarget, setMapTarget] = useState(null);
    const [clientProfileTarget, setClientProfileTarget] = useState(null);
    const [showVideoGuide, setShowVideoGuide] = useState(false);
    const [loading, setLoading] = useState(true);
    const myConnection = useSocket();

    const handleSectionChange = useCallback((targetSection) => {
        setSection(targetSection);
        if (targetSection === 'messages') setUnreadMessages(0);
        if (targetSection === 'bookings') {
            setHasVisitedBookings(true);
            const hasPending = bookings.some(b => b.status === 'pending');
            if (hasPending) {
                setBookFilter('pending');
            }
        }
    }, [bookings]);

    const handleNotifNavigate = handleSectionChange;

    // Listen for live socket events to instantly badge and refresh bookings/messages
    useEffect(() => {
        if (myConnection) {
            const handleNotif = (notif) => {
                if (notif.type.startsWith('BOOKING_') || notif.type === 'NEW_REVIEW') {
                    if (notif.type === 'BOOKING_REQUESTED' && section !== 'bookings') {
                        setHasVisitedBookings(false);
                    }
                    setSyncTick(t => t + 1);
                } else if (notif.type === 'NEW_MESSAGE') {
                    if (section !== 'messages') {
                        setUnreadMessages(prev => prev + 1);
                    }
                    setSyncTick(t => t + 1);
                }
            };
            myConnection.on('new_notification', handleNotif);
            return () => myConnection.off('new_notification', handleNotif);
        }
    }, [myConnection, section]);

    useEffect(() => {
        if (!token) return;
        messageApi.getConversations(token).then(data => {
            const sum = data.reduce((acc, c) => acc + c.unreadCount, 0);
            if (section !== 'messages') setUnreadMessages(sum);
        }).catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [token, syncTick, section]);

    useEffect(() => {
        const handleNav = (e) => handleSectionChange(e.detail);
        window.addEventListener('nav-dashboard', handleNav);
        return () => window.removeEventListener('nav-dashboard', handleNav);
    }, [handleSectionChange]);

    useEffect(() => {
        if (!token) return;
        appointmentApi.getMy(token).then(data => {
            const formatted = data.map(b => ({
                id: b.id,
                clientId: b.client?.id,
                client: b.client?.name || 'Client',
                clientLocation: b.serviceAddress || (b.address ? [b.address.streetAddress, b.address.city, b.address.state].filter(Boolean).join(', ') : null) || b.client?.location || [b.client?.city, b.client?.state].filter(Boolean).join(', ') || 'Not specified',
                rawClient: b.client,
                serviceAddress: b.serviceAddress,
                address: b.address,
                service: b.service?.name || 'Service',
                date: new Date(b.date).toLocaleDateString(),
                rawDate: new Date(b.date),
                time: new Date(b.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: b.service?.duration || 30,
                price: b.service?.price || 0,
                status: b.status.toLowerCase(),
                note: b.note,
                notes: b.note,
                clientAvatar: <UserRound size={20} className="icon-muted" />,
                latitude: b.latitude || b.client?.latitude,
                longitude: b.longitude || b.client?.longitude,
                location: b.serviceAddress || (b.address ? [b.address.streetAddress, b.address.city].filter(Boolean).join(', ') : null) || b.client?.location || [b.client?.streetAddress, b.client?.city].filter(Boolean).join(', ') || 'Client Location',
                providerLat: b.provider?.user?.latitude,
                providerLng: b.provider?.user?.longitude,
            }));
            setBookings(formatted);
            const hasPending = formatted.some(b => b.status === 'pending');
            setBookFilter(prev => (prev === 'all' && hasPending ? 'pending' : prev));
        }).catch(err => console.error(err));

        // Also fetch full profile to ensure services/settings are in sync
        providerApi.getById(user.id).then(data => {
            setFullProfile(data.providerProfile);
            if (data.providerProfile?.id) {
                reviewApi.getProviderReviews(data.providerProfile.id).then(setReviews);
            }
        }).catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [token, syncTick, user.id]);

    const handleAction = async (id, status) => {
        try {
            await appointmentApi.updateStatus(id, status.toUpperCase(), token);
            setSyncTick(t => t + 1);
        } catch (err) {
            console.error(err);
        }
    };

    const accept = id => handleAction(id, 'confirmed');
    const decline = id => handleAction(id, 'cancelled');
    const complete = id => handleAction(id, 'completed');

    const handleMessage = (booking) => {
        setMessageTarget({
            id: booking.clientId,
            name: booking.client
        });
    };

    const totalEarnings = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.price, 0);
    const pendingEarnings = bookings.filter(b => b.status === 'pending').reduce((s, b) => s + b.price, 0);
    const confirmedEarnings = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + b.price, 0);
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dynamicWeeklyEarnings = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, amount: 0 }));
    bookings.forEach(b => {
        if (b.status === 'completed' && b.rawDate) {
            const dayName = daysMap[b.rawDate.getDay()];
            const bin = dynamicWeeklyEarnings.find(d => d.day === dayName);
            if (bin) bin.amount += b.price;
        }
    });
    const weeklyEarnings = dynamicWeeklyEarnings.reduce((s, d) => s + d.amount, 0);

    const filtered = bookFilter === 'all' ? bookings : bookings.filter(b => b.status === bookFilter);

    // Profile completeness check
    const profile = fullProfile || user?.providerProfile;
    const isProfileComplete = profile &&
        profile.phone &&
        profile.location &&
        profile.specialty &&
        profile.about &&
        profile.about.length >= 50;

    const badgeCount = hasVisitedBookings ? 0 : pendingCount;

    return (
        <div className="dashboard">
            <Sidebar
                user={{
                    name: user?.name || 'Provider',
                    email: user?.email || '',
                    avatar: '🧑‍💼'
                }}
                activeSection={section}
                onNav={(id) => {
                    if (!fullProfile && !user?.providerProfile) {
                        toast.warning('Please complete your profile details first!');
                        return;
                    }
                    handleSectionChange(id);
                }}
                navItems={[
                    { id: 'overview', icon: 'LayoutDashboard', label: 'Overview' },
                    { id: 'bookings', icon: 'Calendar', label: 'Bookings', badgeCount: badgeCount },
                    { id: 'messages', icon: 'MessageSquare', label: 'Messages', badgeCount: unreadMessages },
                    { id: 'reviews', icon: 'Star', label: 'Reviews' },
                    { id: 'services', icon: 'Briefcase', label: 'Services' },
                    { id: 'schedule', icon: 'Clock', label: 'My Schedule' },
                    { id: 'earnings', icon: 'CreditCard', label: 'Earnings' },
                    { id: 'settings', icon: 'Settings', label: 'Settings' },
                ]}
                footerItems={[
                    { id: 'view-profile', icon: 'User', label: 'View my profile', to: `/provider/${user?.id || 'me'}` },
                    { id: 'guides', icon: 'PlayCircle', label: 'Watch Guides', onClick: () => setShowVideoGuide(true) },
                    { id: 'logout', icon: 'LogOut', label: 'Sign Out', onClick: () => { logout(); navigate('/'); }, className: 'sidebar__nav-item--logout' },
                ]}
            />

            <main className="dashboard__main">
                {showVideoGuide && <VideoGuideModal onClose={() => setShowVideoGuide(false)} />}
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
                        <Card variant="default" padding="lg" style={{ height: '350px' }}>
                            <Skeleton variant="text" width="200px" height="1.5rem" style={{ marginBottom: '1.5rem' }} />
                            <Skeleton variant="rect" height="250px" />
                        </Card>
                        <div className="dashboard__section" style={{ marginTop: '2rem' }}>
                            <Skeleton variant="text" width="200px" height="1.8rem" style={{ marginBottom: '1.5rem' }} />
                            <div>
                                {Array(3).fill(0).map((_, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                        <Skeleton variant="circle" width="40px" height="40px" />
                                        <div style={{ flex: 1 }}>
                                            <Skeleton variant="text" width="30%" />
                                            <Skeleton variant="text" width="20%" />
                                        </div>
                                        <Skeleton variant="text" width="10%" />
                                        <Skeleton variant="text" width="40px" height="20px" style={{ borderRadius: '12px' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Profile Incomplete Banner */}
                        {!isProfileComplete && (
                            <div style={{
                                background: 'var(--warning-light)',
                                border: '1px solid var(--warning)',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                color: 'var(--warning-dark)'
                            }}>
                                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                <div>
                                    <strong>Finalize your profile!</strong>
                                    <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>
                                        You must complete your professional details (phone, location, specialty, and bio) before you can manage bookings or services.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Force Settings tab if incomplete */}
                        {!isProfileComplete && section !== 'settings' ? (
                            <div className="dashboard__content animate-fade-in">
                                <SettingsTab />
                            </div>
                        ) : (
                            <>
                                {/* ── Overview ── */}
                                {section === 'overview' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <header className="dashboard-header">
                                            <div className="header-left">
                                                <h1>Hello, {user.name.split(' ')[0]}! {user.providerProfile?.isVerified && <Badge variant="success" style={{ marginLeft: '10px', fontSize: '0.9rem' }}>✓ Verified</Badge>}</h1>
                                                <p className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                            </div>
                                            <div className="header-actions">
                                                <ThemeToggle />
                                                <NotificationBell onNavigate={handleNotifNavigate} />
                                                <Button variant="primary" onClick={() => navigate(`/provider/${user.id}`)}>View Public Profile</Button>
                                            </div>
                                        </header>
                                        {/* KPI row */}
                                        <div className="stats-grid">
                                            {[
                                                { label: 'Total Revenue', value: `₹${totalEarnings.toLocaleString()}`, icon: <IndianRupee size={22} />, color: 'hsl(142, 70%, 40%)' },
                                                { label: 'Upcoming', value: `₹${confirmedEarnings.toLocaleString()}`, icon: <TrendingUp size={22} />, color: 'var(--primary)' },
                                                { label: 'Requests', value: pendingCount, icon: <HourglassIcon size={22} />, color: 'hsl(38, 80%, 45%)' },
                                                { label: 'Confirmed', value: confirmedCount, icon: <CheckCircle2 size={22} />, color: 'hsl(142, 70%, 40%)' },
                                            ].map((s, i) => (
                                                <Card key={s.label} variant="default" className="stat-card" style={{ '--stat-color': s.color }} animate delay={i * 0.1}>
                                                    <div className="stat-card__icon">{s.icon}</div>
                                                    <div className="stat-card__value">{s.value}</div>
                                                    <div className="stat-card__label">{s.label}</div>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Verification Alert Banner */}
                                        {!user.providerProfile?.isVerified && !user.providerProfile?.verificationDocument && (
                                            <div style={{
                                                background: 'rgba(52, 152, 219, 0.1)',
                                                border: '1px solid var(--primary)',
                                                padding: '1.25rem 1.5rem',
                                                borderRadius: '16px',
                                                marginBottom: '2rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '1.5rem',
                                                color: 'var(--primary)',
                                                backdropFilter: 'blur(10px)',
                                                boxShadow: '0 8px 32px rgba(31, 38, 135, 0.1)'
                                            }} className="animate-fade-in verification-banner">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                    <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                                                        <ShieldAlert size={24} />
                                                    </div>
                                                    <div>
                                                        <strong style={{ fontSize: '1.1rem' }}>Complete Your Professional Verification!</strong>
                                                        <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                                            Upload your professional certificates to build trust with clients and unlock your "Verified" badge.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="primary" size="lg" onClick={() => setSection('settings')} style={{ whiteSpace: 'nowrap' }}>Verify Now</Button>
                                            </div>
                                        )}

                                        {/* Verification Pending Banner */}
                                        {!user.providerProfile?.isVerified && user.providerProfile?.verificationDocument && (
                                            <div style={{
                                                background: 'rgba(243, 156, 18, 0.1)',
                                                border: '1px solid var(--warning)',
                                                padding: '1.25rem 1.5rem',
                                                borderRadius: '16px',
                                                marginBottom: '2rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.25rem',
                                                color: 'var(--warning)',
                                                backdropFilter: 'blur(10px)'
                                            }} className="animate-fade-in verification-banner">
                                                <div style={{ background: 'var(--warning)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                                                    <HourglassIcon size={24} />
                                                </div>
                                                <div>
                                                    <strong style={{ fontSize: '1.1rem' }}>Verification Under Review</strong>
                                                    <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                                        We are carefully reviewing your professional documents. You'll be notified immediately once approved.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Weekly earnings chart */}
                                        <Card variant="default" padding="md" animate delay={0.4}>
                                            <div className="chart-header">
                                                <h3 className="settings-section-title" style={{ margin: 0 }}>Weekly Earnings</h3>
                                                <span className="chart-total">₹{weeklyEarnings.toLocaleString()} this week</span>
                                            </div>
                                            <EarningsChart data={dynamicWeeklyEarnings} />
                                        </Card>

                                        {/* Pending bookings */}
                                        <div className="dashboard__section">
                                            <div className="dashboard__section-header">
                                                <h2>Pending Requests
                                                    {pendingCount > 0 && <span className="pending-badge">{pendingCount}</span>}
                                                </h2>
                                                <button className="see-all-btn" onClick={() => setSection('bookings')}>See all →</button>
                                            </div>
                                            <div className="bookings-table">
                                                {bookings.filter(b => b.status === 'pending').length === 0
                                                    ? (
                                                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                                            <div style={{ marginBottom: '1rem', color: 'var(--success)', opacity: 0.8 }}>
                                                                <PartyPopper size={40} style={{ margin: '0 auto' }} />
                                                            </div>
                                                            <p className="empty-hint">No pending requests at the moment.</p>
                                                        </div>
                                                    )
                                                    : bookings.filter(b => b.status === 'pending').map((b, i) => (
                                                        <BookingRow
                                                            key={b.id}
                                                            booking={b}
                                                            index={i}
                                                            onAccept={accept}
                                                            onDecline={decline}
                                                            onComplete={complete}
                                                            onMessage={() => handleMessage(b)}
                                                            onShowMap={(book) => setMapTarget(book)}
                                                            onShowClientProfile={(book) => setClientProfileTarget(book)}
                                                            providerCoords={{ lat: user.latitude, lng: user.longitude }}
                                                        />
                                                    ))
                                                }
                                            </div>
                                        </div>

                                        {/* Today's confirmed */}
                                        {/* Today's schedule component ... */}
                                        <div className="dashboard__section">
                                            <div className="dashboard__section-header">
                                                <h2>Today's Schedule</h2>
                                            </div>
                                            <div className="bookings-table">
                                                {bookings.filter(b => b.status === 'confirmed' && b.date === new Date().toLocaleDateString()).length === 0
                                                    ? <p className="empty-hint">No appointments for today.</p>
                                                    : bookings.filter(b => b.status === 'confirmed' && b.date === new Date().toLocaleDateString()).map((b, i) => (
                                                        <BookingRow
                                                            key={b.id}
                                                            booking={b}
                                                            index={i}
                                                            onAccept={accept}
                                                            onDecline={decline}
                                                            onComplete={complete}
                                                            onMessage={() => handleMessage(b)}
                                                            onShowMap={(book) => setMapTarget(book)}
                                                            onShowClientProfile={(book) => setClientProfileTarget(book)}
                                                            providerCoords={{ lat: user.latitude, lng: user.longitude }}
                                                        />
                                                    ))
                                                }
                                            </div>
                                        </div>

                                        {/* My Services Section */}
                                        <div className="dashboard__section">
                                            <div className="dashboard__section-header">
                                                <h2>My Services</h2>
                                                <button className="see-all-btn" onClick={() => handleSectionChange('services')}>Manage →</button>
                                            </div>
                                            <div className="services-overview-grid">
                                                {!profile?.services || profile.services?.length === 0 ? (
                                                    <Card variant="default" padding="md" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                                                        <p className="empty-hint">No services added yet.</p>
                                                    </Card>
                                                ) : (
                                                    profile.services?.map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className="service-mini-card animate-fade-in"
                                                        >
                                                            <div className="service-mini-icon">
                                                                <Zap size={18} color="var(--primary)" />
                                                            </div>
                                                            <div className="service-mini-info">
                                                                <div className="service-mini-name">{s.name}</div>
                                                                <div className="service-mini-meta">₹{s.price} · {s.duration} min</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Bookings ── */}
                                {section === 'bookings' && (
                                    <div className="dashboard__content animate-fade-in my-bookings-container">
                                        {/* My Bookings Header Card */}
                                        <div className="my-bookings-header">
                                            <div className="my-bookings-header-left">
                                                <div className="my-bookings-header-icon">
                                                    <Calendar size={24} />
                                                </div>
                                                <div className="my-bookings-header-text">
                                                    <h2>My Bookings</h2>
                                                    <p>View and manage your service consultation bookings</p>
                                                </div>
                                            </div>

                                            <div className="filter-bar" style={{ margin: 0 }}>
                                                {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
                                                    <button
                                                        key={f}
                                                        className={`filter-btn ${bookFilter === f ? 'filter-btn--active' : ''}`}
                                                        onClick={() => setBookFilter(f)}
                                                    >
                                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                                        <span className="filter-btn__count">{f === 'all' ? bookings.length : bookings.filter(b => b.status === f).length}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Bookings List */}
                                        {filtered.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                <p className="empty-hint">No bookings found in this section.</p>
                                            </div>
                                        ) : (
                                            filtered.map((b, i) => (
                                                <BookingRow
                                                    key={b.id}
                                                    booking={b}
                                                    index={i}
                                                    onAccept={accept}
                                                    onDecline={decline}
                                                    onComplete={complete}
                                                    onMessage={() => handleMessage(b)}
                                                    onShowMap={(book) => setMapTarget(book)}
                                                    onShowClientProfile={(book) => setClientProfileTarget(book)}
                                                    providerCoords={{ lat: user.latitude, lng: user.longitude }}
                                                />
                                            ))
                                        )}



                                        {/* Confidentiality Footer */}
                                        <div className="my-bookings-footer-security">
                                            <div className="my-bookings-footer-line" />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ShieldCheck size={16} color="#64748b" />
                                                <span>All consultations are secure and confidential</span>
                                            </div>
                                            <div className="my-bookings-footer-line" />
                                        </div>
                                    </div>
                                )}

                                {/* ── Messages ── */}
                                {section === 'messages' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>Messages</h1><p>Chat with your clients.</p></div>
                                            <div className="header-actions">
                                                <NotificationBell onNavigate={handleNotifNavigate} />
                                            </div>
                                        </div>
                                        <MessagesTab />
                                    </div>
                                )}

                                {/* ── Schedule ── */}
                                {section === 'schedule' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>My Schedule</h1><p>Set your working days, time slots, and block dates.</p></div>
                                            <div className="header-actions">
                                                <NotificationBell onNavigate={handleNotifNavigate} />
                                            </div>
                                        </div>
                                        <ScheduleTab user={user} token={token} onUpdate={() => setSyncTick(t => t + 1)} />
                                    </div>
                                )}

                                {/* ── Earnings ── */}
                                {section === 'earnings' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>Earnings</h1><p>Track your revenue over time.</p></div>
                                            <div className="header-actions">
                                                <NotificationBell onNavigate={handleNotifNavigate} />
                                            </div>
                                        </div>
                                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {[
                                                { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: <IndianRupee size={22} /> },
                                                { label: 'This Week', value: `₹${weeklyEarnings.toLocaleString()}`, icon: <CalendarDays size={22} /> },
                                                { label: 'Pending Payout', value: `₹${pendingEarnings.toLocaleString()}`, icon: <HourglassIcon size={22} /> },
                                            ].map((s, i) => (
                                                <Card key={s.label} variant="default" className="stat-card" style={{ '--stat-color': 'var(--primary)' }} animate delay={i * 0.1}>
                                                    <div className="stat-card__icon">{s.icon}</div>
                                                    <div className="stat-card__value">{s.value}</div>
                                                    <div className="stat-card__label">{s.label}</div>
                                                </Card>
                                            ))}
                                        </div>
                                        <Card variant="default" padding="md" animate delay={0.4}>
                                            <div className="chart-header">
                                                <h3 className="settings-section-title" style={{ margin: 0 }}>Daily Earnings — This Week</h3>
                                                <span className="chart-total">₹{weeklyEarnings.toLocaleString()}</span>
                                            </div>
                                            <EarningsChart data={dynamicWeeklyEarnings} />
                                        </Card>
                                        <Card variant="default" padding="md">
                                            <h3 className="settings-section-title">Transaction History</h3>
                                            <div className="bookings-table">
                                                {bookings.filter(b => b.status === 'completed').map((b, i) => (
                                                    <motion.div
                                                        key={b.id}
                                                        className="earnings-row"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                    >
                                                        <span className="booking-row__avatar">{b.clientAvatar}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="booking-row__name">{b.client}</div>
                                                            <div className="booking-row__service">{b.service} · {b.date}</div>
                                                        </div>
                                                        <span className="earnings-amount">+₹{b.price}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </Card>
                                    </div>
                                )}

                                {/* ── Reviews ── */}
                                {section === 'reviews' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <ReviewsTab reviews={reviews} />
                                    </div>
                                )}

                                {/* ── Services ── */}
                                {section === 'services' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <ServicesTab
                                            initialServices={profile?.services || []}
                                            onUpdate={() => setSyncTick(t => t + 1)}
                                        />
                                    </div>
                                )}

                                {/* ── Settings ── */}
                                {section === 'settings' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <SettingsTab />
                                    </div>
                                )}
                            </>
                        )}
                    </>
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
                <MapDirectionsModal
                    isOpen={!!mapTarget}
                    onClose={() => setMapTarget(null)}
                    providerPos={{ lat: user.latitude, lng: user.longitude }}
                    clientPos={mapTarget ? { lat: mapTarget.latitude, lng: mapTarget.longitude } : { lat: 0, lng: 0 }}
                    clientName={mapTarget?.client || "Client"}
                />
                {clientProfileTarget && (
                    <ClientProfileModal
                        booking={clientProfileTarget}
                        onClose={() => setClientProfileTarget(null)}
                        onMessage={() => handleMessage(clientProfileTarget)}
                        onShowMap={(book) => setMapTarget(book)}
                    />
                )}
            </main>

            <AnimatePresence>
                {showVideoGuide && (
                    <VideoGuideModal onClose={() => setShowVideoGuide(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}
