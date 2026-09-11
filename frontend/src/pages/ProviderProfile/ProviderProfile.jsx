import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from '../../utils/toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/providers';
import { appointmentApi } from '../../api/appointments';
import { favoriteApi } from '../../api/favorites';
import { reviewApi } from '../../api/reviews';
import { useSound } from '../../hooks/useSound';
import { addressApi } from '../../api/addresses';
import { detectCoordinatesAndAddress } from '../../utils/geolocation';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import MapViewer from '../../components/ui/Map/MapViewer';
import ReviewCard from '../../components/ui/ReviewCard/ReviewCard';
import { FileText, ArrowLeft, Video, Clock, DollarSign, Calendar as CalIcon, ChevronLeft, ChevronRight, MapPin, Phone, ExternalLink, Home, Briefcase, Navigation, Plus, Check, Compass, Sparkles } from 'lucide-react';
import './ProviderProfile.css';

const API_ROOT = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : (import.meta.env.PROD ? '' : 'http://localhost:5000');

/* ─── Helpers ─── */
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_MON_FIRST = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const format12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${pad(m)} ${period}`;
};

const formatSelectedDateFull = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = DAY_NAMES_FULL[dateObj.getDay()];
    const monthName = MONTHS[month - 1];
    const dayNum = dateObj.getDate();
    let suffix = 'th';
    if (dayNum === 1 || dayNum === 21 || dayNum === 31) suffix = 'st';
    else if (dayNum === 2 || dayNum === 22) suffix = 'nd';
    else if (dayNum === 3 || dayNum === 23) suffix = 'rd';

    return `${dayName}, ${dayNum}${suffix} ${monthName}`;
};

/* ─── Calendar Component (Mon-First layout matching image) ─── */
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
        const firstDayObj = new Date(viewYear, viewMonth, 1);
        let rawFirstDay = firstDayObj.getDay(); // 0 is Sun, 1 is Mon...
        // Mon-first offset: Mon=0, Tue=1, ..., Sun=6
        const emptyCellsCount = rawFirstDay === 0 ? 6 : rawFirstDay - 1;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        const cells = [];
        for (let i = 0; i < emptyCellsCount; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
        return cells;
    }, [viewYear, viewMonth]);

    const dayNamesEnum = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const workingDays = schedule?.workingDays || ["MON", "TUE", "WED", "THU", "FRI"];
    const blockedDatesList = schedule?.blockedDates || [];
    const hasWorkSchedule = schedule?.workSchedule && Object.keys(schedule.workSchedule).length > 0;

    return (
        <div className="cal-card-widget">
            <div className="cal-widget-header">
                <span className="cal-widget-month-title">{MONTHS[viewMonth]} {viewYear}</span>
                <div className="cal-nav-group">
                    <button className="cal-widget-nav-btn" onClick={prevMonth} aria-label="Previous month">
                        <ChevronLeft size={16} />
                    </button>
                    <button className="cal-widget-nav-btn" onClick={nextMonth} aria-label="Next month">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            <div className="cal-widget-grid">
                {DAYS_MON_FIRST.map(d => (
                    <div key={d} className="cal-widget-day-header">{d}</div>
                ))}
                {days.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="cal-widget-cell--empty" />;
                    const key = fmtDate(date);
                    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    const dayName = dayNamesEnum[date.getDay()];
                    const isWorkingDay = hasWorkSchedule
                        ? (Array.isArray(schedule.workSchedule[dayName]) && schedule.workSchedule[dayName].length > 0)
                        : workingDays.includes(dayName);
                    const isBlocked = blockedDatesList.includes(key);

                    const isSelected = selectedDate === key;
                    const isToday = key === fmtDate(today);
                    const disabled = isPast || isBlocked || !isWorkingDay;

                    return (
                        <button
                            key={key}
                            className={[
                                'cal-widget-cell',
                                isToday ? 'cal-widget-cell--today' : '',
                                isSelected ? 'cal-widget-cell--selected' : '',
                                disabled ? 'cal-widget-cell--disabled' : '',
                            ].join(' ')}
                            onClick={() => !disabled && onSelect(key)}
                            disabled={disabled}
                            aria-label={`${date.getDate()} ${MONTHS[viewMonth]}`}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="cal-legend-bar">
                <span className="cal-legend-item"><span className="legend-marker marker-avail"></span> Available</span>
                <span className="cal-legend-item"><span className="legend-marker marker-selected"></span> Selected</span>
                <span className="cal-legend-item"><span className="legend-marker marker-disabled"></span> Closed</span>
            </div>
        </div>
    );
}

/* ─── Time Slots Component ─── */
function TimeSlots({ date, selected, onSelect, schedule, bookedSlots }) {
    if (!date) {
        return (
            <div className="slots-empty-state">
                <div className="slots-empty-icon"><CalIcon size={22} /></div>
                <p className="slots-empty-title">Select a Date</p>
                <p className="slots-empty-desc">Pick an available day on the calendar to view morning & afternoon consultation slots.</p>
            </div>
        );
    }

    const now = new Date();
    const todayStr = fmtDate(now);
    const nowWithBuffer = new Date(now.getTime() + 30 * 60 * 1000);
    const bufferTimeStr = `${pad(nowWithBuffer.getHours())}:${pad(nowWithBuffer.getMinutes())}`;

    const booked = bookedSlots[date] || [];

    const [year, month, day] = date.split('-').map(Number);
    const dayName = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(year, month - 1, day).getDay()];

    const daySlots = schedule?.workSchedule?.[dayName];
    const rawAvailableSlots = Array.isArray(daySlots)
        ? daySlots
        : (Array.isArray(schedule?.availableSlots) && schedule.availableSlots.length > 0
            ? schedule.availableSlots
            : ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"]);

    const sortedAvailableSlots = [...rawAvailableSlots].sort((a, b) => a.localeCompare(b));

    return (
        <div className="slots-pill-grid">
            {sortedAvailableSlots.map(t => {
                const isBooked = booked.includes(t);
                const isSelected = selected === t;
                const isPast = date === todayStr && t < bufferTimeStr;
                const disabled = isBooked || isPast;

                return (
                    <button
                        key={t}
                        className={[
                            'slot-pill-btn',
                            isSelected ? 'slot-pill-btn--selected' : '',
                            disabled ? 'slot-pill-btn--disabled' : ''
                        ].join(' ')}
                        disabled={disabled}
                        onClick={() => !disabled && onSelect(t)}
                    >
                        {format12Hour(t)}
                    </button>
                );
            })}
            {rawAvailableSlots.length === 0 && (
                <div className="slots-empty-state">
                    <p className="slots-empty-title">No Slots Available</p>
                    <p className="slots-empty-desc">No hours are configured for this date. Please try another day.</p>
                </div>
            )}
        </div>
    );
}

/* ─── Booking Modal with Blinkit-Style Address Selection ─── */
function BookingModal({ provider, service, date, time, onClose, onConfirm }) {
    const { user, token } = useAuth();
    const [note, setNote] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { play } = useSound();

    // Address Management State
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [gpsAddress, setGpsAddress] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
        saveAddress: true
    });

    // Load saved addresses
    useEffect(() => {
        if (!token) return;
        addressApi.getAll(token).then(data => {
            setAddresses(data || []);
            if (data && data.length > 0) {
                const defaultAddr = data.find(a => a.isDefault) || data[0];
                setSelectedAddressId(defaultAddr.id);
            } else if (user?.streetAddress || user?.city) {
                // Fallback to user's registered profile address
                const userProfileAddr = {
                    id: 'user_profile_addr',
                    label: 'Profile Address',
                    streetAddress: user.streetAddress || user.location || 'Registered Address',
                    city: user.city || 'My City',
                    state: user.state || '',
                    zipCode: user.zipCode || '',
                    country: user.country || 'India',
                    latitude: user.latitude || null,
                    longitude: user.longitude || null,
                    isDefault: true
                };
                setAddresses([userProfileAddr]);
                setSelectedAddressId('user_profile_addr');
            } else {
                // Prompt new address form if no address exists
                setShowNewForm(true);
                setSelectedAddressId('new_address');
            }
        }).catch(err => {
            console.error('Failed to load saved addresses:', err);
        });
    }, [token, user]);

    // Handle 1-Click GPS Location Detection
    const handleUseGpsLocation = async () => {
        setGpsLoading(true);
        setError(null);
        try {
            const loc = await detectCoordinatesAndAddress();
            const detected = {
                id: 'current_gps',
                label: 'Current GPS Location',
                streetAddress: loc.streetAddress || loc.name || 'Current Location',
                city: loc.city || 'Nearby City',
                state: loc.state || '',
                zipCode: loc.zipCode || '',
                country: loc.country || 'India',
                latitude: loc.lat,
                longitude: loc.lng,
                source: loc.source || 'gps'
            };
            setGpsAddress(detected);
            setSelectedAddressId('current_gps');
            setShowNewForm(false);
            toast.success(`📍 Location detected: ${detected.streetAddress}, ${detected.city}`);
        } catch (gpsErr) {
            console.error('GPS Detection error:', gpsErr);
            toast.error(gpsErr.message || 'Could not detect your GPS location.');
        } finally {
            setGpsLoading(false);
        }
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);

        // Address resolution payload
        let addressPayload = {};
        if (selectedAddressId === 'current_gps' && gpsAddress) {
            addressPayload = {
                streetAddress: gpsAddress.streetAddress,
                city: gpsAddress.city,
                state: gpsAddress.state,
                zipCode: gpsAddress.zipCode,
                country: gpsAddress.country,
                latitude: gpsAddress.latitude,
                longitude: gpsAddress.longitude,
                saveAddress: false,
                addressLabel: 'Current Location'
            };
        } else if (selectedAddressId === 'new_address') {
            if (!newAddress.streetAddress.trim() || !newAddress.city.trim()) {
                setLoading(false);
                setError('Please enter your street address and city.');
                return;
            }
            addressPayload = {
                streetAddress: newAddress.streetAddress.trim(),
                city: newAddress.city.trim(),
                state: newAddress.state.trim(),
                zipCode: newAddress.zipCode.trim(),
                country: 'India',
                saveAddress: newAddress.saveAddress,
                addressLabel: newAddress.label
            };
        } else if (selectedAddressId === 'user_profile_addr') {
            addressPayload = {
                streetAddress: user.streetAddress || user.location || 'Registered Address',
                city: user.city || 'City',
                state: user.state || '',
                zipCode: user.zipCode || '',
                country: user.country || 'India',
                latitude: user.latitude,
                longitude: user.longitude,
                saveAddress: true,
                addressLabel: 'Home'
            };
        } else {
            const chosen = addresses.find(a => a.id === selectedAddressId);
            if (!chosen) {
                setLoading(false);
                setError('Please select or add a service address to proceed.');
                return;
            }
            addressPayload = {
                addressId: chosen.id,
                streetAddress: chosen.streetAddress,
                city: chosen.city,
                state: chosen.state,
                zipCode: chosen.zipCode,
                latitude: chosen.latitude,
                longitude: chosen.longitude
            };
        }

        try {
            await onConfirm({
                note,
                ...addressPayload
            });
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
        <div className="modal-overlay" role="dialog" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal modal--success animate-fade-in">
                <div className="modal-success-icon">🎉</div>
                <h2 className="modal-title">Booking Confirmed!</h2>
                <p className="modal-subtitle">Your appointment with <strong>{provider.name}</strong> has been successfully scheduled.</p>
                <div className="modal-booking-badge">
                    <CalIcon size={18} /> {formatSelectedDateFull(date)} at {format12Hour(time)}
                </div>
                <p className="modal-note">A confirmation notification and email have been dispatched to your account.</p>
                <div className="modal-actions" style={{ marginTop: '1.5rem', width: '100%' }}>
                    <Button variant="outline" onClick={onClose} style={{ flex: 1 }}>Close</Button>
                    <Button variant="primary" onClick={() => window.location.href = '/dashboard/client'} style={{ flex: 1 }}>Go to Dashboard →</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal animate-fade-in" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Confirm Appointment</h2>
                        <p className="modal-subtitle">Review consultation details & select service address</p>
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className="modal-booking-highlight">
                    <div className="highlight-item">
                        <span className="highlight-label">SCHEDULED DATE & TIME</span>
                        <span className="highlight-val">{formatSelectedDateFull(date)} • {format12Hour(time)}</span>
                    </div>
                </div>

                {/* Consultation Summary */}
                <div className="modal-summary">
                    <div className="modal-summary-row">
                        <span>👨‍⚕️ Provider</span>
                        <strong>{provider.name}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>🩺 Service</span>
                        <strong>{service?.name || 'Consultation'}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>⏱ Duration</span>
                        <strong>{service?.duration || 30} mins session</strong>
                    </div>
                    <div className="modal-summary-row modal-summary-row--total">
                        <span>💰 Total Fees</span>
                        <strong className="total-fee-val">{provider?.currency}{service?.price || provider?.price}</strong>
                    </div>
                </div>

                {/* ── Blinkit-Style Address Selection Section ── */}
                <div className="modal-address-section">
                    <div className="modal-address-header">
                        <div className="modal-address-title-group">
                            <MapPin size={16} className="modal-address-icon" />
                            <span>Select Service Address</span>
                        </div>

                        <button
                            type="button"
                            className="blinkit-gps-btn"
                            onClick={handleUseGpsLocation}
                            disabled={gpsLoading}
                            title="Detect your current location via GPS"
                        >
                            <span className="blinkit-gps-pulse-dot" />
                            <Compass size={14} />
                            <span>{gpsLoading ? 'Locating...' : 'Use My Current Location'}</span>
                        </button>
                    </div>

                    {/* Saved & Detected Addresses Cards List */}
                    <div className="blinkit-address-list">
                        {/* Detected GPS Card if active */}
                        {gpsAddress && (
                            <div
                                className={`blinkit-address-card ${selectedAddressId === 'current_gps' ? 'blinkit-address-card--selected' : ''}`}
                                onClick={() => {
                                    setSelectedAddressId('current_gps');
                                    setShowNewForm(false);
                                }}
                            >
                                <div className="blinkit-card-left">
                                    <span className="blinkit-tag-badge blinkit-tag-badge--gps">
                                        <Navigation size={12} /> Current GPS
                                    </span>
                                    <div className="blinkit-card-info">
                                        <div className="blinkit-card-street">{gpsAddress.streetAddress}</div>
                                        <div className="blinkit-card-city">{[gpsAddress.city, gpsAddress.state, gpsAddress.zipCode].filter(Boolean).join(', ')}</div>
                                    </div>
                                </div>
                                <div className="blinkit-card-radio">
                                    {selectedAddressId === 'current_gps' && <div className="blinkit-card-radio-inner" />}
                                </div>
                            </div>
                        )}

                        {/* User Saved Addresses */}
                        {addresses.map(addr => {
                            const isSelected = selectedAddressId === addr.id;
                            const labelLower = (addr.label || 'home').toLowerCase();
                            return (
                                <div
                                    key={addr.id}
                                    className={`blinkit-address-card ${isSelected ? 'blinkit-address-card--selected' : ''}`}
                                    onClick={() => {
                                        setSelectedAddressId(addr.id);
                                        setShowNewForm(false);
                                    }}
                                >
                                    <div className="blinkit-card-left">
                                        <span className={`blinkit-tag-badge blinkit-tag-badge--${labelLower === 'work' ? 'work' : labelLower === 'home' ? 'home' : 'other'}`}>
                                            {labelLower === 'home' && <Home size={12} />}
                                            {labelLower === 'work' && <Briefcase size={12} />}
                                            {labelLower !== 'home' && labelLower !== 'work' && <MapPin size={12} />}
                                            {addr.label}
                                        </span>
                                        {addr.isDefault && <span className="blinkit-default-pill">DEFAULT</span>}
                                        <div className="blinkit-card-info">
                                            <div className="blinkit-card-street">{addr.streetAddress}</div>
                                            <div className="blinkit-card-city">{[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}</div>
                                        </div>
                                    </div>
                                    <div className="blinkit-card-radio">
                                        {isSelected && <div className="blinkit-card-radio-inner" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Toggle Add New Address Form */}
                    {!showNewForm ? (
                        <button
                            type="button"
                            className="blinkit-add-toggle-btn"
                            onClick={() => {
                                setShowNewForm(true);
                                setSelectedAddressId('new_address');
                            }}
                        >
                            <Plus size={14} /> + Add Another / New Address
                        </button>
                    ) : (
                        <div className="blinkit-new-address-card animate-fade-in">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--amber)' }}>ENTER NEW ADDRESS</span>
                                {addresses.length > 0 && (
                                    <button
                                        type="button"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}
                                        onClick={() => {
                                            setShowNewForm(false);
                                            if (addresses.length > 0) setSelectedAddressId(addresses[0].id);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {/* Label Picker */}
                            <div className="blinkit-label-picker">
                                {['Home', 'Work', 'Other'].map(lbl => (
                                    <button
                                        key={lbl}
                                        type="button"
                                        className={`blinkit-label-btn ${newAddress.label === lbl ? 'blinkit-label-btn--active' : ''}`}
                                        onClick={() => setNewAddress({ ...newAddress, label: lbl })}
                                    >
                                        {lbl === 'Home' && '🏠 '}
                                        {lbl === 'Work' && '💼 '}
                                        {lbl === 'Other' && '📍 '}
                                        {lbl}
                                    </button>
                                ))}
                            </div>

                            {/* Address Inputs */}
                            <input
                                className="blinkit-input"
                                placeholder="House / Flat / Block / Street Address *"
                                value={newAddress.streetAddress}
                                onChange={e => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                                required
                            />

                            <div className="blinkit-input-row">
                                <input
                                    className="blinkit-input"
                                    placeholder="City *"
                                    value={newAddress.city}
                                    onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                                    required
                                />
                                <input
                                    className="blinkit-input"
                                    placeholder="State / Pincode"
                                    value={newAddress.state}
                                    onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                                />
                            </div>

                            <label className="blinkit-save-checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={newAddress.saveAddress}
                                    onChange={e => setNewAddress({ ...newAddress, saveAddress: e.target.checked })}
                                />
                                <span>Save this address for future bookings</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Optional Note field */}
                <div className="modal-field">
                    <label htmlFor="booking-note">📝 Note for provider (optional)</label>
                    <textarea
                        id="booking-note"
                        rows={2}
                        className="modal-textarea"
                        placeholder="Share any health details, symptoms, or specific requests…"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </div>

                {error && <div className="modal-error">⚠️ {error}</div>}

                <div className="modal-actions">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" size="lg" onClick={handleConfirm} disabled={loading} style={{ minWidth: '165px' }}>
                        {loading ? 'Processing...' : 'Confirm & Book →'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Provider Profile Page ─── */
export default function ProviderProfile() {
    const { id } = useParams();
    const { user, token } = useAuth();
    const navigate = useNavigate();

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
    const [activeTab, setActiveTab] = useState('about'); // about | services | reviews
    const [isFavorited, setIsFavorited] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [bookedSlots, setBookedSlots] = useState({});
    const timeSlotsRef = useRef(null);

    const handleDateSelect = (dateStr) => {
        setSelectedDate(dateStr);
        setSelectedTime('');
        toast.success(`Date selected: ${formatSelectedDateFull(dateStr)}. Please select a time slot below.`);
        setTimeout(() => {
            if (timeSlotsRef.current) {
                timeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    };

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

                const firstService = data.providerProfile?.services?.[0] || {
                    id: 'default-1',
                    name: 'General Consultation',
                    duration: 30,
                    price: 150,
                };

                const fullAddress = [
                    data.streetAddress,
                    data.city,
                    data.state,
                    data.zipCode,
                    data.country
                ].filter(Boolean).join(', ') || data.location || data.providerProfile?.location || 'Location details available upon booking';

                const phoneNum = data.phone || data.providerProfile?.phone || null;

                setProvider({
                    ...data,
                    name: data.name || 'Dr. Steven John',
                    title: data.providerProfile?.specialty || 'Medical Specialist',
                    specialty: data.providerProfile?.specialty || 'General Practice',
                    rating: data.providerProfile?.rating || 4.9,
                    reviewsCount: reviewsData.length || 120,
                    experience: '10+ years',
                    location: fullAddress,
                    phone: phoneNum,
                    price: firstService.price,
                    currency: '₹',
                    about: data.providerProfile?.about || 'Board-certified healthcare specialist dedicated to providing holistic, patient-centered clinical care.',
                    services: data.providerProfile?.services?.length > 0 ? data.providerProfile.services : [firstService],
                    avatar: '👨‍⚕️',
                    verified: data.providerProfile?.isVerified || true,
                });
                setSelectedService(firstService);

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
    }, [profileId, token, user]);

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

    const isProvider = user?.role?.toLowerCase() === 'provider';
    const canBook = !isProvider && selectedDate && selectedTime && selectedService;

    if (loading) return (
        <div className="provider-page animate-fade-in" style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div className="split-booking-container" style={{ width: '100%', maxWidth: '1080px' }}>
                <div className="split-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', padding: '2rem', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '20px' }}>
                    {/* Left Pane Skeleton */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Skeleton variant="circle" width="70px" height="70px" />
                            <div style={{ flex: 1 }}>
                                <Skeleton variant="text" width="65%" height="22px" style={{ marginBottom: '8px' }} />
                                <Skeleton variant="text" width="40%" height="15px" />
                            </div>
                        </div>
                        <Skeleton variant="rect" width="130px" height="28px" style={{ borderRadius: '20px', marginTop: '4px' }} />
                        <Skeleton variant="text" width="100%" height="14px" style={{ marginTop: '12px' }} />
                        <Skeleton variant="text" width="90%" height="14px" />
                        <Skeleton variant="text" width="75%" height="14px" />
                        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
                            <Skeleton variant="rect" width="100%" height="70px" style={{ borderRadius: '12px' }} />
                        </div>
                    </div>

                    {/* Right Pane Skeleton */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Skeleton variant="text" width="160px" height="20px" />
                            <Skeleton variant="rect" width="80px" height="32px" style={{ borderRadius: '8px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} variant="rect" height="60px" style={{ borderRadius: '10px' }} />
                            ))}
                        </div>
                        <Skeleton variant="text" width="120px" height="18px" style={{ marginTop: '10px' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} variant="rect" height="38px" style={{ borderRadius: '8px' }} />
                            ))}
                        </div>
                        <Skeleton variant="rect" width="100%" height="48px" style={{ borderRadius: '10px', marginTop: '12px' }} />
                    </div>
                </div>
            </div>
        </div>
    );

    if (error) return <div className="provider-page" style={{ padding: '4rem', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    if (!provider) return <div className="provider-page" style={{ padding: '4rem', textAlign: 'center' }}>Provider not found.</div>;

    return (
        <div className="provider-page">
            {/* Split Booking Card Container - Compact 1-Page Layout */}
            <div className="split-booking-container">
                <motion.div
                    className="split-card"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Left Pane: Provider Summary */}
                    <div className="split-left-pane">
                        <div className="pane-top-actions">
                            <button
                                className="back-circle-btn"
                                onClick={() => navigate(-1)}
                                aria-label="Go Back"
                            >
                                <ArrowLeft size={16} />
                                <span>Back</span>
                            </button>

                            <div className="pane-top-right">
                                {provider.verified && (
                                    <span className="profile-verified-badge">✓ Verified</span>
                                )}
                                {user && !isOwnProfile && (
                                    <>
                                        <button
                                            className="pane-chat-btn"
                                            onClick={handleToggleFavorite}
                                            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                        >
                                            {isFavorited ? '❤️ Saved' : '🤍 Save'}
                                        </button>
                                        <button
                                            className="pane-chat-btn"
                                            onClick={() => setShowMsgModal(true)}
                                            aria-label="Chat with provider"
                                        >
                                            💬 Chat
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="profile-compact-header">
                            <div className="avatar-blue-ring">
                                <span className="avatar-emoji-icon">{provider.avatar}</span>
                            </div>
                            <div className="summary-info-group">
                                <h2 className="summary-name">{provider.name}</h2>
                                <p className="summary-title">{provider.title}</p>
                                {provider.rating && (
                                    <div className="summary-rating-row">
                                        <span className="star-gold">★</span>
                                        <span className="rating-score">{provider.rating}</span>
                                        <span className="rating-count">({provider.reviewsCount} reviews)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="summary-quick-strip">
                            <div className="summary-quick-chip">
                                <Clock size={13} className="detail-icon" />
                                <span>{selectedService?.duration || 30} mins session</span>
                            </div>
                            <div className="summary-quick-chip">
                                <Video size={13} className="detail-icon" />
                                <span>Video consultation</span>
                            </div>
                            <div className="summary-quick-chip">
                                <DollarSign size={13} className="detail-icon" />
                                <span>Fee: {provider.currency}{selectedService?.price || provider.price}</span>
                            </div>
                        </div>

                        {/* Expandable Tabs Section */}
                        <div className="pane-tabs-nav">
                            {['about', 'services', 'reviews'].map(tab => (
                                <button
                                    key={tab}
                                    className={`pane-tab-btn ${activeTab === tab ? 'pane-tab-btn--active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="pane-tab-content">
                            {activeTab === 'about' && (
                                <div className="pane-about-container">
                                    <p className="pane-about-text">{provider.about}</p>

                                    <div className="pane-contact-info">
                                        <div className="pane-contact-item">
                                            <MapPin size={15} className="contact-icon" />
                                            <div>
                                                <span className="contact-label">Address</span>
                                                <strong className="contact-val">{provider.location}</strong>
                                            </div>
                                        </div>

                                        <div className="pane-contact-item">
                                            <Phone size={15} className="contact-icon" />
                                            <div>
                                                <span className="contact-label">Phone Number</span>
                                                <strong className="contact-val">{provider.phone || 'Contact available upon booking'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'services' && (
                                <div className="pane-services-list">
                                    {provider.services.map(svc => (
                                        <div
                                            key={svc.id || svc.name}
                                            className={`pane-service-chip ${selectedService?.id === svc.id ? 'pane-service-chip--selected' : ''}`}
                                            onClick={() => setSelectedService(svc)}
                                        >
                                            <span>{svc.name}</span>
                                            <strong>{provider.currency}{svc.price}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'reviews' && (
                                <div className="pane-reviews-list">
                                    {reviews.length === 0 ? (
                                        <ReviewCard review={null} />
                                    ) : (
                                        reviews.map((r, i) => (
                                            <ReviewCard key={r.id || i} review={r} />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="split-divider" />

                    {/* Right Pane: Date & Time Picker */}
                    <div className="split-right-pane">
                        <div className="picker-header-row">
                            <div>
                                <h3 className="picker-main-title">Select Date & Time</h3>
                                <p className="picker-sub-title">Choose your preferred consultation slot</p>
                            </div>
                            {selectedDate && selectedTime && (
                                <span className="picker-chosen-pill">
                                    <CalIcon size={12} /> {format12Hour(selectedTime)}
                                </span>
                            )}
                        </div>

                        <div className="picker-body-columns">
                            {/* Column 1: Spacious Interactive Calendar */}
                            <div className="picker-calendar-col">
                                <Calendar
                                    selectedDate={selectedDate}
                                    onSelect={handleDateSelect}
                                    schedule={provider.providerProfile}
                                />
                            </div>

                            {/* Column 2: Time Slots & Booking Action */}
                            <div ref={timeSlotsRef} className="picker-slots-col">
                                <div className="slots-header-bar">
                                    <span className="slots-date-label">
                                        <Clock size={13} className="detail-icon" />
                                        {selectedDate ? formatSelectedDateFull(selectedDate) : 'Time Slots'}
                                    </span>
                                    {selectedDate && (
                                        <span className="slots-count-chip">Available</span>
                                    )}
                                </div>

                                <div className="slots-list-wrapper">
                                    <TimeSlots
                                        date={selectedDate}
                                        selected={selectedTime}
                                        onSelect={setSelectedTime}
                                        schedule={provider.providerProfile}
                                        bookedSlots={bookedSlots}
                                    />
                                </div>

                                {/* In-Pane Booking Action Button */}
                                <div className="pane-booking-action">
                                    {isProvider ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#f87171',
                                                fontSize: '0.82rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                                                <span><strong>Provider Account:</strong> Booking appointments is restricted for providers. Only client accounts can book services.</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="split-next-btn"
                                                disabled
                                                style={{ opacity: 0.6, cursor: 'not-allowed', width: '100%' }}
                                            >
                                                Booking Restricted for Providers
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="split-next-btn"
                                            disabled={!canBook}
                                            onClick={() => {
                                                if (!token) {
                                                    toast.error('Please login to book an appointment.');
                                                    navigate('/login');
                                                    return;
                                                }
                                                setShowModal(true);
                                            }}
                                        >
                                            {selectedDate && selectedTime ? `Confirm Booking (${format12Hour(selectedTime)}) →` : 'Select Date & Time to Book'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Modal */}
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
                        const bookingDate = new Date(`${selectedDate}T${selectedTime}:00Z`);
                        await appointmentApi.create({
                            providerId: provider.providerProfile?.id,
                            serviceId: selectedService?.id,
                            date: bookingDate.toISOString(),
                            note: data.note,
                            addressId: data.addressId,
                            streetAddress: data.streetAddress,
                            city: data.city,
                            state: data.state,
                            zipCode: data.zipCode,
                            country: data.country,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            saveAddress: data.saveAddress,
                            addressLabel: data.addressLabel
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
