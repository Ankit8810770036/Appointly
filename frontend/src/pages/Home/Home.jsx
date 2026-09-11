import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { providerApi } from '../../api/providers';
import { statsApi, siteReviewApi } from '../../api/stats';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import LocationPromptModal from '../../components/modals/LocationPromptModal/LocationPromptModal';
import ReviewCard from '../../components/ui/ReviewCard/ReviewCard';
import { AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import './Home.css';

// Lazy-load heavy modals (keeps initial Home page bundle feather-light)
const VideoGuideModal = lazy(() => import('../../components/modals/VideoGuideModal/VideoGuideModal'));
const NearbyProvidersMapModal = lazy(() => import('../../components/modals/NearbyProvidersMapModal/NearbyProvidersMapModal'));

/* Default fallback testimonials if database is loading */
const DEFAULT_TESTIMONIALS = [
    { name: 'Kabir', rating: 5, comment: 'Highly recommended platform.' },
    { name: 'Ishita', rating: 5, comment: 'The messaging feature is so helpful.' },
    { name: 'Megha', rating: 5, comment: 'Very easy to find specialists.' },
    { name: 'Aakash', rating: 5, comment: 'Best booking app I have used.' },
    { name: 'Rohan', rating: 4, comment: 'Great experience, simple UI.' }
];

export default function Home() {
    const { t } = useLanguage();
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const isProvider = isAuthenticated && user?.role?.toLowerCase() === 'provider';

    // Active location for 50 km provider filtering
    const [clientLocation, setClientLocation] = useState(() => {
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
                city: user.city || user.location,
            };
        }
        return null;
    });
    const [showLocationPrompt, setShowLocationPrompt] = useState(false);

    const [search, setSearch] = useState({ service: '', location: '', name: '', maxPrice: '' });
    const [providers, setProviders] = useState([]);
    const [filteredProviders, setFilteredProviders] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [testimonials, setTestimonials] = useState([]);
    const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [showVideoGuide, setShowVideoGuide] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [stats, setStats] = useState({ providersCount: 0, bookingsCompleted: 0, citiesCount: 5 });

    // Only prompt for location if user explicitly arrived with askLocation flag
    useEffect(() => {
        if (!isProvider && routerLocation.state?.askLocation) {
            setShowLocationPrompt(true);
        }
    }, [routerLocation.state, isProvider]);

    // Fetch providers filtered within 50 km or all providers if location is null
    const fetchProviders = useCallback(async (loc = clientLocation, keyword = search.service, name = search.name, price = search.maxPrice) => {
        setLoadingProviders(true);
        try {
            const lat = loc?.lat || '';
            const lng = loc?.lng || '';
            const radius = lat && lng ? 50 : '';
            const data = await providerApi.getAll(
                keyword,
                '',
                '',
                '',
                name,
                price,
                lat,
                lng,
                radius
            );
            setProviders(data);
            setFilteredProviders(data);
            setCurrentPage(1);
        } catch (err) {
            console.error('Failed to load providers:', err);
        } finally {
            setLoadingProviders(false);
        }
    }, [clientLocation, search.service, search.name, search.maxPrice]);

    // Fetch on mount or when client location changes
    useEffect(() => {
        if (!isProvider) {
            fetchProviders(clientLocation, search.service, search.name, search.maxPrice);
        }

        statsApi.getPublicStats()
            .then(data => setStats(data))
            .catch(err => console.error('Failed to fetch stats:', err));

        statsApi.getSiteReviews()
            .then(data => {
                if (data && data.length > 0) setTestimonials(data);
                else setTestimonials(DEFAULT_TESTIMONIALS);
            })
            .catch(() => setTestimonials(DEFAULT_TESTIMONIALS));
    }, [clientLocation, isProvider]);

    // Location selection handler (supports clearing when loc is null)
    const handleSelectLocation = (loc) => {
        setClientLocation(loc);
        setCurrentPage(1);
        if (!isProvider) {
            fetchProviders(loc, search.service, search.name, search.maxPrice);
        }
        const el = document.getElementById('providers');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    // Explicit Clear Location Filter handler
    const handleClearLocation = (e) => {
        if (e) e.stopPropagation();
        setClientLocation(null);
        setCurrentPage(1);
        try {
            localStorage.removeItem('appointly_client_location');
        } catch {
            // Ignore
        }
        setSearch(prev => ({ ...prev, location: '' }));
        if (!isProvider) {
            fetchProviders(null, search.service, search.name, search.maxPrice);
        }
        toast.info('Location filter cleared. Showing all providers nationwide.');
    };

    // Search / Filter providers on top of 50 km radius
    const handleSearch = async (keywordOverride) => {
        if (isProvider) {
            const el = document.getElementById('providers');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        setLoadingProviders(true);
        setCurrentPage(1);
        try {
            const keyword = keywordOverride !== undefined ? keywordOverride : search.service;
            const name = search.name;
            const price = search.maxPrice;
            const lat = clientLocation?.lat || '';
            const lng = clientLocation?.lng || '';
            const radius = lat && lng ? 50 : '';

            const data = await providerApi.getAll(keyword, '', '', '', name, price, lat, lng, radius);
            setFilteredProviders(data);
            setCurrentPage(1);

            const el = document.getElementById('providers');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoadingProviders(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    // Review submit
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const token = localStorage.getItem('token');
            await siteReviewApi.create(reviewForm, token);
            setReviewSuccess(true);
            setReviewForm({ name: '', rating: 5, comment: '' });
            const updated = await statsApi.getSiteReviews();
            setTestimonials(updated);
            setTimeout(() => setReviewSuccess(false), 5000);
        } catch (err) {
            console.error('Failed to submit review:', err);
            toast.error('Failed to submit review. Please try again.');
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <div className="home">
            {/* ===== HEADER & NAVIGATION ===== */}
            <header className="home-header">
                <nav className="home-nav">
                    <div className="logo" onClick={() => navigate('/')}>
                        <span className="mark"></span>Appointly
                    </div>

                    <div className="nav-links">
                        <a href="#" className="active">Home</a>
                        <a href="#providers">Providers</a>
                        <a href="#about">About</a>
                    </div>

                    <div className="nav-right">
                        <button
                            type="button"
                            className="chip"
                            onClick={() => setShowVideoGuide(true)}
                            title="Watch guide videos"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="M8 9h8M8 13h5" />
                            </svg>
                            <span className="label">Watch guides</span>
                        </button>

                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <ThemeToggle />
                        </div>

                        {isAuthenticated ? (
                            <>
                                <button
                                    type="button"
                                    className="chip user-chip"
                                    onClick={() => navigate(isProvider ? '/dashboard/provider' : '/dashboard/client')}
                                    title="Open Dashboard"
                                >
                                    <span className="avatar"></span>
                                    <span className="label">{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
                                </button>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => { logout(); navigate('/'); }}
                                >
                                    <span className="label">{t('logout')}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => navigate('/login')}
                                >
                                    <span className="label">{t('login')}</span>
                                </button>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => navigate('/signup')}
                                    style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
                                >
                                    <span className="label">{t('signup')}</span>
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* ===== HERO SECTION ===== */}
            <section className="hero">
                <div className="wrap hero-inner">
                    <span className="stamp">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.1L12 16.3 5.7 20.7 8 13.6 2 9.2h7.6z" />
                        </svg>
                        Now serving {stats.citiesCount || 5}+ cities
                    </span>

                    <h1>
                        Book any service.
                        <em>Anywhere, anytime.</em>
                    </h1>

                    <p className="lede">
                        Connect with thousands of verified professionals — health, beauty, home repair, and fitness — and get a confirmed slot in under a minute.
                    </p>

                    {/* SEARCH PANEL */}
                    <div className="search-panel">
                        <div className="search-field" style={{ flex: 1.3 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="11" cy="11" r="7" />
                                <path d="M21 21l-4.3-4.3" />
                            </svg>
                            <input
                                type="text"
                                placeholder="What service do you need?"
                                value={search.service}
                                onChange={(e) => setSearch({ ...search, service: e.target.value })}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        <div
                            className="search-field search-field--location"
                            onClick={() => setShowLocationPrompt(true)}
                            title={clientLocation ? "Location active. Click to change or clear." : "Click to set your location"}
                            style={{ cursor: 'pointer' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                                <circle cx="12" cy="9.5" r="2.3" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search location"
                                value={clientLocation ? clientLocation.name : ""}
                                readOnly
                                style={{ cursor: 'pointer' }}
                            />
                            {clientLocation && (
                                <button
                                    type="button"
                                    onClick={handleClearLocation}
                                    title="Clear location"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--muted, #94a3b8)',
                                        cursor: 'pointer',
                                        padding: 0,
                                        flexShrink: 0
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="search-field">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Provider name"
                                value={search.name}
                                onChange={(e) => setSearch({ ...search, name: e.target.value })}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        <div className="search-field" style={{ borderRight: 'none' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h7" />
                            </svg>
                            <input
                                type="number"
                                placeholder="Max price"
                                value={search.maxPrice}
                                onChange={(e) => setSearch({ ...search, maxPrice: e.target.value })}
                                onKeyDown={handleKeyDown}
                            />
                        </div>

                        <button className="search-btn" onClick={() => handleSearch()}>
                            Search
                        </button>
                    </div>

                    {/* POPULAR TAGS WITH LINE ICONS */}
                    <div className="popular">
                        <span className="label">Popular:</span>
                        <button
                            type="button"
                            className="tag"
                            onClick={() => {
                                setSearch({ ...search, service: 'Health & wellness' });
                                handleSearch('Health');
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2C7 2 4 6 4 10c0 5.2 8 12 8 12s8-6.8 8-12c0-4-3-8-8-8z" />
                                <path d="M9 10l2 2 4-4" />
                            </svg>
                            Health &amp; wellness
                        </button>

                        <button
                            type="button"
                            className="tag"
                            onClick={() => {
                                setSearch({ ...search, service: 'Beauty & spa' });
                                handleSearch('Beauty');
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
                            </svg>
                            Beauty &amp; spa
                        </button>

                        <button
                            type="button"
                            className="tag"
                            onClick={() => {
                                setSearch({ ...search, service: 'Home services' });
                                handleSearch('Plumber');
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 11l9-7 9 7" />
                                <path d="M5 10v10h14V10" />
                            </svg>
                            Home services
                        </button>

                        <button
                            type="button"
                            className="tag"
                            onClick={() => {
                                setSearch({ ...search, service: 'Fitness' });
                                handleSearch('Yoga');
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M6.5 6.5l11 11M6.5 17.5l11-11" />
                                <rect x="2" y="9" width="6" height="6" rx="1" />
                                <rect x="16" y="9" width="6" height="6" rx="1" />
                            </svg>
                            Fitness
                        </button>
                    </div>
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== PROVIDERS — NUMBERED LEDGER LIST ===== */}
            <section id="providers">
                <div className="wrap">
                    {isProvider ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 24px',
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            maxWidth: '620px',
                            margin: '40px auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <h2 style={{
                                fontSize: '1.4rem',
                                fontWeight: 600,
                                color: 'var(--text)',
                                margin: 0,
                                letterSpacing: '-0.01em'
                            }}>
                                A provider cannot book a service.
                            </h2>
                        </div>
                    ) : (
                        <>
                            <div className="section-head center">
                                <span className="eyebrow"><span className="dot"></span>Browse professionals</span>
                                <h2>Our providers</h2>
                                <p>
                                    {clientLocation
                                        ? `Showing verified specialists located within 50 km of ${clientLocation.name}.`
                                        : 'Showing all verified specialists nationwide across all cities.'}
                                </p>

                                <div className="home-location-pill-wrap">
                                    {clientLocation ? (
                                        <div className="home-location-pill">
                                            <span className="home-location-pill__icon">
                                                <MapPin size={15} strokeWidth={2} />
                                            </span>
                                            <span className="home-location-pill__text">
                                                Showing specialists within <strong>50 km</strong> of <strong>{clientLocation.name}</strong>
                                            </span>
                                            <span className="home-location-pill__dot">·</span>
                                            <button
                                                type="button"
                                                className="home-location-pill__action"
                                                onClick={() => setShowLocationPrompt(true)}
                                            >
                                                Change
                                            </button>
                                            <span className="home-location-pill__dot">·</span>
                                            <button
                                                type="button"
                                                className="home-location-pill__action"
                                                onClick={handleClearLocation}
                                                style={{ color: 'var(--amber)' }}
                                            >
                                                Show All Cities
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="home-location-pill">
                                            <span className="home-location-pill__icon">
                                                <Globe size={15} strokeWidth={2} />
                                            </span>
                                            <span className="home-location-pill__text">
                                                Showing specialists across <strong>All Cities</strong> (Nationwide)
                                            </span>
                                            <span className="home-location-pill__dot">·</span>
                                            <button
                                                type="button"
                                                className="home-location-pill__action"
                                                onClick={() => setShowLocationPrompt(true)}
                                            >
                                                Filter by 50 km Radius
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="ledger">
                                {loadingProviders ? (
                                    <div className="provider-skeleton-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', width: '100%', padding: '0.5rem 0 1.5rem' }}>
                                        {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="entry" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <Skeleton variant="circle" width="52px" height="52px" />
                                                    <div style={{ flex: 1 }}>
                                                        <Skeleton variant="text" width="60%" height="18px" style={{ marginBottom: '6px' }} />
                                                        <Skeleton variant="text" width="40%" height="13px" />
                                                    </div>
                                                </div>
                                                <Skeleton variant="text" width="90%" height="14px" style={{ marginTop: '8px' }} />
                                                <Skeleton variant="text" width="75%" height="14px" />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                                                    <Skeleton variant="text" width="70px" height="18px" />
                                                    <Skeleton variant="rect" width="90px" height="32px" style={{ borderRadius: '6px' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredProviders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
                                        <p style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text)' }}>
                                            No service providers found {clientLocation ? `within 50 km of ${clientLocation.name}` : ''}.
                                        </p>
                                        <p style={{ fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 18px', color: 'var(--muted)' }}>
                                            We restrict listings strictly to a 50 km service radius. You can adjust your location area or clear active search filters.
                                        </p>
                                        <button
                                            className="chip"
                                            onClick={() => setShowLocationPrompt(true)}
                                            style={{ borderColor: 'var(--amber)', color: 'var(--amber)', cursor: 'pointer', padding: '8px 18px' }}
                                        >
                                            📍 Change Location Hub
                                        </button>
                                    </div>
                                ) : (
                                    (() => {
                                        const totalPages = Math.ceil(filteredProviders.length / ITEMS_PER_PAGE);
                                        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                        const paginatedProviders = filteredProviders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                                        return (
                                            <>
                                                {paginatedProviders.map((p, index) => {
                                                    const globalIndex = startIndex + index + 1;
                                                    const minPrice = p.providerProfile?.services?.length > 0
                                                        ? Math.min(...p.providerProfile.services.map(s => s.price))
                                                        : null;

                                                    return (
                                                        <div key={p.id} className="ledger-row">
                                                            <div className="ledger-index">
                                                                {String(globalIndex).padStart(2, '0')}
                                                            </div>

                                                            <div className="ledger-main">
                                                                <div className="ledger-name-row">
                                                                    <span
                                                                        className="ledger-name"
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => navigate(`/provider/${p.id}`)}
                                                                    >
                                                                        {p.name}
                                                                    </span>
                                                                    <span className="verified">
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                            <path d="M4 12l5 5L20 6" />
                                                                        </svg>
                                                                        Verified
                                                                    </span>
                                                                </div>

                                                                <div className="ledger-role">
                                                                    {p.providerProfile?.specialty || 'Professional'}
                                                                </div>

                                                                <div className="ledger-meta">
                                                                    <span>
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                                            <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                                                                            <circle cx="12" cy="9.5" r="2.3" />
                                                                        </svg>
                                                                        {p.location || p.providerProfile?.location || p.city || 'India'}
                                                                    </span>

                                                                    {p.distanceKm != null && (
                                                                        <span style={{
                                                                            background: 'rgba(245, 158, 11, 0.12)',
                                                                            color: 'var(--amber)',
                                                                            border: '1px solid rgba(245, 158, 11, 0.25)',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: 600,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}>
                                                                            📍 {p.distanceKm} km away
                                                                        </span>
                                                                    )}

                                                                    <span>
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                                            <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.1L12 16.3 5.7 20.7 8 13.6 2 9.2h7.6z" />
                                                                        </svg>
                                                                        {p.providerProfile?.rating ? `${p.providerProfile.rating} rating` : '⭐ 4.9 rating'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="ledger-price">
                                                                {minPrice && (
                                                                    <>From <span className="amt">₹{minPrice}</span></>
                                                                )}
                                                            </div>

                                                            <button
                                                                className="book-btn"
                                                                onClick={() => navigate(`/provider/${p.id}`)}
                                                            >
                                                                Book
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                {/* Pagination Controls */}
                                                {totalPages > 1 && (
                                                    <div className="home-pagination-bar">
                                                        <span className="home-pagination-info">
                                                            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredProviders.length)}</strong> of <strong>{filteredProviders.length}</strong> specialists
                                                        </span>
                                                        <div className="home-pagination-btns">
                                                            <button
                                                                type="button"
                                                                className="home-page-nav-btn"
                                                                disabled={currentPage === 1}
                                                                onClick={() => {
                                                                    setCurrentPage(p => Math.max(1, p - 1));
                                                                    document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                                                                }}
                                                            >
                                                                ← Prev
                                                            </button>
                                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                                                <button
                                                                    key={pageNum}
                                                                    type="button"
                                                                    className={`home-page-num-btn ${currentPage === pageNum ? 'home-page-num-btn--active' : ''}`}
                                                                    onClick={() => {
                                                                        setCurrentPage(pageNum);
                                                                        document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                                                                    }}
                                                                >
                                                                    {pageNum}
                                                                </button>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                className="home-page-nav-btn"
                                                                disabled={currentPage === totalPages}
                                                                onClick={() => {
                                                                    setCurrentPage(p => Math.min(totalPages, p + 1));
                                                                    document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' });
                                                                }}
                                                            >
                                                                Next →
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== TRUST STRIP (DIVIDED COLUMN STRIP) ===== */}
            <section style={{ padding: '80px 0' }}>
                <div className="wrap">
                    <div className="section-head center">
                        <span className="eyebrow"><span className="dot"></span>Appointly trust promise</span>
                        <h2>Why 50,000+ clients trust Appointly</h2>
                        <p>Enterprise-grade safety, price transparency, and guaranteed service satisfaction.</p>
                    </div>
                </div>

                <div className="trust-strip">
                    <div className="trust-item">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" />
                        </svg>
                        <h3>100% verified specialists</h3>
                        <p>Government ID and professional credentials checked before any listing goes live.</p>
                    </div>

                    <div className="trust-item">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <path d="M12 3v18M8 7h6a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h7" />
                        </svg>
                        <h3>Fixed, transparent pricing</h3>
                        <p>Upfront service rates are guaranteed, with zero hidden platform fees.</p>
                    </div>

                    <div className="trust-item">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21z" />
                            <circle cx="12" cy="9.5" r="2.3" />
                        </svg>
                        <h3>Live GPS directions</h3>
                        <p>Turn-by-turn routing and distance calculation straight to your specialist.</p>
                    </div>

                    <div className="trust-item">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
                        </svg>
                        <h3>Instant one-tap booking</h3>
                        <p>Pick a date and time slot, then get push and SMS confirmation in under 30 seconds.</p>
                    </div>
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== TESTIMONIALS ===== */}
            <section>
                <div className="wrap">
                    <div className="section-head center">
                        <span className="eyebrow"><span className="dot" style={{ background: 'var(--teal)' }}></span>What people say</span>
                        <h2>Loved by thousands</h2>
                        <p>Real reviews from real customers.</p>
                    </div>
                </div>

                <div className="wrap">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                        {testimonials.slice(0, 6).map((tItem, i) => (
                            <ReviewCard key={tItem.id || i} review={tItem} />
                        ))}
                    </div>
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== FEEDBACK FORM ===== */}
            <section id="feedback">
                <div className="wrap">
                    <div className="section-head center">
                        <span className="eyebrow"><span className="dot"></span>Share your story</span>
                        <h2>Help us grow</h2>
                        <p>Tell us how Appointly has helped you. We value your feedback.</p>
                    </div>

                    <div className="form-card">
                        {reviewSuccess ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
                                <h3 className="serif" style={{ fontSize: '24px', color: 'var(--paper)', margin: '0 0 8px' }}>Thank you!</h3>
                                <p style={{ color: 'var(--paper-dim)', margin: 0 }}>Your feedback helps our community thrive.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleReviewSubmit}>
                                {!isAuthenticated && (
                                    <>
                                        <label className="field-label">Your Name</label>
                                        <input
                                            type="text"
                                            className="form-input-text"
                                            placeholder="Enter your name"
                                            value={reviewForm.name}
                                            onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                                            required={!isAuthenticated}
                                        />
                                    </>
                                )}

                                <label className="field-label">Rating</label>
                                <div className="star-input">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                            style={{ opacity: star <= reviewForm.rating ? 1 : 0.3 }}
                                            title={`${star} star`}
                                        >
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2l2.9 6h6.6l-5.3 4.1 2 6.4L12 15l-6.2 3.5 2-6.4L2.5 8h6.6z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>

                                <label className="field-label">Your feedback</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="How was your experience using our platform?"
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                    required
                                ></textarea>

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={submittingReview}
                                >
                                    {submittingReview ? 'Posting...' : 'Post review'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== ABOUT ===== */}
            <section id="about" style={{ paddingBottom: '100px' }}>
                <div className="wrap about">
                    <span className="eyebrow"><span className="dot"></span>Our mission</span>
                    <h2>About our company</h2>
                    <p>
                        At Appointly, we believe accessing quality services should be effortless. We built a platform that simplifies scheduling, builds trust through transparent reviews, and helps local professionals thrive. Whether you need a quick haircut, a reliable plumber, or a long-term consultant, we make that connection instantly.
                    </p>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="home-footer">
                <div className="wrap">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="logo"><span className="mark"></span>Appointly</div>
                            <p>Making appointments effortless.</p>
                        </div>

                        <div className="footer-col">
                            <h4>Product</h4>
                            <a href="#providers">Providers</a>
                            <a href="#about">About</a>
                        </div>

                        <div className="footer-col">
                            <h4>Company</h4>
                            <a href="#about">About us</a>
                            <a href="#feedback">Feedback</a>
                            <a href="/contact">Contact</a>
                        </div>

                        <div className="footer-col">
                            <h4>Support</h4>
                            <a href="/contact">Help center</a>
                            <a href="/terms">Terms</a>
                            <a href="/privacy">Privacy</a>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        © 2026 Appointly. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* ===== MODALS ===== */}
            <Suspense fallback={null}>
                <AnimatePresence>
                    {showVideoGuide && (
                        <VideoGuideModal onClose={() => setShowVideoGuide(false)} />
                    )}
                </AnimatePresence>

                {showLocationMap && (
                    <NearbyProvidersMapModal
                        isOpen={showLocationMap}
                        onClose={() => setShowLocationMap(false)}
                        providers={providers}
                        currentLocationName={clientLocation ? clientLocation.name : search.location}
                        onSelectLocation={(locName, coords) => {
                            const newLoc = coords
                                ? { lat: coords.lat, lng: coords.lng, name: locName }
                                : { lat: 28.6304, lng: 77.2177, name: locName };
                            handleSelectLocation(newLoc);
                        }}
                    />
                )}
            </Suspense>

            <LocationPromptModal
                isOpen={showLocationPrompt}
                onClose={() => setShowLocationPrompt(false)}
                onSelectLocation={handleSelectLocation}
                currentLocation={clientLocation}
                canDismiss={true}
            />
        </div>
    );
}
