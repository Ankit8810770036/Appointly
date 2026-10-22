import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from '../../utils/toast';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { providerApi } from '../../api/providers';
import { appointmentApi } from '../../api/appointments';
import { favoriteApi } from '../../api/favorites';
import { reviewApi } from '../../api/reviews';
import { useSound } from '../../hooks/useSound';
import { addressApi } from '../../api/addresses';
import { detectCoordinatesAndAddress, calculateDistanceKm, geocodeAddress } from '../../utils/geolocation';
import MessageModal from '../../components/modals/MessageModal/MessageModal';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import MapViewer from '../../components/ui/Map/MapViewer';
import ReviewCard from '../../components/ui/ReviewCard/ReviewCard';
import CalendarExportDropdown from '../../components/ui/CalendarExport/CalendarExportDropdown';
import { getProviderAvatar } from '../../utils/avatars';
import { FileText, ArrowLeft, Video, Clock, DollarSign, Calendar as CalIcon, ChevronLeft, ChevronRight, MapPin, Phone, ExternalLink, Home, Briefcase, Navigation, Plus, Check, Compass, Sparkles, AlertTriangle, CheckCircle, Heart, MessageSquare, Star, Lock, Eye, Info } from 'lucide-react';

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

const getInitials = (name) => {
    if (!name) return 'SP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'SP';
};

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
    const workingDays = Array.isArray(schedule?.workingDays) ? schedule.workingDays : ["MON", "TUE", "WED", "THU", "FRI"];
    const blockedDatesList = Array.isArray(schedule?.blockedDates) ? schedule.blockedDates : [];
    const hasWorkSchedule = schedule?.workSchedule && typeof schedule.workSchedule === 'object' && Object.keys(schedule.workSchedule).length > 0;

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
function TimeSlots({ date, selected, onSelect, schedule, bookedSlots, heldSlots = {} }) {
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
                const isHeldByOther = heldSlots[t]?.isHeld && !heldSlots[t]?.heldByMe;
                const isSelected = selected === t;
                const isPast = date === todayStr && t < bufferTimeStr;
                const disabled = isBooked || isHeldByOther || isPast;

                return (
                    <button
                        key={t}
                        className={[
                            'slot-pill-btn',
                            isSelected ? 'slot-pill-btn--selected' : '',
                            isHeldByOther ? 'slot-pill-btn--held' : '',
                            disabled ? 'slot-pill-btn--disabled' : ''
                        ].join(' ')}
                        disabled={disabled}
                        onClick={() => !disabled && onSelect(t)}
                        title={isHeldByOther ? 'Temporarily locked by another client' : isBooked ? 'Already booked' : 'Available'}
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

/* ─── Booking Modal with Blinkit-Style Address Selection & 50km Range Check ─── */
function BookingModal({ provider, service, date, time, holdExpiresAt, onClose, onConfirm, onReleaseHold }) {
    const { user, token } = useAuth();
    const [note, setNote] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { play } = useSound();

    // 5-Minute Slot Hold Countdown
    const [timeLeft, setTimeLeft] = useState(() => {
        if (!holdExpiresAt) return 300;
        return Math.max(0, Math.ceil((holdExpiresAt - Date.now()) / 1000));
    });

    useEffect(() => {
        if (confirmed) return;
        const interval = setInterval(() => {
            if (holdExpiresAt) {
                const remaining = Math.max(0, Math.ceil((holdExpiresAt - Date.now()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    clearInterval(interval);
                }
            } else {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [holdExpiresAt, confirmed]);

    const formatCountdown = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const isExpiringSoon = timeLeft > 0 && timeLeft <= 60;
    const isExpired = timeLeft <= 0;

    const handleModalClose = () => {
        if (!confirmed && onReleaseHold) {
            onReleaseHold();
        }
        onClose();
    };

    // Provider Coordinates
    const provLat = provider?.latitude ?? provider?.providerProfile?.latitude ?? provider?.user?.latitude;
    const provLng = provider?.longitude ?? provider?.providerProfile?.longitude ?? provider?.user?.longitude;

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
        latitude: null,
        longitude: null,
        saveAddress: true
    });

    // Load saved addresses and geocode if needed
    useEffect(() => {
        if (!token) return;
        addressApi.getAll(token).then(async (data) => {
            let list = data || [];
            if (list.length === 0 && (user?.streetAddress || user?.city)) {
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
                list = [userProfileAddr];
            }

            // Geocode any addresses missing coordinates so distance displays immediately
            const resolvedList = await Promise.all(list.map(async (addr) => {
                if (addr.latitude && addr.longitude) return addr;
                const coords = await geocodeAddress(addr.streetAddress, addr.city, addr.state);
                if (coords) {
                    return { ...addr, latitude: coords.lat, longitude: coords.lng };
                }
                return addr;
            }));

            setAddresses(resolvedList);
            if (resolvedList && resolvedList.length > 0) {
                const defaultAddr = resolvedList.find(a => a.isDefault) || resolvedList[0];
                setSelectedAddressId(defaultAddr.id);
            } else {
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
            toast.success(`Location detected: ${detected.streetAddress}, ${detected.city}`);
        } catch (gpsErr) {
            console.error('GPS Detection error:', gpsErr);
            toast.error(gpsErr.message || 'Could not detect your GPS location.');
        } finally {
            setGpsLoading(false);
        }
    };

    // Calculate distance of currently selected address
    const selectedAddressObj = useMemo(() => {
        if (selectedAddressId === 'current_gps') return gpsAddress;
        if (selectedAddressId === 'new_address') return newAddress;
        return addresses.find(a => a.id === selectedAddressId);
    }, [selectedAddressId, gpsAddress, addresses, newAddress]);

    const selectedDistanceKm = useMemo(() => {
        if (!provLat || !provLng || !selectedAddressObj) return null;
        if (selectedAddressObj.latitude && selectedAddressObj.longitude) {
            return calculateDistanceKm(provLat, provLng, selectedAddressObj.latitude, selectedAddressObj.longitude);
        }
        return null;
    }, [provLat, provLng, selectedAddressObj]);

    const isOutOf50kmRange = selectedDistanceKm !== null && selectedDistanceKm > 50;

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);

        // Address resolution payload
        let addressPayload = {};
        let chosenLat = null;
        let chosenLng = null;

        if (selectedAddressId === 'current_gps' && gpsAddress) {
            chosenLat = gpsAddress.latitude;
            chosenLng = gpsAddress.longitude;
            addressPayload = {
                streetAddress: gpsAddress.streetAddress,
                city: gpsAddress.city,
                state: gpsAddress.state,
                zipCode: gpsAddress.zipCode,
                country: gpsAddress.country,
                latitude: chosenLat,
                longitude: chosenLng,
                saveAddress: false,
                addressLabel: 'Current Location'
            };
        } else if (selectedAddressId === 'new_address') {
            if (!newAddress.streetAddress.trim() || !newAddress.city.trim()) {
                setLoading(false);
                setError('Please enter your street address and city.');
                return;
            }

            // Geocode new address if lat/lng not set
            chosenLat = newAddress.latitude;
            chosenLng = newAddress.longitude;
            if (!chosenLat || !chosenLng) {
                const coords = await geocodeAddress(newAddress.streetAddress, newAddress.city, newAddress.state);
                if (coords) {
                    chosenLat = coords.lat;
                    chosenLng = coords.lng;
                }
            }

            addressPayload = {
                streetAddress: newAddress.streetAddress.trim(),
                city: newAddress.city.trim(),
                state: newAddress.state.trim(),
                zipCode: newAddress.zipCode.trim(),
                country: 'India',
                latitude: chosenLat,
                longitude: chosenLng,
                saveAddress: newAddress.saveAddress,
                addressLabel: newAddress.label
            };
        } else if (selectedAddressId === 'user_profile_addr') {
            const profileAddr = addresses.find(a => a.id === 'user_profile_addr');
            chosenLat = profileAddr?.latitude || user.latitude;
            chosenLng = profileAddr?.longitude || user.longitude;

            if (!chosenLat || !chosenLng) {
                const coords = await geocodeAddress(user.streetAddress || user.location, user.city, user.state);
                if (coords) {
                    chosenLat = coords.lat;
                    chosenLng = coords.lng;
                }
            }

            addressPayload = {
                streetAddress: user.streetAddress || user.location || 'Registered Address',
                city: user.city || 'City',
                state: user.state || '',
                zipCode: user.zipCode || '',
                country: user.country || 'India',
                latitude: chosenLat,
                longitude: chosenLng,
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
            chosenLat = chosen.latitude;
            chosenLng = chosen.longitude;

            if (!chosenLat || !chosenLng) {
                const coords = await geocodeAddress(chosen.streetAddress, chosen.city, chosen.state);
                if (coords) {
                    chosenLat = coords.lat;
                    chosenLng = coords.lng;
                }
            }

            addressPayload = {
                addressId: chosen.id,
                streetAddress: chosen.streetAddress,
                city: chosen.city,
                state: chosen.state,
                zipCode: chosen.zipCode,
                latitude: chosenLat,
                longitude: chosenLng
            };
        }

        // Strict 50 km distance check
        if (provLat && provLng && chosenLat && chosenLng) {
            const distKm = calculateDistanceKm(provLat, provLng, chosenLat, chosenLng);
            if (distKm !== null && distKm > 50) {
                setLoading(false);
                setError(`Selected service address is ${distKm.toFixed(1)} km away from ${provider.name}. Bookings are restricted to within a 50 km radius.`);
                play('error');
                return;
            }
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
        <div className="modal-overlay" role="dialog" onClick={e => e.target === e.currentTarget && handleModalClose()}>
            <div className="modal modal--success animate-fade-in">
                <div className="modal-success-icon"><CheckCircle size={36} color="var(--teal, #3E8E7E)" /></div>
                <h2 className="modal-title">Booking Confirmed!</h2>
                <p className="modal-subtitle">Your appointment with <strong>{provider.name}</strong> has been successfully scheduled.</p>
                <div className="modal-booking-badge">
                    <CalIcon size={18} /> {formatSelectedDateFull(date)} at {format12Hour(time)}
                </div>
                <p className="modal-note">A confirmation notification and email have been dispatched to your account.</p>

                {/* 1-Click Multi-Calendar Export */}
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--paper-dim, #9ca3af)', fontWeight: 500 }}>Sync consultation to your calendar:</span>
                    <CalendarExportDropdown
                        title={`${service?.name || 'Appointment'} with Dr. ${provider.name}`}
                        details={`Appointly Consultation with Dr. ${provider.name}\nService: ${service?.name || 'Consultation'}\nDuration: ${service?.duration || 30} mins\nSpecialty: ${provider.specialty || 'Specialist'}\nLocation: ${provider.location || 'Appointly Consultation'}\n\nManage booking: https://appointly.live/dashboard/client`}
                        location={provider.location || 'Appointly Consultation'}
                        startDate={new Date(`${date}T${time}:00Z`)}
                        durationMinutes={service?.duration || 30}
                        variant="primary"
                        size="md"
                        fullWidth={true}
                        buttonText="Add to Calendar (Google / Apple / Outlook)"
                    />
                </div>

                <div className="modal-actions" style={{ marginTop: '1.5rem', width: '100%' }}>
                    <Button variant="outline" onClick={handleModalClose} style={{ flex: 1 }}>Close</Button>
                    <Button variant="primary" onClick={() => window.location.href = '/dashboard/client'} style={{ flex: 1 }}>Go to Dashboard →</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => e.target === e.currentTarget && handleModalClose()}>
            <div className="modal animate-fade-in" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Confirm Appointment</h2>
                        <p className="modal-subtitle">Review consultation details & select service address</p>
                    </div>
                    <button className="modal-close" onClick={handleModalClose} aria-label="Close">✕</button>
                </div>

                {/* 5-Minute Slot Hold Live Countdown */}
                <div className={`modal-slot-hold-timer ${isExpiringSoon ? 'is-expiring' : ''} ${isExpired ? 'is-expired' : ''}`}>
                    <div className="timer-left-group">
                        <span className="timer-icon-pulse">{isExpired ? <AlertTriangle size={18} /> : <Clock size={18} />}</span>
                        <div className="timer-label-group">
                            <span className="timer-title">
                                {isExpired ? 'Slot Lock Expired' : 'Slot Locked Exclusively for You'}
                            </span>
                            <span className="timer-subtitle">
                                {isExpired
                                    ? 'Your 5-minute reservation window has ended. Please close and reselect.'
                                    : 'Guaranteed 5-min lock to prevent race-condition double bookings.'}
                            </span>
                        </div>
                    </div>
                    <div className="timer-badge-display">
                        {formatCountdown(timeLeft)}
                    </div>
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
                        <span>Provider</span>
                        <strong>{provider.name}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>Service</span>
                        <strong>{service?.name || 'Consultation'}</strong>
                    </div>
                    <div className="modal-summary-row">
                        <span>Duration</span>
                        <strong>{service?.duration || 30} mins session</strong>
                    </div>
                    <div className="modal-summary-row modal-summary-row--total">
                        <span>Total Fees</span>
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
                        {gpsAddress && (() => {
                            const dist = (provLat && provLng && gpsAddress.latitude && gpsAddress.longitude)
                                ? calculateDistanceKm(provLat, provLng, gpsAddress.latitude, gpsAddress.longitude)
                                : null;
                            const isOutOfRange = dist !== null && dist > 50;

                            return (
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
                                            {dist !== null && (
                                                <span className={`blinkit-dist-pill ${isOutOfRange ? 'blinkit-dist-pill--invalid' : 'blinkit-dist-pill--valid'}`}>
                                                    {isOutOfRange ? (
                                                        <><AlertTriangle size={11} /> {dist} km away • Exceeds 50 km limit</>
                                                    ) : (
                                                        <><Check size={11} /> {dist} km away • Within 50 km coverage</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="blinkit-card-radio">
                                        {selectedAddressId === 'current_gps' && <div className="blinkit-card-radio-inner" />}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* User Saved Addresses */}
                        {addresses.map(addr => {
                            const isSelected = selectedAddressId === addr.id;
                            const labelLower = (addr.label || 'home').toLowerCase();
                            const dist = (provLat && provLng && addr.latitude && addr.longitude)
                                ? calculateDistanceKm(provLat, provLng, addr.latitude, addr.longitude)
                                : null;
                            const isOutOfRange = dist !== null && dist > 50;

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
                                            {dist !== null && (
                                                <span className={`blinkit-dist-pill ${isOutOfRange ? 'blinkit-dist-pill--invalid' : 'blinkit-dist-pill--valid'}`}>
                                                    {isOutOfRange ? (
                                                        <><AlertTriangle size={11} /> {dist} km away • Exceeds 50 km limit</>
                                                    ) : (
                                                        <><Check size={11} /> {dist} km away • Within 50 km coverage</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="blinkit-card-radio">
                                        {isSelected && <div className="blinkit-card-radio-inner" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 50 km Warning Banner if selected address is out of range */}
                    {isOutOf50kmRange && (
                        <div className="blinkit-range-alert animate-fade-in">
                            <div className="blinkit-range-alert-header">
                                <AlertTriangle size={16} className="blinkit-range-alert-icon" />
                                <span>Service Address is {selectedDistanceKm} km Away (50 km Limit)</span>
                            </div>
                            <p className="blinkit-range-alert-msg">
                                Consultations with <strong>{provider.name}</strong> are strictly restricted to within a <strong>50 km radius</strong>. Please select an address within range or choose a specialist in your area.
                            </p>
                        </div>
                    )}

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
                                        {lbl === 'Home' && <Home size={13} style={{ marginRight: '5px' }} />}
                                        {lbl === 'Work' && <Briefcase size={13} style={{ marginRight: '5px' }} />}
                                        {lbl === 'Other' && <MapPin size={13} style={{ marginRight: '5px' }} />}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label htmlFor="booking-note" style={{ marginBottom: 0, display: 'inline-flex', alignItems: 'center' }}>
                            <FileText size={13} style={{ marginRight: '5px' }} /> Note for provider (optional)
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted, #888)' }}>{note.length} / 500</span>
                    </div>
                    <textarea
                        id="booking-note"
                        rows={2}
                        maxLength={500}
                        className="modal-textarea"
                        placeholder="Share any health details, symptoms, or specific requests… (Max 500 chars)"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </div>

                {error && <div className="modal-error"><AlertTriangle size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{error}</div>}

                <div className="modal-actions">
                    <Button variant="ghost" onClick={handleModalClose} disabled={loading}>Cancel</Button>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleConfirm}
                        disabled={loading || isOutOf50kmRange || isExpired}
                        style={{ minWidth: '165px' }}
                        title={isExpired ? 'Slot lock has expired' : isOutOf50kmRange ? 'Selected address exceeds 50 km limit' : ''}
                    >
                        {loading ? 'Processing...' : isExpired ? 'Slot Lock Expired' : isOutOf50kmRange ? 'Out of 50 km Range' : 'Confirm & Book →'}
                    </Button>
                </div>
            </div>
        </div>
    );
}


/* ─── Main Provider Profile Page ─── */
export default function ProviderProfile() {
    const { id } = useParams();
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const isOwnProfile = Boolean(
        user && (
            id === user.id ||
            id === 'me' ||
            (user.providerProfile && id === user.providerProfile.id) ||
            (user.id && user.id === id)
        )
    );
    const profileId = (id === 'me' || !id) ? (user?.id || user?.providerProfile?.id || 'me') : id;

    // Smooth redirect if a client or admin opens their own profile route
    useEffect(() => {
        if (user && isOwnProfile) {
            const role = user.role?.toUpperCase();
            if (role === 'CLIENT') {
                navigate('/dashboard/client', { replace: true });
            } else if (role === 'ADMIN') {
                navigate('/dashboard/admin', { replace: true });
            }
        }
    }, [user, isOwnProfile, navigate]);

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
    const [heldSlots, setHeldSlots] = useState({});
    const [holdExpiresAt, setHoldExpiresAt] = useState(null);
    const [acquiringHold, setAcquiringHold] = useState(false);
    const socket = useSocket();
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

    // Load active temporary slot holds for selected date
    useEffect(() => {
        if (!provider?.providerProfile?.id || !selectedDate) return;
        appointmentApi.getProviderHolds(provider.providerProfile.id, selectedDate, token)
            .then(holds => {
                if (holds && typeof holds === 'object') setHeldSlots(holds);
            })
            .catch(() => {});
    }, [provider?.providerProfile?.id, selectedDate, token]);

    // Real-time socket sync for slot hold changes
    useEffect(() => {
        if (!socket || !provider?.providerProfile?.id) return;
        const handleSlotHoldChange = (data) => {
            if (data.providerId === provider.providerProfile.id && data.date === selectedDate) {
                setHeldSlots(prev => {
                    const next = { ...prev };
                    if (data.isHeld) {
                        next[data.time] = {
                            isHeld: true,
                            heldByMe: user ? data.userId === user.id : false,
                            expiresAt: data.expiresAt
                        };
                    } else {
                        delete next[data.time];
                    }
                    return next;
                });
            }
        };

        socket.on('slot_hold_changed', handleSlotHoldChange);
        return () => {
            socket.off('slot_hold_changed', handleSlotHoldChange);
        };
    }, [socket, provider?.providerProfile?.id, selectedDate, user]);

    // Handle release hold
    const handleReleaseHold = async () => {
        if (!token || !provider?.providerProfile?.id || !selectedDate || !selectedTime) return;
        try {
            await appointmentApi.releaseSlot({
                providerId: provider.providerProfile.id,
                date: selectedDate,
                time: selectedTime
            }, token);
        } catch (err) {
            console.warn('Failed to release slot hold:', err);
        }
    };

    // Open booking modal by acquiring 5-minute hold first
    const handleOpenBookingModal = async () => {
        if (!token) {
            toast.error('Please login to book an appointment.');
            navigate('/login');
            return;
        }
        try {
            setAcquiringHold(true);
            const holdRes = await appointmentApi.holdSlot({
                providerId: provider?.providerProfile?.id,
                date: selectedDate,
                time: selectedTime
            }, token);

            if (holdRes.success) {
                setHoldExpiresAt(holdRes.expiresAt);
                setShowModal(true);
                toast.success('Slot locked for 5 minutes while you confirm your details.');
            }
        } catch (err) {
            toast.error(err.message || 'This slot is temporarily locked by another client. Please choose another slot.');
            if (provider?.providerProfile?.id && selectedDate) {
                appointmentApi.getProviderHolds(provider.providerProfile.id, selectedDate, token)
                    .then(holds => {
                        if (holds && typeof holds === 'object') setHeldSlots(holds);
                    })
                    .catch(() => {});
            }
        } finally {
            setAcquiringHold(false);
        }
    };

    const handleCloseBookingModal = () => {
        handleReleaseHold();
        setShowModal(false);
    };

    // Save pending slot selection across authentication
    const handleSignInToBook = () => {
        const pending = {
            providerId: profileId,
            providerName: provider?.name,
            serviceId: selectedService?.id,
            serviceName: selectedService?.name,
            date: selectedDate,
            time: selectedTime,
            formattedDate: selectedDate ? formatSelectedDateFull(selectedDate) : '',
            formattedTime: selectedTime ? format12Hour(selectedTime) : ''
        };
        try {
            sessionStorage.setItem('appointly_pending_booking', JSON.stringify(pending));
        } catch (e) {
            console.warn('Failed to store pending booking:', e);
        }
        navigate('/login', { state: { from: { pathname: `/provider/${profileId}` } } });
    };

    // Restore pending booking slot across auth if client returned after sign-in
    useEffect(() => {
        if (!provider?.providerProfile?.id) return;
        try {
            const saved = sessionStorage.getItem('appointly_pending_booking');
            if (!saved) return;
            const pending = JSON.parse(saved);
            if (pending && (String(pending.providerId) === String(profileId) || String(pending.providerId) === String(provider.id))) {
                if (pending.date) setSelectedDate(pending.date);
                if (pending.time) setSelectedTime(pending.time);
                if (token && user) {
                    sessionStorage.removeItem('appointly_pending_booking');
                    toast.success(`Welcome back! Restored your appointment slot for ${pending.formattedDate || pending.date} at ${pending.formattedTime || pending.time}.`);
                    setTimeout(() => {
                        setShowModal(true);
                    }, 400);
                }
            }
        } catch (e) {
            console.warn('Pending booking restore error:', e);
        }
    }, [provider, profileId, token, user]);

    useEffect(() => {
        if (!profileId) return;
        setLoading(true);

        const loadData = async () => {
            try {
                const data = await providerApi.getById(profileId, token);
                let reviewsData = [];
                let slotsData = {};
                if (data.providerProfile?.id) {
                    try {
                        reviewsData = await reviewApi.getProviderReviews(data.providerProfile.id);
                    } catch (e) {
                        console.warn('Reviews fetch failed:', e);
                    }
                    try {
                        slotsData = await appointmentApi.getProviderSlots(data.providerProfile.id);
                    } catch (e) {
                        console.warn('Slots fetch failed:', e);
                    }
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

                const pLat = data.latitude != null ? data.latitude : data.providerProfile?.latitude;
                const pLng = data.longitude != null ? data.longitude : data.providerProfile?.longitude;

                const actualReviewsCount = Array.isArray(reviewsData) ? reviewsData.length : 0;
                const computedRating = actualReviewsCount > 0
                    ? (reviewsData.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / actualReviewsCount).toFixed(1)
                    : (data.providerProfile?.rating && Number(data.providerProfile.rating) > 0 ? Number(data.providerProfile.rating).toFixed(1) : '0.0');

                setProvider({
                    ...data,
                    latitude: pLat,
                    longitude: pLng,
                    name: data.name || 'Specialist',
                    title: data.providerProfile?.specialty || 'Medical Specialist',
                    specialty: data.providerProfile?.specialty || 'General Practice',
                    rating: computedRating,
                    reviewsCount: actualReviewsCount,
                    experience: '10+ years',
                    location: fullAddress,
                    phone: phoneNum,
                    price: firstService.price,
                    currency: '₹',
                    about: data.providerProfile?.about || 'Board-certified specialist dedicated to providing holistic, client-centered care.',
                    services: data.providerProfile?.services?.length > 0 ? data.providerProfile.services : [firstService],
                    avatar: '',
                    avatarUrl: data.avatarUrl || data.providerProfile?.avatarUrl || null,
                    verified: Boolean(data.providerProfile?.isVerified),
                });
                setSelectedService(firstService);

                if (token && user) {
                    try {
                        const favorites = await favoriteApi.getMy(token);
                        if (Array.isArray(favorites)) {
                            const favorited = favorites.some(f => f.providerProfileId === data.providerProfile?.id);
                            setIsFavorited(favorited);
                        }
                    } catch (e) {
                        console.warn('Favorite status fetch skipped:', e);
                    }
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

    // Calculate distance to client
    const clientLocation = useMemo(() => {
        try {
            const saved = localStorage.getItem('appointly_client_location');
            if (saved) return JSON.parse(saved);
        } catch {}
        if (user?.latitude && user?.longitude) {
            return { lat: user.latitude, lng: user.longitude, name: user.location || user.city };
        }
        return null;
    }, [user]);

    const distanceToClient = useMemo(() => {
        const pLat = provider?.latitude != null ? provider.latitude : provider?.providerProfile?.latitude;
        const pLng = provider?.longitude != null ? provider.longitude : provider?.providerProfile?.longitude;

        if (!clientLocation?.lat || !clientLocation?.lng || !pLat || !pLng) {
            return null;
        }
        const lat1 = parseFloat(clientLocation.lat);
        const lon1 = parseFloat(clientLocation.lng);
        const lat2 = parseFloat(pLat);
        const lon2 = parseFloat(pLng);
        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;

        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return parseFloat((R * c).toFixed(1));
    }, [clientLocation, provider]);

    const isOutOf50Km = distanceToClient !== null && distanceToClient > 50;
    const canBook = Boolean(token && user) && !isProvider && provider?.verified && !isOutOf50Km && selectedDate && selectedTime && selectedService;

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

    if (error || !provider) {
        return (
            <div className="provider-page animate-fade-in" style={{ padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    maxWidth: '520px',
                    width: '100%',
                    background: 'var(--panel, #171B22)',
                    border: '1px solid var(--line, #272B34)',
                    borderRadius: '16px',
                    padding: '2.5rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.25)'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'rgba(226, 137, 47, 0.12)',
                        color: 'var(--amber, #E2892F)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem'
                    }}>
                        <AlertTriangle size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--paper, #F4F1E8)', marginBottom: '0.6rem' }}>
                        Specialist Profile Not Available
                    </h2>
                    <p style={{ fontSize: '0.92rem', color: 'var(--muted, #8D897D)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                        {error ? (error.includes('not found') ? 'The specialist profile you are trying to view does not exist or may have been unlisted.' : error) : 'We could not locate this specialist in the directory.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            style={{
                                background: 'var(--amber, #E2892F)',
                                color: '#0E1116',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Browse All Specialists
                        </button>
                        {user && (
                            <button
                                type="button"
                                onClick={() => {
                                    const r = user.role?.toUpperCase();
                                    navigate(r === 'PROVIDER' ? '/dashboard/provider' : r === 'ADMIN' ? '/dashboard/admin' : '/dashboard/client');
                                }}
                                style={{
                                    background: 'var(--panel-2, #1D222B)',
                                    color: 'var(--paper, #F4F1E8)',
                                    border: '1px solid var(--line, #272B34)',
                                    padding: '10px 18px',
                                    borderRadius: '8px',
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Go to My Dashboard
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                                            <Heart size={14} fill={isFavorited ? "currentColor" : "none"} style={{ marginRight: '5px' }} />
                                            {isFavorited ? 'Saved' : 'Save'}
                                        </button>
                                        <button
                                            className="pane-chat-btn"
                                            onClick={() => setShowMsgModal(true)}
                                            aria-label="Chat with provider"
                                        >
                                            <MessageSquare size={14} style={{ marginRight: '5px' }} />
                                            Chat
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="profile-compact-header">
                            <div className="avatar-blue-ring">
                                <img
                                    src={getProviderAvatar(provider)}
                                    alt={provider.name}
                                    className="provider-hero-avatar-img"
                                />
                            </div>
                            <div className="summary-info-group">
                                <h2 className="summary-name">{provider.name}</h2>
                                <p className="summary-title">{provider.title}</p>
                                <div className="summary-rating-row">
                                    {provider.reviewsCount > 0 ? (
                                        <>
                                            <Star size={13} fill="#E2892F" stroke="none" />
                                            <span className="rating-score">{Number(provider.rating) > 0 ? provider.rating : '5.0'}</span>
                                            <span className="rating-count">({provider.reviewsCount} {provider.reviewsCount === 1 ? 'review' : 'reviews'})</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={13} fill="#E2892F" stroke="none" />
                                            <span className="rating-score" style={{ color: 'var(--amber)' }}>New Specialist</span>
                                            <span className="rating-count">• No reviews yet</span>
                                        </>
                                    )}
                                </div>
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
                                        heldSlots={heldSlots}
                                    />
                                </div>

                                {/* In-Pane Booking Action Button */}
                                <div className="pane-booking-action">
                                    {!token || !user ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                background: 'rgba(59, 130, 246, 0.08)',
                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                color: '#60a5fa',
                                                fontSize: '0.84rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}><Lock size={16} /></span>
                                                <span><strong>Slot Preserved:</strong> Sign in to confirm your appointment. Your chosen slot will be held for you automatically!</span>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="split-next-btn"
                                                onClick={handleSignInToBook}
                                            >
                                                {selectedDate && selectedTime 
                                                    ? `Sign In to Book (${format12Hour(selectedTime)}) →`
                                                    : 'Sign In to Book Appointment →'}
                                            </Button>
                                        </div>
                                    ) : isOwnProfile ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'rgba(59, 130, 246, 0.08)',
                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                color: '#60a5fa',
                                                fontSize: '0.82rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}><Eye size={16} /></span>
                                                <span><strong>Your Public Profile:</strong> This is how prospective clients see your profile and booking slots.</span>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="split-next-btn"
                                                onClick={() => navigate('/dashboard/provider')}
                                            >
                                                Manage Profile & Schedule in Dashboard →
                                            </Button>
                                        </div>
                                    ) : isProvider ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'rgba(226, 137, 47, 0.08)',
                                                border: '1px solid rgba(226, 137, 47, 0.25)',
                                                color: 'var(--amber, #E2892F)',
                                                fontSize: '0.82rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}><Info size={16} /></span>
                                                <span><strong>Provider Account Active:</strong> You are browsing as a Provider. To book an appointment, switch to a Client account.</span>
                                            </div>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                className="split-next-btn"
                                                onClick={() => {
                                                    logout();
                                                    navigate('/login', { state: { from: { pathname: `/providers/${id}` } } });
                                                }}
                                            >
                                                Sign In with Client Account →
                                            </Button>
                                        </div>
                                    ) : !provider.verified ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                                color: 'var(--warning, #f59e0b)',
                                                fontSize: '0.82rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}><Clock size={16} /></span>
                                                <span><strong>Verification Pending:</strong> This specialist is currently under administrative credential review and cannot accept bookings yet.</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="split-next-btn"
                                                disabled
                                                style={{ opacity: 0.6, cursor: 'not-allowed', width: '100%' }}
                                            >
                                                Awaiting Admin Approval
                                            </Button>
                                        </div>
                                    ) : isOutOf50Km ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                            <div style={{
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                color: '#f87171',
                                                fontSize: '0.84rem',
                                                lineHeight: '1.4',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <AlertTriangle size={16} />
                                                <span><strong>Beyond 50 km Radius:</strong> This specialist is located {distanceToClient} km away. Booking is restricted to providers within 50 km of your selected location.</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="split-next-btn"
                                                disabled
                                                style={{ opacity: 0.6, cursor: 'not-allowed', width: '100%' }}
                                            >
                                                Booking Disabled (&gt; 50 km)
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="split-next-btn"
                                            disabled={!canBook || acquiringHold}
                                            onClick={handleOpenBookingModal}
                                        >
                                            {acquiringHold ? 'Securing 5-Min Slot Lock...' : selectedDate && selectedTime ? `Confirm Booking (${format12Hour(selectedTime)}) →` : 'Select Date & Time to Book'}
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
                    holdExpiresAt={holdExpiresAt}
                    onClose={handleCloseBookingModal}
                    onReleaseHold={handleReleaseHold}
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
