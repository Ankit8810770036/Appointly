import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Card from '../../components/ui/Card/Card';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/providers';
import { appointmentApi } from '../../api/appointments';
import { favoriteApi } from '../../api/favorites';
import { reviewApi } from '../../api/reviews';
import { useSound } from '../../hooks/useSound';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import './ProviderProfile.css';

/* ─── Mock data ──────────────────────────────────── */
const MOCK_PROVIDER = {
    id: '1',
    name: 'Dr. Priya Mahesh',
    title: 'Senior Dermatologist & Skin Care Specialist',
    specialty: 'Health & Wellness',
    rating: 4.9,
    reviews: 218,
    experience: '12 years',
    location: 'Koramangala, Bengaluru',
    price: 800,
    currency: '₹',
    about: `Dr. Priya Mahesh is a board-certified dermatologist with over 12 years of clinical experience. She specialises in acne treatment, anti-aging, skin cancer screenings, and cosmetic procedures. She takes a holistic, patient-first approach with personalised care plans.`,
    services: [
        { name: 'General Skin Consultation', duration: 30, price: 800 },
        { name: 'Acne Treatment Session', duration: 45, price: 1200 },
        { name: 'Anti-Aging Facial', duration: 60, price: 2500 },
        { name: 'Mole & Lesion Check', duration: 20, price: 600 },
    ],
    tags: ['Acne', 'Anti-aging', 'Botox', 'Peeling', 'Skin Cancer'],
    avatar: '👩🏽‍⚕️',
    verified: true,
    languages: ['English', 'Hindi', 'Kannada'],
};


/* Time slots */
const ALL_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
];


/* ─── tiny helpers ─── */
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ─── Calendar ──────────────────────────────── */
function Calendar({ selectedDate, onSelect, schedule }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const days = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
        return cells;
    }, [viewYear, viewMonth]);

    // Map day index (0-6) to ["SUN", "MON", ...]
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const workingDays = schedule?.workingDays || ["MON", "TUE", "WED", "THU", "FRI"];
    const blockedDatesList = schedule?.blockedDates || [];

    return (
        <div className="calendar">
            <div className="calendar__nav">
                <button className="calendar__nav-btn" onClick={prevMonth} aria-label="Previous month">‹</button>
                <span className="calendar__title">{MONTHS[viewMonth]} {viewYear}</span>
                <button className="calendar__nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
            </div>

            <div className="calendar__grid">
                {DAYS.map(d => (
                    <div key={d} className="calendar__day-label">{d}</div>
                ))}
                {days.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} />;
                    const key = fmtDate(date);
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    const dayName = dayNames[date.getDay()];
                    const isWorkingDay = workingDays.includes(dayName);
                    const isBlocked = blockedDatesList.includes(key);

                    const isSelected = selectedDate === key;
                    const isToday = key === fmtDate(today);
                    const disabled = isPast || isBlocked || !isWorkingDay;

                    return (
                        <button
                            key={key}
                            className={[
                                'calendar__cell',
                                isToday ? 'calendar__cell--today' : '',
                                isSelected ? 'calendar__cell--selected' : '',
                                disabled ? 'calendar__cell--disabled' : '',
                                isBlocked ? 'calendar__cell--blocked' : '',
                            ].join(' ')}
                            onClick={() => !disabled && onSelect(key)}
                            disabled={disabled}
                            aria-label={`${date.getDate()} ${MONTHS[viewMonth]}`}
                            aria-pressed={isSelected}
                        >
                            {date.getDate()}
                            {(isBlocked || !isWorkingDay) && <span className="calendar__cell-dot" />}
                        </button>
                    );
                })}
            </div>

            <div className="calendar__legend">
                <span><span className="legend-dot legend-dot--today" />Today</span>
                <span><span className="legend-dot legend-dot--selected" />Selected</span>
                <span><span className="legend-dot legend-dot--blocked" />Unavailable</span>
            </div>
        </div>
    );
}

/* ─── Time Slots ─── */
function TimeSlots({ date, selected, onSelect, schedule, bookedSlots }) {
    if (!date) return <p className="slots-placeholder">← Pick a date to see available times</p>;

    // Logic for past-time disabling
    const now = new Date();
    const todayStr = fmtDate(now);
    // Add 30-minute buffer for same-day bookings
    const nowWithBuffer = new Date(now.getTime() + 30 * 60 * 1000);
    const bufferTimeStr = `${pad(nowWithBuffer.getHours())}:${pad(nowWithBuffer.getMinutes())}`;

    const booked = bookedSlots[date] || [];

    // Determine the day of the week (MON, TUE, etc.)
    const dayName = new Date(date + 'T00:00:00')
        .toLocaleDateString('en-US', { weekday: 'short' })
        .toUpperCase();

    const availableSlots = (schedule?.workSchedule && schedule.workSchedule[dayName])
        || schedule?.availableSlots
        || ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

    return (
        <div className="time-slots">
            {availableSlots.map(t => {
                const isBooked = booked.includes(t);
                const isSelected = selected === t;
                const isPast = date === todayStr && t < bufferTimeStr;

                return (
                    <button
                        key={t}
                        className={[
                            'time-slot',
                            isBooked ? 'time-slot--booked' : '',
                            isPast ? 'time-slot--past' : '',
                            isSelected ? 'time-slot--selected' : '',
                        ].join(' ')}
                        disabled={isBooked || isPast}
                        onClick={() => !(isBooked || isPast) && onSelect(t)}
                        aria-pressed={isSelected}
                    >
                        {t}
                    </button>
                );
            })}
            {availableSlots.length === 0 && <p className="empty-hint">No slots available for this date.</p>}
        </div>
    );
}

/* ─── Booking Modal ─── */
function BookingModal({ provider, service, date, time, onClose, onConfirm }) {
    const [note, setNote] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { play } = useSound();

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            await onConfirm({ note });
            play('success');
            setConfirmed(true);
        } catch (err) {
            play('error');
            setError(err.message || 'Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    if (confirmed) return (
        <div className="modal-overlay" role="dialog">
            <div className="modal modal--success animate-fade-in">
                <div className="modal-success-icon">🎉</div>
                <h2>Booking Confirmed!</h2>
                <p>Your appointment with <strong>{provider.name}</strong> is booked for</p>
                <div className="modal-booking-badge">
                    📅 {date} at {time}
                </div>
                <p className="modal-note">A confirmation will be sent to your email.</p>
                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>Close</Button>
                    <Button variant="primary" onClick={() => window.location.href = '/dashboard/client'} style={{ flex: 1 }}>Go to Dashboard</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal animate-fade-in">
                <div className="modal-header">
                    <h2>Confirm Booking</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className="modal-summary">
                    <div className="modal-summary-row">
                        <span>👨‍⚕️ Provider</span>
                        <strong>{provider.name}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>🩺 Service</span>
                        <strong>{service.name}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>📅 Date</span>
                        <strong>{date}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>⏰ Time</span>
                        <strong>{time}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>⏱ Duration</span>
                        <strong>{service.duration} min</strong>
                    </div>
                    <div className="modal-summary-row modal-summary-row--total">
                        <span>💰 Total</span>
                        <strong>{provider?.currency}{service?.price}</strong>
                    </div>
                </div>

                <div className="modal-field">
                    <label htmlFor="booking-note">Note for provider (optional)</label>
                    <textarea
                        id="booking-note"
                        rows={3}
                        className="modal-textarea"
                        placeholder="Any special requests or information…"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </div>

                {error && <div className="modal-error" style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>⚠️ {error}</div>}

                <div className="modal-actions">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" size="lg" onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Processing...' : 'Confirm & Book'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function ProviderProfile() {
    const { id } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    // Check if the current user is viewing their own profile
    const isOwnProfile = user && (id === user.id || id === 'me');
    const profileId = id === 'me' ? user?.id : id;

    const [provider, setProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showMsgModal, setShowMsgModal] = useState(false);
    const [activeTab, setActiveTab] = useState('about'); // about | reviews
    const [isFavorited, setIsFavorited] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [bookedSlots, setBookedSlots] = useState({});

    useEffect(() => {
        if (!profileId) return;
        setLoading(true);

        const loadData = async () => {
            try {
                const data = await providerApi.getById(profileId);
                let reviewsData = [];
                let slotsData = {};
                if (data.providerProfile?.id) {
                    reviewsData = await reviewApi.getProviderReviews(data.providerProfile.id);
                    slotsData = await appointmentApi.getProviderSlots(data.providerProfile.id);
                }

                setReviews(reviewsData);
                setBookedSlots(slotsData);

                setProvider({
                    ...data,
                    title: data.providerProfile?.specialty || 'Professional',
                    specialty: data.providerProfile?.specialty || '',
                    rating: data.providerProfile?.rating || 0,
                    reviewsCount: reviewsData.length,
                    experience: 'Not specified',
                    location: data.providerProfile?.location || 'Not specified',
                    phone: data.providerProfile?.phone || null,
                    price: data.providerProfile?.services?.[0]?.price || 0,
                    currency: '₹',
                    about: data.providerProfile?.about || 'No bio provided.',
                    services: data.providerProfile?.services || [],
                    tags: [],
                    avatar: '🧑‍⚕️',
                    verified: true,
                    languages: ['English'],
                });
                if (data.providerProfile?.services?.length > 0) {
                    setSelectedService(data.providerProfile.services[0]);
                }

                // Check if favorited
                if (token && user) {
                    const favorites = await favoriteApi.getMy(token);
                    const favorited = favorites.some(f => f.providerProfileId === data.providerProfile?.id);
                    setIsFavorited(favorited);
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [profileId, token, user?.role]);

    const handleToggleFavorite = async () => {
        if (!token || !user) {
            toast.error('Please log in to favorite providers.');
            return;
        }
        try {
            const res = await favoriteApi.toggle(provider.providerProfile?.id, token);
            setIsFavorited(res.favorited);
        } catch (err) {
            console.error(err);
        }
    };

    const canBook = selectedDate && selectedTime && selectedService;

    if (loading) return (
        <div className="provider-page animate-fade-in">
            <nav className="provider-nav">
                <Skeleton width="100px" height="1.8rem" className="provider-nav__logo" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <ThemeToggle />
                    <Skeleton width="120px" height="1rem" className="provider-nav__back" />
                </div>
            </nav>
            <div className="provider-layout">
                <div className="provider-info">
                    <Card variant="default" className="provider-hero-card">
                        <Skeleton variant="circle" width="88px" height="88px" className="provider-avatar" />
                        <div className="provider-hero-body">
                            <div className="provider-hero-top">
                                <div style={{ flex: 1 }}>
                                    <Skeleton variant="text" width="60%" height="2.2rem" style={{ marginBottom: '0.5rem' }} />
                                    <Skeleton variant="text" width="40%" height="1.2rem" />
                                </div>
                                <Skeleton variant="circle" width="38px" height="38px" />
                            </div>
                            <div className="provider-meta" style={{ marginTop: '1rem' }}>
                                {Array(5).fill(0).map((_, i) => (
                                    <Skeleton key={i} variant="text" width="80px" />
                                ))}
                            </div>
                            <div className="provider-tags" style={{ marginTop: '1rem' }}>
                                <Skeleton variant="rect" width="60px" height="24px" />
                                <Skeleton variant="rect" width="80px" height="24px" />
                                <Skeleton variant="rect" width="70px" height="24px" />
                            </div>
                        </div>
                    </Card>
                    <div className="provider-tabs" style={{ marginTop: '2rem' }}>
                        <div style={{ padding: '0.8rem 1.5rem', borderBottom: '2px solid transparent' }}>
                            <Skeleton width="60px" height="1.2rem" />
                        </div>
                        <div style={{ padding: '0.8rem 1.5rem', borderBottom: '2px solid transparent' }}>
                            <Skeleton width="60px" height="1.2rem" />
                        </div>
                    </div>
                    <Card variant="default" padding="md" style={{ marginTop: '1.5rem' }}>
                        <Skeleton variant="text" width="100px" height="1.2rem" style={{ marginBottom: '1.5rem' }} />
                        <Skeleton variant="text" width="100%" />
                        <Skeleton variant="text" width="100%" />
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="text" width="85%" />
                    </Card>
                </div>
                <div className="booking-panel">
                    <Card variant="elevated" className="booking-card">
                        <Skeleton variant="text" width="40%" height="2rem" style={{ marginBottom: '1rem' }} />
                        <Skeleton variant="rect" height="320px" style={{ borderRadius: '12px' }} />
                        <div style={{ marginTop: '2rem' }}>
                            <Skeleton variant="text" width="100px" height="1rem" style={{ marginBottom: '1rem' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {Array(8).fill(0).map((_, i) => (
                                    <Skeleton key={i} variant="rect" height="35px" />
                                ))}
                            </div>
                        </div>
                        <Skeleton variant="rect" height="48px" style={{ marginTop: '2rem', borderRadius: '8px' }} />
                    </Card>
                </div>
            </div>
        </div>
    );

    if (error) return <div className="provider-page" style={{ padding: '4rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    if (!provider) return <div className="provider-page" style={{ padding: '4rem', textAlign: 'center' }}>Provider not found.</div>;

    return (
        <div className="provider-page">
            <nav className="provider-nav">
                <Link to="/" className="provider-nav__logo">Appointly</Link>
                <div className="header-actions">
                    <ThemeToggle />
                    {isOwnProfile ? (
                        <Link to="/dashboard/provider" className="provider-nav__back">← Back to Dashboard</Link>
                    ) : (
                        <Link to="/" className="provider-nav__back">← Back to search</Link>
                    )}
                </div>
            </nav>

            <div className="provider-layout">
                <div className="provider-info">
                    <Card variant="default" className="provider-hero-card" animate>
                        <motion.div
                            className="provider-avatar"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            {provider.avatar}
                        </motion.div>
                        <div className="provider-hero-body">
                            <div className="provider-hero-top">
                                <div>
                                    <h1 className="provider-name">{provider.name}</h1>
                                    <p className="provider-title">{provider.title}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {user && (
                                        <button
                                            className={`favorite-btn ${isFavorited ? 'favorite-btn--active' : ''}`}
                                            onClick={handleToggleFavorite}
                                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            {isFavorited ? '❤️' : '🤍'}
                                        </button>
                                    )}
                                    {provider.verified && <Badge variant="success">✓ Verified</Badge>}
                                </div>
                            </div>

                            <div className="provider-meta">
                                <span className="provider-meta-item">⭐ {provider.rating} <span className="provider-meta-sub">({provider.reviewsCount} reviews)</span></span>
                                <span className="provider-meta-item">📍 {provider.location}</span>
                                {provider.phone && <span className="provider-meta-item">📞 {provider.phone}</span>}
                                <span className="provider-meta-item">🧑‍💼 {provider.experience} exp.</span>
                                <span className="provider-meta-item">💬 {provider.languages.join(', ')}</span>
                            </div>

                            <div className="provider-tags">
                                {provider.tags.map(t => <Badge key={t} variant="default">{t}</Badge>)}
                            </div>
                        </div>
                    </Card>

                    <div className="provider-tabs">
                        {['about', 'reviews'].map(tab => (
                            <button
                                key={tab}
                                className={`provider-tab ${activeTab === tab ? 'provider-tab--active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'about' && (
                        <>
                            <Card variant="default" padding="md">
                                <h3 className="provider-section-title">About</h3>
                                <p className="provider-about">{provider.about}</p>
                            </Card>

                            <Card variant="default" padding="md">
                                <h3 className="provider-section-title">Services & Pricing</h3>
                                {provider.services.length === 0 ? (
                                    <p className="provider-about">No services listed yet.</p>
                                ) : (
                                    <div className="services-list">
                                        {Object.entries(
                                            provider.services.reduce((acc, svc) => {
                                                const cat = svc.category || 'General';
                                                if (!acc[cat]) acc[cat] = [];
                                                acc[cat].push(svc);
                                                return acc;
                                            }, {})
                                        ).map(([category, svcs]) => (
                                            <div key={category} className="service-category-group">
                                                <h4 className="service-category-title">{category}</h4>
                                                <div className="service-category-items">
                                                    {svcs.map(svc => (
                                                        <div
                                                            key={svc.id || svc.name}
                                                            className={`service-item ${selectedService?.id === svc.id ? 'service-item--selected' : ''}`}
                                                            onClick={() => setSelectedService(svc)}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={e => e.key === 'Enter' && setSelectedService(svc)}
                                                        >
                                                            <div className="service-item__info">
                                                                <span className="service-item__name">{svc.name}</span>
                                                                <span className="service-item__duration">⏱ {svc.duration} min</span>
                                                            </div>
                                                            <span className="service-item__price">{provider.currency}{svc.price}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </>
                    )}

                    {activeTab === 'reviews' && (
                        <Card variant="default" padding="md" animate delay={0.3}>
                            <h3 className="provider-section-title">Client Reviews</h3>
                            {reviews.length === 0 ? (
                                <p className="review-text">No reviews yet. Be the first to leave one!</p>
                            ) : (
                                <div className="reviews-list">
                                    {reviews.map((r, idx) => (
                                        <motion.div
                                            key={r.id || idx}
                                            className="review-item"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                                        >
                                            <div className="review-header">
                                                <span className="review-name">{r.appointment?.client?.name || 'Anonymous'}</span>
                                                <div className="review-stars">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <span key={s} style={{ color: s <= r.rating ? '#ffb800' : '#ccc' }}>★</span>
                                                    ))}
                                                </div>
                                                <span className="review-date">
                                                    {new Date(r.appointment?.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {r.comment && <p className="review-text">{r.comment}</p>}
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                <motion.div
                    className="booking-panel"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, type: 'spring', damping: 20 }}
                >
                    <Card variant="elevated" className="booking-card">
                        {!selectedService ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                <h3>No Services Available</h3>
                                <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>This provider has not added any services yet.</p>
                            </div>
                        ) : (
                            <>
                                <div className="booking-card__header">
                                    <div>
                                        <span className="booking-price">{provider.currency}{selectedService.price}</span>
                                        <span className="booking-per"> / session</span>
                                    </div>
                                    <Badge variant="success">
                                        <Badge dot variant="success" />&nbsp; Available
                                    </Badge>
                                </div>

                                <div className="booking-selected-service">
                                    <span className="booking-label">Selected service</span>
                                    <span className="booking-service-name">{selectedService.name} · {selectedService.duration} min</span>
                                </div>

                                <div className="booking-section-title">Pick a date</div>
                                <Calendar selectedDate={selectedDate} onSelect={d => { setSelectedDate(d); setSelectedTime(''); }} schedule={provider.providerProfile} />

                                <div className="booking-section-title" style={{ marginTop: 'var(--space-4)' }}>
                                    Pick a time {selectedDate && <span className="booking-date-hint">for {selectedDate}</span>}
                                </div>
                                <TimeSlots
                                    date={selectedDate}
                                    selected={selectedTime}
                                    onSelect={setSelectedTime}
                                    schedule={provider.providerProfile}
                                    bookedSlots={bookedSlots}
                                />

                                {user?.role === 'PROVIDER' ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <Button variant="outline" className="booking-cta" disabled>
                                            Booking Restricted
                                        </Button>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                                            Registered providers cannot book services.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        <Button
                                            variant="primary"
                                            className="booking-cta"
                                            disabled={!canBook}
                                            onClick={() => setShowModal(true)}
                                        >
                                            Book Appointment
                                        </Button>
                                        {!isOwnProfile && (
                                            <Button
                                                variant="outline"
                                                className="message-cta"
                                                onClick={() => {
                                                    if (!token) {
                                                        toast.error('Please login to message the provider.');
                                                        return;
                                                    }
                                                    setShowMsgModal(true);
                                                }}
                                            >
                                                💬 Message Provider
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <p className="booking-note">No payment now · Free cancellation 24h before</p>
                            </>
                        )}
                    </Card>
                </motion.div>
            </div>

            {showModal && (
                <BookingModal
                    provider={provider}
                    service={selectedService}
                    date={selectedDate}
                    time={selectedTime}
                    onClose={() => setShowModal(false)}
                    onConfirm={async (data) => {
                        if (!token) {
                            toast.error('Please login to book an appointment.');
                            return;
                        }
                        const bookingDate = new Date(`${selectedDate}T${selectedTime}`);
                        await appointmentApi.create({
                            providerId: provider.providerProfile?.id,
                            serviceId: selectedService?.id,
                            date: bookingDate.toISOString(),
                            note: data.note
                        }, token);
                    }}
                />
            )}

            {showMsgModal && (
                <MessageModal
                    provider={provider}
                    onClose={() => setShowMsgModal(false)}
                />
            )}
        </div>
    );
}
