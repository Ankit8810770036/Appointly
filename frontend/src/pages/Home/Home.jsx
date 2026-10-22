import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { providerApi } from '../../api/providers';
import { statsApi, siteReviewApi } from '../../api/stats';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import ReviewCard from '../../components/ui/ReviewCard/ReviewCard';
import { AnimatePresence } from 'framer-motion';
import { MapPin, X, Globe, Search, Map as MapIcon, User as UserIcon, Home as HomeIcon, Infinity as InfinityIcon, CircleDollarSign, Star, Check, Sparkles, Video, ShieldCheck, HeartPulse, Wrench, Dumbbell, BookOpen, Users, Info, PhoneCall, LayoutDashboard, LogOut, LogIn, UserPlus, ChevronRight } from 'lucide-react';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import { getProviderAvatar, CURATED_PROVIDER_PORTRAITS } from '../../utils/avatars';
import heroWallpaperImg from '../../assets/hero_wallpaper.png';
import './Home.css';

// Lazy-load heavy modals (keeps initial Home page bundle feather-light)
const VideoGuideModal = lazy(() => import('../../components/modals/VideoGuideModal/VideoGuideModal'));
const NearbyProvidersMapModal = lazy(() => import('../../components/modals/NearbyProvidersMapModal/NearbyProvidersMapModal'));



const POPULAR_SERVICES = [
    'General Health Consultation',
    'Physiotherapy & Rehab',
    'Dermatology & Skin Care',
    'Mental Health & Therapy',
    'Cardiology & Heart Care',
    'Yoga & Mindfulness Training',
    'Haircut, Beard & Styling',
    'Deep Tissue Massage & Spa',
    'Plumbing & Pipe Repair',
    'Home Deep Cleaning',
    'Electrical Repair & Wiring',
    'AC Servicing & Repair',
    'Fitness & Personal Training',
    'Diet & Nutrition Advisory',
    'Legal & Tax Advisory'
];

const AVATAR_PALETTE = ['#D97706', '#7C3AED', '#D97728', '#059669', '#EA580C', '#2563EB', '#0D9488', '#DB2777'];

const getInitials = (name) => {
    if (!name) return 'PR';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarBg = (name, index = 0) => {
    let hash = index;
    if (name) {
        for (let i = 0; i < name.length; i++) {
            hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
        }
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

const getPaginationItems = (current, total) => {
    if (total <= 6) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items = [];
    if (current <= 3) {
        for (let i = 1; i <= Math.min(4, total); i++) {
            items.push(i);
        }
        if (total > 4) {
            items.push('ellipsis-end');
            items.push(total);
        }
    } else if (current >= total - 2) {
        items.push(1);
        items.push('ellipsis-start');
        for (let i = total - 3; i <= total; i++) {
            if (i > 1) items.push(i);
        }
    } else {
        items.push(1);
        items.push('ellipsis-start');
        items.push(current - 1);
        items.push(current);
        items.push(current + 1);
        if (current + 2 < total) {
            items.push(current + 2);
        }
        if (current + 2 < total - 1) {
            items.push('ellipsis-end');
        }
        items.push(total);
    }
    return items;
};

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
    const [search, setSearch] = useState({ service: '', location: '', name: '', maxPrice: '' });
    const [providers, setProviders] = useState([]);
    const [filteredProviders, setFilteredProviders] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [testimonials, setTestimonials] = useState([]);
    const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const [showVideoGuide, setShowVideoGuide] = useState(false);
    const [showLocationMap, setShowLocationMap] = useState(false);
    const [stats, setStats] = useState({ providersCount: 0, bookingsCompleted: 0, citiesCount: 5 });
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(-1);
    const serviceFieldRef = useRef(null);

    // Close suggestions dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (serviceFieldRef.current && !serviceFieldRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const matchingSuggestions = POPULAR_SERVICES.filter(svc => {
        if (!search.service.trim()) return true;
        return svc.toLowerCase().includes(search.service.trim().toLowerCase());
    }).slice(0, 6);

    // Prompt for map if user arrived with askLocation or autoOpenMap flag
    useEffect(() => {
        if (routerLocation.state?.askLocation || routerLocation.state?.autoOpenMap) {
            if (isAuthenticated) {
                setShowLocationMap(true);
            }
        }
    }, [routerLocation.state, isAuthenticated]);

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

    // Fetch global platform stats and site reviews once on mount
    useEffect(() => {
        statsApi.getPublicStats()
            .then(data => setStats(data))
            .catch(err => console.error('Failed to fetch stats:', err));

        statsApi.getSiteReviews()
            .then(data => {
                if (data && data.length > 0) setTestimonials(data);
                else setTestimonials([]);
            })
            .catch(() => setTestimonials([]));
    }, []);

    // Fetch providers when client location or search dependencies change
    useEffect(() => {
        fetchProviders(clientLocation, search.service, search.name, search.maxPrice);
    }, [clientLocation, fetchProviders]);

    // Open interactive map modal
    const handleOpenMapFlow = () => {
        setShowLocationMap(true);
    };

    // Location selection handler (supports clearing when loc is null)
    const handleSelectLocation = (loc) => {
        setClientLocation(loc);
        setCurrentPage(1);
        fetchProviders(loc, search.service, search.name, search.maxPrice);
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
        fetchProviders(null, search.service, search.name, search.maxPrice);
        toast.info('Location filter cleared. Showing all providers nationwide.');
    };

    // Search / Filter providers on top of 50 km radius
    const handleSearch = async (keywordOverride) => {
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

    const handleSelectSuggestion = (serviceName) => {
        setSearch(prev => ({ ...prev, service: serviceName }));
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        handleSearch(serviceName);
    };

    const handleServiceKeyDown = (e) => {
        if (!showSuggestions || matchingSuggestions.length === 0) {
            if (e.key === 'Enter') handleSearch();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev < matchingSuggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev > 0 ? prev - 1 : matchingSuggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestion >= 0 && activeSuggestion < matchingSuggestions.length) {
                handleSelectSuggestion(matchingSuggestions[activeSuggestion]);
            } else {
                setShowSuggestions(false);
                handleSearch();
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    // Budget Input Validation & Sanitization (prevents absurd values, negative numbers, and non-digits)
    const handleBudgetChange = (e) => {
        const rawVal = e.target.value;
        if (rawVal === '') {
            setSearch(prev => ({ ...prev, maxPrice: '' }));
            return;
        }

        // Strip non-numeric characters
        const cleanVal = rawVal.replace(/[^0-9]/g, '');
        if (cleanVal === '') {
            setSearch(prev => ({ ...prev, maxPrice: '' }));
            return;
        }

        const num = parseInt(cleanVal, 10);
        if (isNaN(num)) return;

        // Realistic budget cap (₹100,000 max price filter)
        const MAX_BUDGET = 100000;
        if (num > MAX_BUDGET) {
            setSearch(prev => ({ ...prev, maxPrice: String(MAX_BUDGET) }));
            toast.warning(`Maximum budget filter is capped at ₹${MAX_BUDGET.toLocaleString('en-IN')}`);
            return;
        }

        setSearch(prev => ({ ...prev, maxPrice: String(num) }));
    };

    const handleBudgetKeyDown = (e) => {
        // Prevent typing scientific notation 'e', signs '+', '-', or '.'
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
        }
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Review submit
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const authorName = user?.name || reviewForm.name || 'Client';
            const payload = {
                name: authorName,
                rating: Number(reviewForm.rating) || 5,
                comment: reviewForm.comment
            };
            await siteReviewApi.create(payload);
            setReviewSuccess(true);
            setReviewForm({ name: '', rating: 5, comment: '' });
            const updated = await statsApi.getSiteReviews();
            if (updated && updated.length > 0) {
                setTestimonials(updated.slice(0, 10));
            }
            toast.success('Thank you! Your feedback has been posted.');
            setTimeout(() => setReviewSuccess(false), 5000);
        } catch (err) {
            console.error('Failed to submit review:', err);
            toast.error(err.message || 'Failed to submit review. Please try again.');
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
                        <Link to="/about">About</Link>
                        <Link to="/contact">Contact</Link>
                    </div>

                    <div className="nav-right">
                        <button
                            type="button"
                            className="chip home-nav-guides-btn"
                            onClick={() => setShowVideoGuide(true)}
                            title="Watch guide videos"
                            aria-label="Watch guide videos"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="M8 9h8M8 13h5" />
                            </svg>
                            <span className="label home-nav-guides-label">Watch guides</span>
                        </button>

                        <div className="home-theme-toggle-wrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <ThemeToggle />
                        </div>

                        {isAuthenticated ? (
                            <>
                                <button
                                    type="button"
                                    className="chip user-chip"
                                    onClick={() => {
                                        const role = user?.role?.toUpperCase();
                                        if (role === 'PROVIDER') navigate('/dashboard/provider');
                                        else if (role === 'ADMIN') navigate('/dashboard/admin');
                                        else navigate('/dashboard/client');
                                    }}
                                    title="Open My Profile & Dashboard"
                                >
                                    <span className="avatar">
                                        {user?.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="" className="home-nav-avatar-img" />
                                        ) : (
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0E1116', lineHeight: 1 }}>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                                        )}
                                    </span>
                                    <span className="label">{user?.name ? user.name.split(' ')[0] : 'Profile'}</span>
                                </button>
                                <button
                                    type="button"
                                    className="chip home-nav-logout-btn"
                                    onClick={() => { logout(); navigate('/'); }}
                                    title="Log out"
                                >
                                    <span className="label">{t('logout') || 'Logout'}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="chip user-chip"
                                    onClick={() => navigate('/login')}
                                    title="Sign in"
                                >
                                    <span className="label">{t('login') || 'Sign In'}</span>
                                </button>
                                <button
                                    type="button"
                                    className="chip home-nav-logout-btn"
                                    onClick={() => navigate('/signup')}
                                    title="Create an account"
                                >
                                    <span className="label">{t('signup') || 'Sign Up'}</span>
                                </button>
                            </>
                        )}

                        {/* Mobile Hamburger Button */}
                        <button
                            type="button"
                            className={`home-hamburger ${mobileNavOpen ? 'home-hamburger--open' : ''}`}
                            onClick={() => setMobileNavOpen(prev => !prev)}
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileNavOpen}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </nav>

                {/* Mobile Drawer Menu & Backdrop */}
                {mobileNavOpen && (
                    <>
                        <div
                            className="home-mobile-backdrop"
                            onClick={() => setMobileNavOpen(false)}
                            aria-hidden="true"
                        />
                        <div className="home-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
                            {/* Profile Header (if logged in) */}
                            {isAuthenticated && (
                                <div className="home-mobile-profile-card">
                                    <div className="home-mobile-profile-avatar">
                                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="home-mobile-profile-info">
                                        <div className="home-mobile-profile-name">{user?.name || 'My Account'}</div>
                                        <div className="home-mobile-profile-role">{user?.role || 'CLIENT'}</div>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Links */}
                            <div className="home-mobile-menu-links">
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setMobileNavOpen(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className={`home-mobile-link ${location.pathname === '/' ? 'active' : ''}`}
                                >
                                    <div className="home-mobile-link-icon">
                                        <HomeIcon size={18} />
                                    </div>
                                    <div className="home-mobile-link-text">
                                        <span className="home-mobile-link-title">Home</span>
                                        <span className="home-mobile-link-sub">Explore all services</span>
                                    </div>
                                    <ChevronRight size={15} className="home-mobile-link-arrow" />
                                </a>

                                <a
                                    href="#providers"
                                    onClick={() => setMobileNavOpen(false)}
                                    className="home-mobile-link"
                                >
                                    <div className="home-mobile-link-icon">
                                        <Users size={18} />
                                    </div>
                                    <div className="home-mobile-link-text">
                                        <span className="home-mobile-link-title">Providers</span>
                                        <span className="home-mobile-link-sub">Find verified experts</span>
                                    </div>
                                    <ChevronRight size={15} className="home-mobile-link-arrow" />
                                </a>

                                <Link
                                    to="/about"
                                    onClick={() => setMobileNavOpen(false)}
                                    className={`home-mobile-link ${location.pathname === '/about' ? 'active' : ''}`}
                                >
                                    <div className="home-mobile-link-icon">
                                        <Info size={18} />
                                    </div>
                                    <div className="home-mobile-link-text">
                                        <span className="home-mobile-link-title">About Us</span>
                                        <span className="home-mobile-link-sub">Our story & standards</span>
                                    </div>
                                    <ChevronRight size={15} className="home-mobile-link-arrow" />
                                </Link>

                                <Link
                                    to="/contact"
                                    onClick={() => setMobileNavOpen(false)}
                                    className={`home-mobile-link ${location.pathname === '/contact' ? 'active' : ''}`}
                                >
                                    <div className="home-mobile-link-icon">
                                        <PhoneCall size={18} />
                                    </div>
                                    <div className="home-mobile-link-text">
                                        <span className="home-mobile-link-title">Contact</span>
                                        <span className="home-mobile-link-sub">Get help & support</span>
                                    </div>
                                    <ChevronRight size={15} className="home-mobile-link-arrow" />
                                </Link>
                            </div>

                            {/* Video Guide Banner */}
                            <div className="home-mobile-menu-actions">
                                <button
                                    type="button"
                                    className="home-mobile-action-btn"
                                    onClick={() => { setMobileNavOpen(false); setShowVideoGuide(true); }}
                                >
                                    <div className="home-mobile-action-icon">
                                        <Video size={16} />
                                    </div>
                                    <div className="home-mobile-action-text">
                                        <span>Watch guide videos</span>
                                        <small>Interactive video walkthrough</small>
                                    </div>
                                    <span className="home-mobile-action-pill">Play</span>
                                </button>

                                {/* Auth Buttons */}
                                {isAuthenticated ? (
                                    <div className="home-mobile-auth-group">
                                        <button
                                            type="button"
                                            className="home-mobile-auth-btn home-mobile-auth-btn--primary"
                                            onClick={() => {
                                                setMobileNavOpen(false);
                                                const role = user?.role?.toUpperCase();
                                                if (role === 'PROVIDER') navigate('/dashboard/provider');
                                                else if (role === 'ADMIN') navigate('/dashboard/admin');
                                                else navigate('/dashboard/client');
                                            }}
                                        >
                                            <LayoutDashboard size={15} />
                                            <span>Dashboard</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="home-mobile-auth-btn home-mobile-auth-btn--ghost"
                                            onClick={() => {
                                                setMobileNavOpen(false);
                                                logout();
                                                navigate('/');
                                            }}
                                        >
                                            <LogOut size={15} />
                                            <span>{t('logout') || 'Logout'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="home-mobile-auth-group">
                                        <button
                                            type="button"
                                            className="home-mobile-auth-btn home-mobile-auth-btn--ghost"
                                            onClick={() => {
                                                setMobileNavOpen(false);
                                                navigate('/login');
                                            }}
                                        >
                                            <LogIn size={15} />
                                            <span>{t('login') || 'Sign In'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="home-mobile-auth-btn home-mobile-auth-btn--primary"
                                            onClick={() => {
                                                setMobileNavOpen(false);
                                                navigate('/signup');
                                            }}
                                        >
                                            <UserPlus size={15} />
                                            <span>{t('signup') || 'Sign Up'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* ===== HERO SECTION ===== */}
            <section className="hero">
                {/* Full-bleed Seamless Wallpaper Backdrop */}
                <div className="hero-wallpaper-backdrop" aria-hidden="true">
                    <img
                        src={heroWallpaperImg}
                        alt=""
                        className="hero-wallpaper-img"
                        loading="eager"
                    />
                    <div className="hero-wallpaper-overlay"></div>
                </div>

                <div className="wrap hero-layout">
                    {/* Left Column: Headlines, Search Panel, Popular Tags */}
                    <div className="hero-left">
                        <div className="stamp">
                            <Star size={13} fill="#E2892F" stroke="none" />
                            <span>Serving verified specialists across 93 cities</span>
                        </div>

                        <h1 className="hero-title">
                            Book any service.
                            <em>Anywhere, anytime.</em>
                        </h1>

                        <p className="lede">
                            Find verified service professionals across health, home services, consulting, and wellness. Book your confirmed appointment online in seconds.
                        </p>

                        {/* SEARCH PANEL */}
                        <div className="search-panel">
                            {/* 1. Service Field with Autocomplete */}
                            <div className="search-field search-field--service" ref={serviceFieldRef}>
                                <div className="search-field-icon">
                                    <Search size={16} strokeWidth={2} />
                                </div>
                                <div className="search-field-content">
                                    <span className="search-field-label">Service</span>
                                    <input
                                        type="text"
                                        className="search-field-input"
                                        placeholder="Doctor, plumber, yoga, therap"
                                        value={search.service}
                                        onFocus={() => setShowSuggestions(true)}
                                        onChange={(e) => {
                                            setSearch({ ...search, service: e.target.value });
                                            setShowSuggestions(true);
                                            setActiveSuggestion(-1);
                                        }}
                                        onKeyDown={handleServiceKeyDown}
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Autocomplete Suggestions Dropdown */}
                                {showSuggestions && matchingSuggestions.length > 0 && (
                                    <div className="search-autocomplete-dropdown">
                                        <div className="autocomplete-header">POPULAR SERVICES</div>
                                        {matchingSuggestions.map((item, idx) => (
                                            <div
                                                key={item}
                                                className={`autocomplete-item ${activeSuggestion === idx ? 'autocomplete-item--active' : ''}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSelectSuggestion(item);
                                                }}
                                            >
                                                <Search size={13} className="autocomplete-item-icon" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2. Location Field with Interactive Map trigger badge */}
                            <div
                                className="search-field search-field--location"
                                onClick={handleOpenMapFlow}
                                title={clientLocation ? "Location active (50 km radius). Click to open interactive map." : "Click to open interactive map and choose location"}
                            >
                                <div className="search-field-icon">
                                    <MapPin size={16} strokeWidth={2} />
                                </div>
                                <div className="search-field-content">
                                    <div className="search-field-header-row">
                                        <span className="search-field-label">Location</span>
                                        <button
                                            type="button"
                                            className="search-map-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenMapFlow();
                                            }}
                                            title="Open Interactive Map"
                                            aria-label="Open Interactive Map"
                                        >
                                            <MapIcon size={12} strokeWidth={2.2} />
                                        </button>
                                    </div>
                                    <div className="search-field-value-wrapper">
                                        <span className={`search-field-value ${clientLocation ? 'is-active' : 'is-placeholder'}`}>
                                            {clientLocation ? (clientLocation.name || clientLocation.city) : 'All Locations / Nationwide'}
                                        </span>
                                        {clientLocation && (
                                            <button
                                                type="button"
                                                className="search-field-clear"
                                                onClick={handleClearLocation}
                                                title="Clear location filter (show nationwide)"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Budget Field */}
                            <div className="search-field search-field--budget">
                                <div className="search-field-icon">
                                    <span className="budget-rupee-symbol">₹</span>
                                </div>
                                <div className="search-field-content">
                                    <span className="search-field-label">Budget</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="search-field-input"
                                        placeholder="Max ₹ (e.g. 2000)"
                                        value={search.maxPrice}
                                        onChange={handleBudgetChange}
                                        onKeyDown={handleBudgetKeyDown}
                                        maxLength={6}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons: Unified, crisp primary search */}
                            <div className="search-actions">
                                <button
                                    type="button"
                                    className="search-action-btn search-action-btn--search"
                                    onClick={() => handleSearch()}
                                >
                                    <Search size={15} strokeWidth={2.4} />
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        {/* POPULAR TAGS */}
                        <div className="popular">
                            <span className="label">Popular:</span>
                            <button
                                type="button"
                                className={`tag ${search.service === 'Health & wellness' ? 'tag--active' : ''}`}
                                onClick={() => {
                                    const next = search.service === 'Health & wellness' ? '' : 'Health & wellness';
                                    setSearch({ ...search, service: next });
                                    handleSearch(next);
                                }}
                            >
                                <ShieldCheck size={13} strokeWidth={2} />
                                <span>Health &amp; wellness</span>
                            </button>

                            <button
                                type="button"
                                className={`tag ${search.service === 'Beauty & spa' ? 'tag--active' : ''}`}
                                onClick={() => {
                                    const next = search.service === 'Beauty & spa' ? '' : 'Beauty & spa';
                                    setSearch({ ...search, service: next });
                                    handleSearch(next);
                                }}
                            >
                                <UserIcon size={13} strokeWidth={2} />
                                <span>Beauty &amp; spa</span>
                            </button>

                            <button
                                type="button"
                                className={`tag ${search.service === 'Home services' ? 'tag--active' : ''}`}
                                onClick={() => {
                                    const next = search.service === 'Home services' ? '' : 'Home services';
                                    setSearch({ ...search, service: next });
                                    handleSearch(next);
                                }}
                            >
                                <HomeIcon size={13} strokeWidth={2} />
                                <span>Home services</span>
                            </button>

                            <button
                                type="button"
                                className={`tag ${search.service === 'Fitness' ? 'tag--active' : ''}`}
                                onClick={() => {
                                    const next = search.service === 'Fitness' ? '' : 'Fitness';
                                    setSearch({ ...search, service: next });
                                    handleSearch(next);
                                }}
                            >
                                <InfinityIcon size={13} strokeWidth={2} />
                                <span>Fitness</span>
                            </button>
                        </div>
                    </div>

                    {/* Right spacer for 2-column grid layout */}
                    <div className="hero-right-spacer" aria-hidden="true" />
                </div>

                {/* Interactive 3D Service Badges & Rating Cards Scene (Matched 1:1 to mockup, Non-Floating) */}
                <div className="hero-3d-scene" aria-label="Interactive service badges and rating cards">
                    {/* 1. Amber Heart/Pulse 3D Badge */}
                    <div
                        className="hero-3d-badge hero-3d-badge--heart"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Health & wellness' }));
                            handleSearch('Health & wellness');
                        }}
                        title="Filter Health & Wellness Specialists"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#F59E0B" className="badge-icon badge-icon-heart" aria-hidden="true">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            <polyline points="3,11 8,11 10,7 13,15 15,9 17,11 21,11" fill="none" stroke="#161c24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* 2. Cyan Crossed Tools 3D Badge */}
                    <div
                        className="hero-3d-badge hero-3d-badge--tools"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Home services' }));
                            handleSearch('Home services');
                        }}
                        title="Filter Home Services & Repairs"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#2DD4BF" className="badge-icon badge-icon-tools" aria-hidden="true">
                            <path d="M19.7 4.3c-.4-.4-1-.4-1.4 0l-3.3 3.3 1.4 1.4 3.3-3.3c.4-.4.4-1 0-1.4zM13.6 9l-7.4 7.4c-.4.4-.6.9-.6 1.4v1.7c0 .6.4 1 1 1h1.7c.5 0 1-.2 1.4-.6l7.4-7.4-3.5-3.5z" />
                            <path d="M4.3 4.3c-1.6 1.6-1.8 4-.6 5.8l2.1-2.1c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-2.1 2.1c1.8 1.2 4.2 1 5.8-.6l6.8 6.8c.8.8 2.1.8 2.8 0 .8-.8.8-2.1 0-2.8l-6.8-6.8c1.6-1.6 1.8-4 .6-5.8l-2.1 2.1c-.4.4-1 .4-1.4 0-.4-.4-.4-1 0-1.4l2.1-2.1c-1.8-1.2-4.2-1-5.8.6z" />
                        </svg>
                    </div>

                    {/* 3. Cyan Dumbbell 3D Badge */}
                    <div
                        className="hero-3d-badge hero-3d-badge--dumbbell"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Fitness' }));
                            handleSearch('Fitness');
                        }}
                        title="Filter Fitness & Coaching"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#38BDF8" className="badge-icon badge-icon-dumbbell" aria-hidden="true">
                            <rect x="3" y="8" width="2" height="8" rx="1" />
                            <rect x="6" y="6" width="3" height="12" rx="1.5" />
                            <rect x="9" y="10.5" width="6" height="3" rx="1" />
                            <rect x="15" y="6" width="3" height="12" rx="1.5" />
                            <rect x="19" y="8" width="2" height="8" rx="1" />
                        </svg>
                    </div>

                    {/* 4. Mint House 3D Badge (Top Right) */}
                    <div
                        className="hero-3d-badge hero-3d-badge--house"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Home Deep Cleaning' }));
                            handleSearch('Home Deep Cleaning');
                        }}
                        title="Filter Home Cleaning & House Services"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#2DD4BF" className="badge-icon badge-icon-house" aria-hidden="true">
                            <path d="M17 5h2v4.5l-2-1.7V5z" />
                            <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h3L12 3z" />
                        </svg>
                    </div>

                    {/* 5. Amber Open Book 3D Badge */}
                    <div
                        className="hero-3d-badge hero-3d-badge--book"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Consulting' }));
                            handleSearch('Consulting');
                        }}
                        title="Filter Advisory & Consulting"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#F59E0B" className="badge-icon badge-icon-book" aria-hidden="true">
                            <path d="M12 6.5C10.5 5 8.5 4.5 6 4.5c-2 0-3.5.5-4 1v12.5c.5-.5 2-1 4-1 2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2 2 0 3.5.5 4 1V5.5c-.5-.5-2-1-4-1-2.5 0-4.5.5-6 2zm0 11.5c-1.5-1-3.5-1.5-6-1.5-1.5 0-2.8.3-3.5.7V6.8c.7-.4 2-.8 3.5-.8 2 0 4 .5 6 1.8v10.2z" />
                        </svg>
                    </div>

                    {/* 6. Mini House 3D Badge (Beside Doctor) */}
                    <div
                        className="hero-3d-badge hero-3d-badge--mini-house"
                        onClick={() => {
                            setSearch(prev => ({ ...prev, service: 'Home Deep Cleaning' }));
                            handleSearch('Home Deep Cleaning');
                        }}
                        title="Filter Home Cleaning Services"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="#2DD4BF" className="badge-icon badge-icon-mini-house" aria-hidden="true">
                            <path d="M17 5h2v4.5l-2-1.7V5z" />
                            <path d="M12 3L2 12h3v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h3L12 3z" />
                        </svg>
                    </div>

                    {/* 7. Star Ratings 4-Star 3D Speech Card (Left, above Doctor) */}
                    <div className="hero-3d-card hero-3d-card--rating-left">
                        <span className="rating-card-label">Star Ratings</span>
                        <div className="rating-card-stars">
                            <Star size={11} fill="#F59E0B" stroke="none" />
                            <Star size={11} fill="#F59E0B" stroke="none" />
                            <Star size={11} fill="#F59E0B" stroke="none" />
                            <Star size={11} fill="#F59E0B" stroke="none" />
                            <Star size={11} fill="#4B5563" stroke="none" />
                        </div>
                        <div className="card-speech-tail card-speech-tail--left" aria-hidden="true" />
                    </div>

                    {/* 8. Star Ratings 5.0 3D Speech Card (Center, above Plumber & Trainer) */}
                    <div className="hero-3d-card hero-3d-card--rating-center">
                        <span className="rating-card-label">Star Ratings</span>
                        <div className="rating-card-row">
                            <span className="rating-card-score">5.0</span>
                            <div className="rating-card-stars">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={11} fill="#F59E0B" stroke="none" />
                                ))}
                            </div>
                        </div>
                        <div className="card-speech-tail card-speech-tail--center" aria-hidden="true" />
                    </div>

                    {/* 9. Highly Rated! 3D Speech Card (Right, above Engineer & Aesthetician) */}
                    <div className="hero-3d-card hero-3d-card--highly-rated">
                        <div className="highly-rated-main">
                            <div className="highly-rated-avatar-main">
                                <img
                                    src={CURATED_PROVIDER_PORTRAITS[0]}
                                    alt="Doctor Specialist"
                                    className="highly-rated-avatar-img"
                                />
                                <span className="highly-rated-online-dot" />
                            </div>
                            <div className="highly-rated-content">
                                <span className="highly-rated-title">Highly Rated!</span>
                                <span className="highly-rated-sub">Verified professionals near you</span>
                            </div>
                            <div className="highly-rated-stack">
                                <img src={CURATED_PROVIDER_PORTRAITS[1]} alt="" className="stack-img stack-1" />
                                <img src={CURATED_PROVIDER_PORTRAITS[6]} alt="" className="stack-img stack-2" />
                                <img src={CURATED_PROVIDER_PORTRAITS[10]} alt="" className="stack-img stack-3" />
                            </div>
                        </div>
                        <div className="card-speech-tail card-speech-tail--right" aria-hidden="true" />
                    </div>

                    {/* 10. Social Proof Sub-Pill ("Trusted by 10k+ users in Lucknow") */}
                    <div className="hero-3d-card hero-3d-card--social-proof">
                        <span>Trusted by 10k+ users in Lucknow</span>
                    </div>

                    {/* 11. Mini Map Route Pin Badge (Floating near Delivery Technician) */}
                    <div
                        className="hero-3d-badge hero-3d-badge--mini-map"
                        onClick={handleOpenMapFlow}
                        title="Interactive GPS Map"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 36 32" width="28" height="26" fill="none" className="badge-icon badge-icon-mini-map" aria-hidden="true">
                            <rect width="36" height="32" rx="6" fill="#18202A" />
                            <path d="M4 22 L14 14 L22 18 L32 8" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                            <circle cx="14" cy="14" r="2" fill="#2DD4BF" />
                            <path d="M22 6 C19.8 6 18 7.8 18 10 C18 13.5 22 17 22 17 C22 17 26 13.5 26 10 C26 7.8 24.2 6 22 6 Z" fill="#EF4444" />
                            <circle cx="22" cy="10" r="1.5" fill="#FFFFFF" />
                        </svg>
                    </div>

                    {/* 12. Bottom Right Dark 3D Map Mesh Card */}
                    <div
                        className="hero-3d-card hero-3d-card--map-widget"
                        onClick={handleOpenMapFlow}
                        title="Open Interactive Map"
                        role="button"
                        tabIndex={0}
                    >
                        <svg viewBox="0 0 84 84" width="84" height="84" className="map-widget-svg" aria-hidden="true">
                            <line x1="0" y1="28" x2="84" y2="28" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <line x1="0" y1="56" x2="84" y2="56" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <line x1="28" y1="0" x2="28" y2="84" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <line x1="56" y1="0" x2="56" y2="84" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <path d="M8 68 L36 50 L50 56 L76 22" stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 68 L36 50 L50 56 L76 22" stroke="#2DD4BF" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
                            <circle cx="36" cy="50" r="3.5" fill="#F59E0B" />
                            <g transform="translate(36, 18)">
                                <path d="M12 2 C7.6 2 4 5.6 4 10 C4 16 12 24 12 24 C12 24 20 16 20 10 C20 5.6 16.4 2 12 2 Z" fill="#E2892F" />
                                <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
                            </g>
                        </svg>
                    </div>

                    {/* 13. Bottom Right Sparkle */}
                    <div className="hero-3d-sparkle" aria-hidden="true">
                        <Sparkles size={24} />
                    </div>
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== PROVIDERS : NUMBERED LEDGER LIST ===== */}
            <section id="providers">
                <div className="wrap">
                    <div className="section-head providers-section-head">
                        <h2>
                            Top-rated <em>professionals</em> near you
                        </h2>
                        <p>
                            Verified providers, ranked by relevance to your search.
                        </p>
                    </div>

                            {loadingProviders ? (
                                <div className="provider-grid">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="provider-grid-card provider-grid-card--skeleton">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                                <Skeleton variant="circle" width="48px" height="48px" />
                                                <div style={{ flex: 1 }}>
                                                    <Skeleton variant="text" width="65%" height="18px" style={{ marginBottom: '6px' }} />
                                                    <Skeleton variant="text" width="45%" height="13px" />
                                                </div>
                                            </div>
                                            <Skeleton variant="rect" width="70px" height="22px" style={{ borderRadius: '6px', marginBottom: '14px' }} />
                                            <Skeleton variant="text" width="80%" height="14px" style={{ marginBottom: '20px' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <Skeleton variant="text" width="60px" height="20px" />
                                                <Skeleton variant="rect" width="80px" height="32px" style={{ borderRadius: '8px' }} />
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
                                        onClick={() => setShowLocationMap(true)}
                                        style={{ borderColor: 'var(--amber)', color: 'var(--amber)', cursor: 'pointer', padding: '8px 18px' }}
                                    >
                                        <MapPin size={13} style={{ marginRight: '6px' }} />
                                        <span>Change Location Hub</span>
                                    </button>
                                </div>
                            ) : (
                                (() => {
                                    const totalPages = Math.ceil(filteredProviders.length / ITEMS_PER_PAGE);
                                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                    const paginatedProviders = filteredProviders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                                    return (
                                        <>
                                            <div className="provider-grid">
                                                {paginatedProviders.map((p, index) => {
                                                    const globalIndex = startIndex + index + 1;
                                                    const minPrice = p.providerProfile?.services?.length > 0
                                                        ? Math.min(...p.providerProfile.services.map(s => s.price))
                                                        : (p.price || 500);
                                                    const initials = getInitials(p.name);
                                                    const avatarBg = getAvatarBg(p.name, globalIndex);
                                                    const formattedPrice = minPrice ? Number(minPrice).toLocaleString('en-IN') : '500';
                                                    const rawRating = p.providerProfile?.rating ?? p.rating;
                                                    const reviewsCount = p.providerProfile?.reviewsCount ?? p.reviewsCount ?? 0;
                                                    const ratingDisplay = (rawRating && Number(rawRating) > 0)
                                                        ? Number(rawRating).toFixed(1)
                                                        : (reviewsCount > 0 ? '5.0' : 'New');
                                                    const locationDisplay = p.location || p.city || p.providerProfile?.location || 'Delhi';

                                                    return (
                                                        <div
                                                            key={p.id}
                                                            className="provider-grid-card"
                                                            onClick={() => navigate(`/provider/${p.id}`)}
                                                        >
                                                            {/* Top Row: Avatar & Specialist Info */}
                                                            <div className="provider-card-header">
                                                                <div className="provider-card-avatar">
                                                                    <img
                                                                        src={getProviderAvatar(p, globalIndex)}
                                                                        alt={p.name}
                                                                        className="provider-card-avatar-img"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                                <div className="provider-card-info">
                                                                    <h3 className="provider-card-name" title={p.name}>
                                                                        {p.name}
                                                                    </h3>
                                                                    <p className="provider-card-specialty" title={p.providerProfile?.specialty || 'Specialist'}>
                                                                        {p.providerProfile?.specialty || 'Verified Specialist'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Verified Badge */}
                                                            <div className="provider-card-badge-row">
                                                                <span className="provider-verified-badge">
                                                                    <Check size={11} strokeWidth={2.5} />
                                                                    <span>Verified</span>
                                                                </span>
                                                            </div>

                                                            {/* Location & Rating */}
                                                            <div className="provider-card-meta-row">
                                                                <div className="provider-card-location">
                                                                    <MapPin size={13} strokeWidth={2} />
                                                                    <span>{locationDisplay}</span>
                                                                </div>
                                                                {reviewsCount > 0 ? (
                                                                    <div className="provider-card-rating">
                                                                        <Star size={12} fill="#E2892F" stroke="none" />
                                                                        <span>{ratingDisplay}</span>
                                                                        <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '2px' }}>({reviewsCount})</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="provider-card-rating provider-card-rating--new" title="New specialist on Appointly">
                                                                        <Sparkles size={12} fill="#E2892F" stroke="none" />
                                                                        <span>New Specialist</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Footer: Price + Book Button */}
                                                            <div className="provider-card-footer">
                                                                <div className="provider-card-price-group">
                                                                    <span className="provider-price-label">Starting from</span>
                                                                    <div className="provider-price-amt">
                                                                        <span className="currency">₹</span>
                                                                        <span className="amount">{formattedPrice}</span>
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="provider-card-book-btn"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(`/provider/${p.id}`);
                                                                    }}
                                                                >
                                                                    Book
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

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

                                                        {getPaginationItems(currentPage, totalPages).map((item, idx) => {
                                                            if (typeof item === 'string' && item.startsWith('ellipsis')) {
                                                                return (
                                                                    <span key={`ellipsis-${idx}`} className="home-page-ellipsis">
                                                                        ···
                                                                    </span>
                                                                );
                                                            }

                                                            const pageNum = item;
                                                            return (
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
                                                            );
                                                        })}

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
            </section>

            <div className="divider"></div>

            {/* ===== TRUST STRIP (DIVIDED COLUMN STRIP) ===== */}
            <section className="home-trust-section">
                <div className="wrap">
                    <div className="section-head center">
                        <span className="eyebrow"><span className="dot"></span>Appointly trust promise</span>
                        <h2>Why clients choose Appointly</h2>
                        <p>Verified provider credentials, price transparency, and guaranteed service satisfaction.</p>
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
                </div>
            </section>

            <div className="divider"></div>

            {/* ===== TESTIMONIALS (ONLY SHOWN IF AUTHENTIC REVIEWS EXIST) ===== */}
            {testimonials && testimonials.length > 0 && (
                <>
                    <section>
                        <div className="wrap">
                            <div className="section-head center">
                                <span className="eyebrow"><span className="dot" style={{ background: 'var(--teal)' }}></span>Client reviews</span>
                                <h2>Verified feedback</h2>
                                <p>Authentic reviews from completed client appointments.</p>
                            </div>
                        </div>

                        <div className="wrap">
                            <div className="home-testimonials-grid">
                                {testimonials.slice(0, 10).map((tItem, i) => (
                                    <ReviewCard key={tItem.id || i} review={tItem} />
                                ))}
                            </div>
                        </div>
                    </section>
                    <div className="divider"></div>
                </>
            )}

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
                        ) : !isAuthenticated ? (
                            <div className="feedback-auth-required-box" style={{ textAlign: 'center', padding: '16px 8px' }}>
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '50%',
                                    background: 'rgba(226, 137, 47, 0.1)',
                                    color: 'var(--amber)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <ShieldCheck size={26} />
                                </div>
                                <h3 className="serif" style={{ fontSize: '22px', color: 'var(--paper)', margin: '0 0 10px' }}>
                                    Verified Client Reviews Only
                                </h3>
                                <p style={{ color: 'var(--paper-dim)', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 22px', lineHeight: 1.55 }}>
                                    To protect our community from spam and ensure 100% authentic feedback, only registered clients can post public platform reviews.
                                </p>
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => navigate('/login', { state: { from: { pathname: '/' } } })}
                                    style={{
                                        borderColor: 'var(--amber)',
                                        color: 'var(--amber)',
                                        padding: '10px 24px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        margin: '0 auto',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span>Sign In to Leave Feedback</span>
                                    <span>→</span>
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleReviewSubmit}>
                                <div style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Posting as:</span>
                                    <strong style={{ fontSize: '14px', color: 'var(--paper)' }}>{user?.name || 'Verified Client'}</strong>
                                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Verified</span>
                                </div>

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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label className="field-label" style={{ marginBottom: 0 }}>Your feedback</label>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted, #888)' }}>{reviewForm.comment.length} / 500</span>
                                </div>
                                <textarea
                                    className="form-textarea"
                                    placeholder="How was your experience using our platform? (Max 500 chars)"
                                    value={reviewForm.comment}
                                    maxLength={500}
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
                            <Link to="/contact">Contact</Link>
                        </div>

                        <div className="footer-col">
                            <h4>Support</h4>
                            <Link to="/contact">Help center</Link>
                            <Link to="/terms">Terms</Link>
                            <Link to="/privacy">Privacy</Link>
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
                        providers={[]}
                        initialLocation={clientLocation}
                        initialFilters={{ service: search.service, maxPrice: search.maxPrice }}
                        currentLocationName={clientLocation ? clientLocation.name : search.location}
                        onSelectLocation={(loc, coords) => {
                            if (!loc) {
                                handleClearLocation();
                                return;
                            }
                            if (typeof loc === 'object' && loc.lat && loc.lng) {
                                handleSelectLocation(loc);
                                return;
                            }
                            const newLoc = coords
                                ? { lat: coords.lat, lng: coords.lng, name: typeof loc === 'string' ? loc : 'Selected Location', city: typeof loc === 'string' ? loc : 'Selected Location' }
                                : { lat: 28.6304, lng: 77.2177, name: typeof loc === 'string' ? loc : 'Selected Location', city: typeof loc === 'string' ? loc : 'Selected Location' };
                            handleSelectLocation(newLoc);
                        }}
                    />
                )}
            </Suspense>
        </div>
    );
}
