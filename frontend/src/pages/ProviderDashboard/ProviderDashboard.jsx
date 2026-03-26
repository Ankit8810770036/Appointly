import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
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
import * as Icons from 'lucide-react';
import './ProviderDashboard.css';

// Earnings are calculated dynamically below

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

const STATUS_VARIANT = { confirmed: 'success', pending: 'warning', completed: 'default', cancelled: 'danger' };
const STATUS_LABEL = { confirmed: '✅ Confirmed', pending: '⏳ Pending', completed: '☑️ Done', cancelled: '❌ Cancelled' };

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

/* ─── Booking Row ────────────────────────────────── */
function BookingRow({ booking, onAccept, onDecline, onComplete, index = 0 }) {
    return (
        <motion.div
            className={`booking-row booking-row--${booking.status}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
        >
            <div className="booking-row__client">
                <span className="booking-row__avatar">{booking.clientAvatar}</span>
                <div>
                    <span className="booking-row__name">{booking.client}</span>
                    <span className="booking-row__service">{booking.service}</span>
                </div>
            </div>
            <div className="booking-row__datetime">
                <span>📅 {booking.date}</span>
                <span>⏰ {booking.time} · {booking.duration}min</span>
            </div>
            <span className="booking-row__price">₹{booking.price}</span>
            <Badge variant={STATUS_VARIANT[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
            <div className="booking-row__actions">
                {booking.status === 'pending' && (
                    <>
                        <Button variant="primary" size="sm" onClick={() => onAccept(booking.id)}>Accept</Button>
                        <Button variant="ghost" size="sm" onClick={() => onDecline(booking.id)}>Decline</Button>
                    </>
                )}
                {booking.status === 'confirmed' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline" size="sm" onClick={() => onComplete(booking.id)}>Mark Done</Button>
                        <Button variant="ghost" size="sm" onClick={() => decline(booking.id)} style={{ color: 'var(--danger)' }}>Cancel</Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ─── Schedule Tab ───────────────────────────────── */
function ScheduleTab({ user, token, onUpdate }) {
    const { login } = useAuth();
    const profile = user?.providerProfile;
    const daysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const [selectedDay, setSelectedDay] = useState('MON');

    // workSchedule state: { MON: ['09:00', ...], TUE: [...] }
    const [workSchedule, setWorkSchedule] = useState(() => {
        if (profile?.workSchedule && Object.keys(profile.workSchedule).length > 0) {
            return profile.workSchedule;
        }
        // Fallback to old availableSlots if workSchedule is empty
        const initialSlots = profile?.availableSlots || ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
        return Object.fromEntries(daysMap.map(d => [d.toUpperCase(), [...initialSlots]]));
    });

    const availability = useMemo(() => {
        return Object.fromEntries(daysMap.map(d => [
            d.toUpperCase(),
            (workSchedule[d.toUpperCase()]?.length || 0) > 0
        ]));
    }, [workSchedule, daysMap]);

    const [blockDates, setBlockDates] = useState(profile?.blockedDates || []);
    const [newBlock, setNewBlock] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const workingDays = Object.entries(workSchedule)
                .filter(([_, slots]) => slots.length > 0)
                .map(([day, _]) => day);

            // Flatten unique slots for backward compatibility
            const availableSlots = [...new Set(Object.values(workSchedule).flat())];

            const updatedUser = await providerApi.updateProfile({
                workingDays,
                availableSlots,
                workSchedule,
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
            return { ...prev, [day]: newSlots };
        });
    };

    const copyToAll = () => {
        const currentSlots = workSchedule[selectedDay] || [];
        const newSchedule = Object.fromEntries(daysMap.map(d => [d.toUpperCase(), [...currentSlots]]));
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
                    {daysMap.map(d => {
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

/* ─── Services Tab ─────────────────────────────────── */
function ServicesTab({ onUpdate, initialServices }) {
    const { user, token } = useAuth();
    const [services, setServices] = useState(initialServices || []);

    useEffect(() => {
        setServices(initialServices);
    }, [initialServices]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [newService, setNewService] = useState({ name: '', price: '', duration: '30', category: 'General' });

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
            setNewService({ name: '', price: '', duration: '30' });
            setShowAdd(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user?.providerProfile) {
        return (
            <div className="services-tab">
                <div className="dashboard__section-header">
                    <h2>Manage Services</h2>
                </div>
                <Card variant="default" padding="lg" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                    <h3 style={{ marginBottom: '0.5rem' }}>Profile Setup Required</h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
                        You need to set up your professional profile (Specialty, Location, etc.) before you can add services.
                    </p>
                    <Button variant="primary" onClick={() => window.dispatchEvent(new CustomEvent('nav-dashboard', { detail: 'settings' }))}>
                        Go to Settings
                    </Button>
                </Card>
            </div>
        );
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this service?')) return;
        try {
            await providerApi.deleteService(id, token);
            const updatedServices = services.filter(s => s.id !== id);
            setServices(updatedServices);
            if (onUpdate) onUpdate();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <div className="services-tab">
            <div className="dashboard__section-header">
                <h2>Manage Services</h2>
                <Button variant="primary" size="sm" onClick={() => setShowAdd(!showAdd)}>
                    {showAdd ? 'Cancel' : '+ Add Service'}
                </Button>
            </div>

            {showAdd && (
                <Card variant="default" padding="md" style={{ marginBottom: '2rem' }}>
                    <form onSubmit={handleAdd} className="settings-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="settings-field">
                            <label>Service Name</label>
                            <input
                                required
                                className="settings-input"
                                placeholder="e.g. Initial Consultation"
                                value={newService.name}
                                onChange={e => setNewService({ ...newService, name: e.target.value })}
                            />
                        </div>
                        <div className="settings-field">
                            <label>Price (₹)</label>
                            <input
                                required
                                type="number"
                                className="settings-input"
                                placeholder="500"
                                value={newService.price}
                                onChange={e => setNewService({ ...newService, price: e.target.value })}
                            />
                        </div>
                        <div className="settings-field">
                            <label>Duration (min)</label>
                            <select
                                className="settings-input"
                                value={newService.duration}
                                onChange={e => setNewService({ ...newService, duration: e.target.value })}
                            >
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                            </select>
                        </div>
                        <div className="settings-field">
                            <label>Category</label>
                            <input
                                className="settings-input"
                                placeholder="e.g. Consultation, Treatment"
                                value={newService.category}
                                onChange={e => setNewService({ ...newService, category: e.target.value })}
                            />
                        </div>
                        <div className="settings-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button variant="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
                                {loading ? 'Saving...' : 'Save Service'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="services-list grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {services.length === 0 ? (
                    <Card variant="default" padding="lg" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                        <p className="empty-hint">You haven't added any services yet. Clients won't be able to book you until you add at least one.</p>
                    </Card>
                ) : (
                    services.map(s => (
                        <Card key={s.id} variant="default" padding="md" className="service-item-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    {s.category && <span className="service-cat-badge">{s.category}</span>}
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-bold)' }}>{s.name}</h4>
                                    <p style={{ color: 'var(--text-light)', margin: '0.5rem 0 0', fontSize: '0.95rem', fontWeight: 500 }}>
                                        <span style={{ marginRight: '12px' }}>⏱️ {s.duration} min</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>💰 ₹{s.price}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: 'none',
                                        color: 'var(--danger)',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Delete Service"
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div >
    );
}

/* ─── Analytics Tab ──────────────────────────────── */
function AnalyticsTab({ bookings }) {
    const totalBookings = bookings.length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const revenue = bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.price, 0);

    const calcRate = (num, den) => den === 0 ? 0 : Math.round((num / den) * 100);
    const resolvedBookings = totalBookings - bookings.filter(b => b.status === 'pending').length;
    const completionRate = calcRate(completed, resolvedBookings);
    const cancelRate = calcRate(cancelled, totalBookings);

    const services = {};
    bookings.forEach(b => { services[b.service] = (services[b.service] || 0) + 1; });
    const sorted = Object.entries(services).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;

    return (
        <div className="analytics-tab">
            <div className="analytics-kpis">
                {[
                    { label: 'Total Bookings', value: totalBookings, delta: 'Lifetime', up: true },
                    { label: 'Completion Rate', value: `${completionRate}%`, delta: 'Resolved', up: true },
                    { label: 'Total Revenue', value: `₹${revenue.toLocaleString()}`, delta: 'Lifetime', up: true },
                    { label: 'Cancel Rate', value: `${cancelRate}%`, delta: 'Total', up: false },
                ].map(k => (
                    <Card key={k.label} variant="default" className="kpi-card">
                        <div className="kpi-value">{k.value}</div>
                        <div className="kpi-label">{k.label}</div>
                        <span className={`kpi-delta ${k.up ? 'kpi-delta--up' : 'kpi-delta--down'}`}>{k.delta}</span>
                    </Card>
                ))}
            </div>

            <Card variant="default" padding="md">
                <h3 className="settings-section-title">Popular Services</h3>
                <div className="service-bars">
                    {sorted.map(([name, count]) => (
                        <div key={name} className="service-bar-row">
                            <span className="service-bar-name">{name}</span>
                            <div className="service-bar-track">
                                <div className="service-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                            </div>
                            <span className="service-bar-count">{count} sessions</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

/* ─── Settings Tab ───────────────────────────────── */
function SettingsTab() {
    const { user, token, login } = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        specialty: user?.providerProfile?.specialty || '',
        phone: user?.providerProfile?.phone || '',
        location: user?.providerProfile?.location || '',
        about: user?.providerProfile?.about || '',
    });
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.specialty || !formData.about) {
            toast.error('All professional details are required!');
            return;
        }
        if (formData.about.length < 50) {
            toast.error('Bio/About must be at least 50 characters long.');
            return;
        }
        setSaving(true);
        setSuccessMsg('');
        try {
            const updatedUser = await providerApi.updateProfile(formData, token);
            login(updatedUser, token); // Update context
            toast.success('Profile updated successfully!');
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error(err);
            toast.error(`Failed: ${err.message || 'Server error'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="settings-tab">
            <div className="dashboard__header">
                <div>
                    <h1>Professional Settings</h1>
                    <p>Manage your professional profile and credentials.</p>
                </div>
                <div className="header-actions">
                    <ThemeToggle />
                </div>
            </div>
            <Card variant="default" padding="lg" className="settings-card">
                <h3 className="settings-section-title">Professional Information</h3>
                <div className="settings-fields">
                    <div className="settings-field">
                        <label>Full Name</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="settings-input" placeholder="Your Name" />
                    </div>
                    <div className="settings-field">
                        <label>Email</label>
                        <input value={user?.email || ''} className="settings-input" readOnly />
                    </div>
                    <div className="settings-field">
                        <label>Specialty</label>
                        <input name="specialty" value={formData.specialty} onChange={handleChange} className="settings-input" placeholder="e.g. Dermatologist" />
                    </div>
                    <div className="settings-field">
                        <label>Phone</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} className="settings-input" placeholder="e.g. +91 9876543210" />
                    </div>
                    <div className="settings-field">
                        <label>Location</label>
                        <input name="location" value={formData.location} onChange={handleChange} className="settings-input" placeholder="e.g. Koramangala, Bengaluru" />
                    </div>
                </div>
                <div className="settings-field" style={{ marginBottom: 'var(--space-4)' }}>
                    <label>Bio / About</label>
                    <textarea name="about" className="auth-textarea" rows={4} value={formData.about} onChange={handleChange} placeholder="Tell patients about your experience..." style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div className="settings-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    {successMsg && <span style={{ color: 'var(--success)', fontWeight: '500' }}>{successMsg}</span>}
                </div>
            </Card>

            <Card variant="default" padding="lg" className="settings-card" style={{ marginTop: '2rem' }}>
                <h3 className="settings-section-title">Notifications</h3>
                {[
                    { label: 'New booking requests', checked: true },
                    { label: 'Booking confirmations', checked: true },
                    { label: 'Cancellations', checked: true },
                    { label: 'Review alerts', checked: false },
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

/* ─── Main Dashboard ─────────────────────────────── */
export default function ProviderDashboard() {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();
    const [section, setSection] = useState('overview');
    const [bookings, setBookings] = useState([]);
    const [bookFilter, setBookFilter] = useState('all');
    const [syncTick, setSyncTick] = useState(0);
    const [fullProfile, setFullProfile] = useState(null);
    const [hasVisitedBookings, setHasVisitedBookings] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [loading, setLoading] = useState(true);
    const myConnection = useSocket();

    useEffect(() => {
        if (section === 'bookings') setHasVisitedBookings(true);
        if (section === 'messages') setUnreadMessages(0);
    }, [section]);

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
        setLoading(true);
        messageApi.getConversations(token).then(data => {
            const sum = data.reduce((acc, c) => acc + c.unreadCount, 0);
            if (section !== 'messages') setUnreadMessages(sum);
        }).catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [token, syncTick]);

    useEffect(() => {
        const handleNav = (e) => setSection(e.detail);
        window.addEventListener('nav-dashboard', handleNav);
        return () => window.removeEventListener('nav-dashboard', handleNav);
    }, []);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        appointmentApi.getMy(token).then(data => {
            setBookings(data.map(b => ({
                id: b.id,
                client: b.client?.name || 'Client',
                service: b.service?.name || 'Service',
                date: new Date(b.date).toLocaleDateString(),
                rawDate: new Date(b.date),
                time: new Date(b.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: b.service?.duration || 30,
                price: b.service?.price || 0,
                status: b.status.toLowerCase(),
                clientAvatar: '👤'
            })));
        }).catch(err => console.error(err));

        // Also fetch full profile to ensure services/settings are in sync
        providerApi.getById(user.id).then(data => {
            setFullProfile(data.providerProfile);
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
                    setSection(id);
                }}
                navItems={[
                    { id: 'overview', icon: 'LayoutDashboard', label: 'Overview' },
                    { id: 'bookings', icon: 'Calendar', label: 'Bookings', badgeCount: badgeCount },
                    { id: 'messages', icon: 'MessageSquare', label: 'Messages', badgeCount: unreadMessages },
                    { id: 'services', icon: 'Briefcase', label: 'Services' },
                    { id: 'schedule', icon: 'Clock', label: 'My Schedule' },
                    { id: 'earnings', icon: 'CreditCard', label: 'Earnings' },
                    { id: 'analytics', icon: 'BarChart3', label: 'Analytics' },
                    { id: 'settings', icon: 'Settings', label: 'Settings' },
                ]}
                footerItems={[
                    { id: 'view-profile', icon: 'User', label: 'View my profile', to: `/provider/${user?.id || 'me'}` },
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
                                                <h1>Hello, {user.name.split(' ')[0]}!</h1>
                                                <p className="header-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                            </div>
                                            <div className="header-actions">
                                                <ThemeToggle />
                                                <NotificationBell />
                                                <Button variant="primary" onClick={() => navigate(`/provider/${user.id}`)}>View Public Profile</Button>
                                            </div>
                                        </header>
                                        {/* KPI row */}
                                        <div className="stats-grid">
                                            {[
                                                { label: 'Total Revenue', value: `₹${totalEarnings.toLocaleString()}`, icon: '💰', color: 'hsl(142, 70%, 40%)' },
                                                { label: 'Upcoming', value: `₹${confirmedEarnings.toLocaleString()}`, icon: '📈', color: 'var(--primary)' },
                                                { label: 'Requests', value: pendingCount, icon: '⏳', color: 'hsl(38, 80%, 45%)' },
                                                { label: 'Confirmed', value: confirmedCount, icon: '✅', color: 'hsl(142, 70%, 40%)' },
                                            ].map((s, i) => (
                                                <Card key={s.label} variant="default" className="stat-card" style={{ '--stat-color': s.color }} animate delay={i * 0.1}>
                                                    <div className="stat-card__icon">{s.icon}</div>
                                                    <div className="stat-card__value">{s.value}</div>
                                                    <div className="stat-card__label">{s.label}</div>
                                                </Card>
                                            ))}
                                        </div>

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
                                                    ? <p className="empty-hint">No pending requests 🎉</p>
                                                    : bookings.filter(b => b.status === 'pending').map((b, i) => (
                                                        <BookingRow key={b.id} booking={b} index={i} onAccept={accept} onDecline={decline} onComplete={complete} />
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
                                                        <BookingRow key={b.id} booking={b} index={i} onAccept={accept} onDecline={decline} onComplete={complete} />
                                                    ))
                                                }
                                            </div>
                                        </div>

                                        {/* My Services Section */}
                                        <div className="dashboard__section">
                                            <div className="dashboard__section-header">
                                                <h2>My Services</h2>
                                                <button className="see-all-btn" onClick={() => setSection('services')}>Manage →</button>
                                            </div>
                                            <div className="services-overview-grid">
                                                {!fullProfile?.services || fullProfile.services.length === 0 ? (
                                                    <Card variant="default" padding="md" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                                                        <p className="empty-hint">No services added yet.</p>
                                                    </Card>
                                                ) : (
                                                    fullProfile.services.map((s, i) => (
                                                        <motion.div
                                                            key={s.id}
                                                            className="service-mini-card"
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: i * 0.05 }}
                                                        >
                                                            <div className="service-mini-icon">
                                                                <Icons.Zap size={18} color="var(--primary)" />
                                                            </div>
                                                            <div className="service-mini-info">
                                                                <div className="service-mini-name">{s.name}</div>
                                                                <div className="service-mini-meta">₹{s.price} · {s.duration} min</div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Bookings ── */}
                                {section === 'bookings' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>All Bookings</h1><p>Manage incoming and past appointments.</p></div>
                                            <div className="header-actions">
                                                <ThemeToggle />
                                                <NotificationBell />
                                            </div>
                                        </div>
                                        <div className="filter-bar">
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
                                        <div className="bookings-table">
                                            {filtered.length === 0
                                                ? <p className="empty-hint">No bookings here.</p>
                                                : filtered.map((b, i) => (
                                                    <BookingRow key={b.id} booking={b} index={i} onAccept={accept} onDecline={decline} onComplete={complete} />
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* ── Messages ── */}
                                {section === 'messages' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>Messages</h1><p>Chat with your clients.</p></div>
                                            <div className="header-actions">
                                                <ThemeToggle />
                                                <NotificationBell />
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
                                                <ThemeToggle />
                                                <NotificationBell />
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
                                                <ThemeToggle />
                                                <NotificationBell />
                                            </div>
                                        </div>
                                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                            {[
                                                { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: '💰' },
                                                { label: 'This Week', value: `₹${weeklyEarnings.toLocaleString()}`, icon: '📅' },
                                                { label: 'Pending Payout', value: `₹${pendingEarnings.toLocaleString()}`, icon: '⏳' },
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

                                {/* ── Analytics ── */}
                                {section === 'analytics' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <div className="dashboard__header">
                                            <div><h1>Analytics</h1><p>Insights about your practice performance.</p></div>
                                            <div className="header-actions">
                                                <ThemeToggle />
                                                <NotificationBell />
                                            </div>
                                        </div>
                                        <AnalyticsTab bookings={bookings} />
                                    </div>
                                )}

                                {/* ── Services ── */}
                                {section === 'services' && (
                                    <div className="dashboard__content animate-fade-in">
                                        <ServicesTab
                                            initialServices={fullProfile?.services || []}
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
            </main>
        </div>
    );
}
