import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Search, MapPin, User, Tag } from 'lucide-react';
import Button from '../../components/ui/Button/Button';
import Card from '../../components/ui/Card/Card';
import Badge from '../../components/ui/Badge/Badge';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import Navbar from '../../components/ui/Navbar/Navbar';
import { useAuth } from '../../context/AuthContext';
import { providerApi } from '../../api/providers';
import { statsApi, siteReviewApi } from '../../api/stats';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import './Home.css';

/* ── Animated counter hook ── */
function useCounter(target, duration = 2000, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, start]);
    return count;
}

/* ── Data ── */
const NAV_LINKS = [
    { label: 'Home', href: '#', active: true },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Services', href: '#services' },
    { label: 'Providers', href: '#providers-list' },
    { label: 'About', to: '/about' },
];

const SERVICES = [
    { icon: '🏥', title: 'Health & Wellness', desc: 'Doctors, therapists, nutritionists', count: '1.2k+', color: 'var(--color-health)' },
    { icon: '💇', title: 'Beauty & Spa', desc: 'Salons, barbers, nail artists', count: '800+', color: 'var(--color-beauty)' },
    { icon: '🏠', title: 'Home Services', desc: 'Plumbers, electricians, cleaners', count: '600+', color: 'var(--color-home)' },
    { icon: '🏋️', title: 'Fitness', desc: 'Personal trainers, yoga, pilates', count: '450+', color: 'var(--color-fitness)' },
    { icon: '⚖️', title: 'Legal & Finance', desc: 'Lawyers, accountants, advisors', count: '300+', color: 'var(--color-legal)' },
    { icon: '📚', title: 'Education', desc: 'Tutors, coaches, mentors', count: '700+', color: 'var(--color-edu)' },
];

const STEPS = [
    { num: '01', icon: '🔍', title: 'Search', desc: 'Find the perfect professional by service or location.' },
    { num: '02', icon: '📅', title: 'Book', desc: 'Pick an available slot and confirm in seconds — no phone calls.' },
    { num: '03', icon: '✅', title: 'Get Served', desc: 'Receive a confirmation, reminders, and show up worry-free.' },
];

const TESTIMONIALS = [
    { name: 'Priya Sharma', role: 'Booked a dermatologist', avatar: '👩🏽', text: '"Finding and booking Dr. Mehta took less than 2 minutes. Super smooth experience!"', rating: 5 },
    { name: 'Arjun Verma', role: 'Booked a personal trainer', avatar: '👨🏻', text: '"I love that I can see real-time availability and cancel if needed. Game changer."', rating: 5 },
    { name: 'Neha Gupta', role: 'Booked a salon', avatar: '👩🏼', text: '"Saved me so much time. The reminders are a great touch — never missed an appointment."', rating: 4 },
];

/* ── Component ── */
export default function Home() {
    const { user, logout, isAuthenticated } = useAuth();
    const [search, setSearch] = useState({ service: '', location: '', name: '', maxPrice: '' });
    const [providers, setProviders] = useState([]);
    const [filteredProviders, setFilteredProviders] = useState([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [testimonials, setTestimonials] = useState([]);
    const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccess, setReviewSuccess] = useState(false);
    const navigate = useNavigate();
    const statsRef = useRef(null);
    const providerScrollRef = useRef(null);
    const [statsVisible, setStatsVisible] = useState(false);
    const [stats, setStats] = useState({ providersCount: 0, bookingsCompleted: 0, citiesCount: 0 });

    const actualProvidersTarget = stats.providersCount || providers.length || 0;
    const providersCount = useCounter(actualProvidersTarget, 1500, statsVisible);
    const bookingsCount = useCounter(stats.bookingsCompleted || 0, 2000, statsVisible);
    const citiesCount = useCounter(stats.citiesCount || 0, 1500, statsVisible);

    const getServiceCount = (title) => {
        if (!providers.length) return 0;
        const categoryMap = {
            'Health & Wellness': ['Dentist', 'Doctor', 'Therapist', 'Health', 'Wellness', 'Medicine'],
            'Beauty & Spa': ['Salon', 'Barber', 'Beauty', 'Spa', 'Nail', 'Hair'],
            'Home Services': ['Plumber', 'Electrician', 'Cleaner', 'Home', 'Repair'],
            'Fitness': ['Fitness', 'Yoga', 'Trainer', 'Gym'],
            'Legal & Finance': ['Legal', 'Finance', 'Accountant', 'Lawyer', 'Consultant'],
            'Education': ['Education', 'Tutor', 'Coach', 'Teacher', 'Specialist']
        };
        const keywords = categoryMap[title] || [title];
        return providers.filter(p => {
            const spec = p.providerProfile?.specialty?.toLowerCase() || '';
            return keywords.some(k => spec.includes(k.toLowerCase()));
        }).length;
    };

    // Fetch all providers on load
    useEffect(() => {
        providerApi.getAll()
            .then(data => {
                setProviders(data);
                setFilteredProviders(data);
                setLoadingProviders(false);
            })
            .catch(() => setLoadingProviders(false));

        // Fetch public stats
        statsApi.getPublicStats()
            .then(data => setStats(data))
            .catch(err => console.error('Failed to fetch stats:', err));

        // Fetch testimonials
        statsApi.getSiteReviews()
            .then(data => setTestimonials(data))
            .catch(err => console.error('Failed to fetch testimonials:', err));
    }, []);

    // Search/filter providers
    const handleSearch = async (keywordOverride, locOverride) => {
        setLoadingProviders(true);
        try {
            const keyword = keywordOverride !== undefined ? keywordOverride : search.service;
            const loc = locOverride !== undefined ? locOverride : search.location;
            const name = search.name;
            const price = search.maxPrice;

            const data = await providerApi.getAll(keyword, '', loc, '', name, price);
            setFilteredProviders(data);

            // Scroll to providers list
            const el = document.getElementById('providers-list');
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

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            const token = localStorage.getItem('token');
            await siteReviewApi.create(reviewForm, token);
            setReviewSuccess(true);
            setReviewForm({ name: '', rating: 5, comment: '' });
            // Refresh testimonials
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

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
            { threshold: 0.4 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="home">
            {/* ── Navbar ── */}
            <Navbar
                logo={<span className="home-logo">Appointly</span>}
                links={NAV_LINKS}
                actions={
                    isAuthenticated ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <ThemeToggle />
                            <div className="navbar__user-profile" onClick={() => navigate(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/client')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="sidebar__avatar" style={{ width: '38px', height: '38px', fontSize: '1.2rem', margin: 0 }}>
                                    {user.role === 'provider' ? '🧑‍💼' : '🙋'}
                                </div>
                                <span className="text-bold" style={{ fontSize: '0.9rem' }}>{user.name.split(' ')[0]}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>Logout</Button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <ThemeToggle />
                            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
                            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Sign up free</Button>
                        </div>
                    )
                }
            />

            {/* ── Hero ── */}
            <section className="hero">
                <div className="hero__bg-mesh" aria-hidden="true" />
                <div className="hero__content animate-fade-in">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <Badge variant="primary">🎉 Now in {stats.citiesCount || 10}+ cities</Badge>
                    </motion.div>
                    <motion.h1
                        className="hero__headline"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                    >
                        Book any service,<br />
                        <span className="hero__highlight text-gradient">anywhere, anytime.</span>
                    </motion.h1>
                    <motion.p
                        className="hero__sub"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        Connect with thousands of verified professionals —
                        health, beauty, home, fitness &amp; more.
                    </motion.p>

                    {/* Search bar */}
                    <motion.div
                        className="hero__search-bar"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <div className="hero__search-field">
                            <Search size={18} className="hero__search-icon-svg" />
                            <input
                                type="text"
                                placeholder="Service"
                                value={search.service}
                                onChange={(e) => setSearch({ ...search, service: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="hero__search-input"
                            />
                        </div>
                        <div className="hero__search-divider" />
                        <div className="hero__search-field">
                            <MapPin size={18} className="hero__search-icon-svg" />
                            <input
                                type="text"
                                placeholder="Location"
                                value={search.location}
                                onChange={(e) => setSearch({ ...search, location: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="hero__search-input"
                            />
                        </div>
                        <div className="hero__search-divider" />
                        <div className="hero__search-field">
                            <User size={18} className="hero__search-icon-svg" />
                            <input
                                type="text"
                                placeholder="Provider Name"
                                value={search.name}
                                onChange={(e) => setSearch({ ...search, name: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="hero__search-input"
                            />
                        </div>
                        <div className="hero__search-divider" />
                        <div className="hero__search-field">
                            <Tag size={18} className="hero__search-icon-svg" />
                            <input
                                type="number"
                                placeholder="Max Price (₹)"
                                value={search.maxPrice}
                                onChange={(e) => setSearch({ ...search, maxPrice: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="hero__search-input"
                            />
                        </div>
                        <Button
                            variant="primary"
                            className="hero__search-btn"
                            onClick={() => handleSearch()}
                        >
                            Search
                        </Button>
                    </motion.div>

                    <p className="hero__popular">
                        Popular:
                        {SERVICES.slice(0, 4).map((svc) => (
                            <button
                                key={svc.title}
                                className="hero__tag glass"
                                onClick={() => {
                                    setSearch({ ...search, service: svc.title });
                                    handleSearch(svc.title);
                                }}
                            >
                                {svc.icon} {svc.title}
                            </button>
                        ))}
                    </p>
                </div>

                {/* Floating cards */}
                <div className="hero__float hero__float--1" aria-hidden="true">
                    <span>✅</span> Verified Pros
                </div>
                <div className="hero__float hero__float--2" aria-hidden="true">
                    <span>⭐</span> 4.9 avg. rating
                </div>
                <div className="hero__float hero__float--3" aria-hidden="true">
                    <span>💎</span> Premium Service
                </div>
            </section>

            {/* ── Live Providers ── */}
            <section className="section" id="providers-list">
                <div className="section__header">
                    <Badge variant="primary">Browse Professionals</Badge>
                    <h2 className="section__title">Our Providers</h2>
                    <p className="section__sub">Click on any provider to view their profile and book an appointment.</p>
                </div>
                {loadingProviders ? (
                    <div className="providers-scroll-container">
                        <div className="providers-scroll-inner">
                            {Array(6).fill(0).map((_, i) => (
                                <Card key={i} variant="default" className="provider-card skeleton-card">
                                    <Skeleton variant="circle" width="48px" height="48px" style={{ marginBottom: '1rem' }} />
                                    <Skeleton variant="text" width="80%" height="1.5rem" style={{ marginBottom: '0.5rem' }} />
                                    <Skeleton variant="text" width="60%" height="1rem" style={{ marginBottom: '1rem' }} />
                                    <Skeleton variant="text" width="90%" height="1.2rem" />
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : filteredProviders.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No providers found. Try a different search.</p>
                ) : (
                    <div className="providers-scroll-container" ref={providerScrollRef}>
                        <div className="providers-scroll-inner">
                            {filteredProviders.map(p => (
                                <Card
                                    key={p.id}
                                    variant="default"
                                    className="provider-card"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/provider/${p.id}`)}
                                >
                                    <div className="provider-card__cover">
                                        <div className="provider-card__avatar">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="provider-card__badge-wrapper">
                                            <Badge variant="success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>✓ Verified</Badge>
                                        </div>
                                    </div>
                                    <div className="provider-card__body">
                                        <h3 className="provider-card__name">{p.name}</h3>
                                        <p className="provider-card__specialty">{p.providerProfile?.specialty || 'Professional'}</p>

                                        <div className="provider-card__meta">
                                            {p.providerProfile?.location && (
                                                <span className="provider-meta-item">📍 {p.providerProfile.location}</span>
                                            )}
                                            <span className="provider-meta-item">⭐ {p.providerProfile?.rating ?? 4.9}</span>
                                        </div>
                                    </div>
                                    <div className="provider-card__footer">
                                        <Button variant="outline" size="sm" style={{ padding: '0.4rem 1rem' }}>Book</Button>
                                        {p.providerProfile?.services?.length > 0 && (
                                            <div className="provider-price">
                                                <span className="provider-price-label">From</span>
                                                <span className="provider-price-value">₹{Math.min(...p.providerProfile.services.map(s => s.price))}</span>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </section>


            {/* ── How It Works ── */}
            <section className="section" id="how-it-works">
                <div className="section__header">
                    <Badge variant="primary">Simple process</Badge>
                    <h2 className="section__title">How it works</h2>
                    <p className="section__sub">Three easy steps to your next appointment.</p>
                </div>

                <div className="steps">
                    {STEPS.map((step, i) => (
                        <motion.div
                            key={step.num}
                            className="step"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <div className="step__num">{step.num}</div>
                            <div className="step__icon">{step.icon}</div>
                            <h3 className="step__title">{step.title}</h3>
                            <p className="step__desc">{step.desc}</p>
                            {i < STEPS.length - 1 && <div className="step__arrow" aria-hidden="true">→</div>}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── Services ── */}
            <section className="section section--alt" id="services">
                <div className="section__header">
                    <Badge variant="info">Browse categories</Badge>
                    <h2 className="section__title">Explore services</h2>
                    <p className="section__sub">Hundreds of skilled professionals across every category.</p>
                </div>

                <div className="services-grid">
                    {SERVICES.map((svc, i) => {
                        const count = getServiceCount(svc.title);
                        return (
                            <Card
                                key={svc.title}
                                variant="default"
                                hover
                                animate
                                delay={i * 0.05}
                                className="service-card"
                                style={{ '--svc-color': svc.color, cursor: 'pointer' }}
                                onClick={() => {
                                    setSearch({ ...search, service: svc.title });
                                    handleSearch(svc.title);
                                }}
                            >
                                <div className="service-card__icon">{svc.icon}</div>
                                <h3 className="service-card__title">{svc.title}</h3>
                                <p className="service-card__desc">{svc.desc}</p>
                                <span className="service-card__count">{count} provider{count !== 1 ? 's' : ''}</span>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="section" id="testimonials">
                <div className="section__header">
                    <Badge variant="success">What people say</Badge>
                    <h2 className="section__title">Loved by thousands</h2>
                    <p className="section__sub">Real reviews from real customers.</p>
                </div>

                <div className="testimonials">
                    {testimonials.length > 0 ? (
                        testimonials.map((t, i) => (
                            <Card
                                key={t.id}
                                variant="elevated"
                                animate
                                delay={i * 0.1}
                                className="testimonial-card"
                            >
                                <div className="testimonial-card__stars">
                                    {'⭐'.repeat(t.rating)}
                                </div>
                                <p className="testimonial-card__text">"{t.text}"</p>
                                <div className="testimonial-card__author">
                                    <span className="testimonial-card__avatar">{t.avatar}</span>
                                    <div>
                                        <div className="testimonial-card__name">{t.name}</div>
                                        <div className="testimonial-card__role">{t.role}</div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-light)', width: '100%' }}>No reviews yet. Be the first to share your experience!</p>
                    )}
                </div>
            </section>

            {/* ── Share Your Experience ── */}
            <section className="section section--alt" id="feedback">
                <div className="section__header">
                    <Badge variant="primary">Share Your Story</Badge>
                    <h2 className="section__title">Help us grow</h2>
                    <p className="section__sub">Tell us how Appointly has helped you. We value your feedback!</p>
                </div>

                <div className="review-form-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <Card variant="default" style={{ padding: '2rem' }}>
                        {reviewSuccess ? (
                            <div style={{ textAlign: 'center', padding: '1rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                                <h3 style={{ marginBottom: '0.5rem' }}>Thank you!</h3>
                                <p style={{ color: 'var(--text-light)' }}>Your feedback means the world to us.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleReviewSubmit}>
                                {!isAuthenticated && (
                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-bold)' }}>Your Name</label>
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={reviewForm.name}
                                            onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                            required={!isAuthenticated}
                                        />
                                    </div>
                                )}
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-bold)' }}>Rating</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    fontSize: '1.5rem',
                                                    cursor: 'pointer',
                                                    color: star <= reviewForm.rating ? '#ffb800' : '#e2e8f0'
                                                }}
                                            >
                                                ⭐
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-bold)' }}>Your Feedback</label>
                                    <textarea
                                        rows="4"
                                        placeholder="How was your experience using our website?"
                                        value={reviewForm.comment}
                                        onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none' }}
                                        required
                                    ></textarea>
                                </div>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    style={{ width: '100%' }}
                                    disabled={submittingReview}
                                >
                                    {submittingReview ? 'Submitting...' : 'Post Review'}
                                </Button>
                            </form>
                        )}
                    </Card>
                </div>
            </section>

            {/* ── About Us ── */}
            <section className="section" id="about">
                <div className="section__header">
                    <Badge variant="primary">Our Mission</Badge>
                    <h2 className="section__title">About Our Company</h2>
                    <p className="section__sub" style={{ maxWidth: '800px', lineHeight: '1.8' }}>
                        At Appointly, we believe that accessing quality services should be effortless.
                        Founded with a vision to connect talented professionals with people who need them,
                        we have built a platform that simplifies scheduling, builds trust through transparent reviews,
                        and empowers local businesses to thrive in the digital age.
                        Whether you are looking for a quick haircut, a reliable plumber, or a long-term business consultant,
                        we are here to make that connection happen instantly.
                    </p>
                </div>
            </section>

            {/* ── Provider CTA ── */}
            <section className="cta-banner" id="providers">
                <div className="cta-banner__bg" aria-hidden="true" />
                <div className="cta-banner__content">
                    <h2 className="cta-banner__title">Are you a service provider?</h2>
                    <p className="cta-banner__sub">
                        Join 5,000+ professionals growing their business on Appointly.
                        Set your hours, manage bookings, and get paid — all in one place.
                    </p>
                    <div className="cta-banner__actions">
                        <Button variant="primary" size="lg" onClick={() => navigate('/signup?role=provider')}>Join as a Provider</Button>
                        <Button variant="outline" size="lg" className="cta-banner__learn" onClick={() => {
                            const el = document.getElementById('how-it-works');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}>Learn more →</Button>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="footer">
                <div className="footer__brand">
                    <span className="home-logo">Appointly</span>
                    <p>Making appointments effortless.</p>
                </div>
                <div className="footer__links">
                    {[
                        {
                            heading: 'Product',
                            links: [
                                { label: 'Features', href: '#how-it-works' },
                                { label: 'Providers', href: '#providers-list' },
                                { label: 'Services', href: '#services' }
                            ]
                        },
                        {
                            heading: 'Company',
                            links: [
                                { label: 'About', href: '#about' },
                                { label: 'Feedback', href: '#feedback' },
                                { label: 'Join Us', href: '#providers' }
                            ]
                        },
                        {
                            heading: 'Support',
                            links: [
                                { label: 'Help Center', href: '#' },
                                { label: 'Terms', href: '/terms' },
                                { label: 'Privacy', href: '/privacy' }
                            ]
                        },
                    ].map((col) => (
                        <div key={col.heading} className="footer__col">
                            <span className="footer__col-heading">{col.heading}</span>
                            {col.links.map((l) => (
                                <a key={l.label} href={l.href} className="footer__link">{l.label}</a>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="footer__bottom">
                    <span>© 2026 Appointly. All rights reserved.</span>
                </div>
            </footer>
        </div>
    );
}
