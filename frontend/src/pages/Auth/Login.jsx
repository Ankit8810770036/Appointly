import { useState, useEffect } from 'react';
import { Mail, Lock, Sparkles, CheckCircle2, ShieldCheck, Zap, MessageSquare, User, Star, Briefcase, Shield, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { GoogleLogin } from '@react-oauth/google';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { play } = useSound();

    const from = location.state?.from?.pathname || null;

    const query = new URLSearchParams(location.search);
    const isExpired = query.get('expired') === 'true';

    const [pendingBooking] = useState(() => {
        try {
            const saved = sessionStorage.getItem('appointly_pending_booking');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [form, setForm] = useState({ email: '', password: '', role: 'client', rememberMe: true });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState(isExpired ? { _form: 'Your session has expired. Please log in again.' } : {});
    const [showRedirectMessage, setShowRedirectMessage] = useState(!!from && !pendingBooking);

    useEffect(() => {
        if (showRedirectMessage) {
            const timer = setTimeout(() => {
                setShowRedirectMessage(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showRedirectMessage]);

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const clearErrorOnBlur = (field) => () => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.email) {
            newErrors.email = 'Email address is required';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email)) {
                newErrors.email = 'Please enter a valid email address';
            }
        }

        if (!form.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});

        if (!validate()) {
            play('error');
            return;
        }

        setLoading(true);
        try {
            const { user, token, refreshToken } = await authApi.login(form.email, form.password, form.role);
            play('success');
            login(user, token, refreshToken, form.rememberMe);

            if (user?.latitude && user?.longitude) {
                try {
                    localStorage.setItem('appointly_client_location', JSON.stringify({
                        lat: user.latitude,
                        lng: user.longitude,
                        name: user.location || user.city || 'My Location',
                        city: user.city || user.location,
                        setAt: new Date().toISOString()
                    }));
                } catch {
                    // Ignore
                }
            }

            if (pendingBooking && pendingBooking.providerId) {
                navigate(`/provider/${pendingBooking.providerId}`, { replace: true });
            } else if (from) {
                navigate(from, { replace: true, state: { askLocation: true } });
            } else {
                const userRole = user?.role?.toLowerCase();
                if (userRole === 'admin') {
                    navigate('/dashboard/admin');
                } else if (userRole === 'provider') {
                    navigate('/dashboard/provider');
                } else {
                    navigate('/', { state: { askLocation: true, autoOpenMap: true } });
                }
            }
        } catch (err) {
            play('error');
            const msg = err.message || 'Login failed';
            if (msg.toLowerCase().includes('email')) {
                setErrors({ email: msg });
            } else if (msg.toLowerCase().includes('password')) {
                setErrors({ password: msg });
            } else {
                setErrors({ _form: msg });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setErrors({});
        try {
            const { user, token } = await authApi.googleLogin(credentialResponse.credential, form.role);
            play('success');
            login(user, token, form.rememberMe);

            if (user?.latitude && user?.longitude) {
                try {
                    localStorage.setItem('appointly_client_location', JSON.stringify({
                        lat: user.latitude,
                        lng: user.longitude,
                        name: user.location || user.city || 'My Location',
                        city: user.city || user.location,
                        setAt: new Date().toISOString()
                    }));
                } catch {
                    // Ignore
                }
            }

            const userRole = user?.role?.toLowerCase();
            if (userRole === 'provider' && user.isNewUser) {
                navigate('/signup', { state: { step: 2, form: user } });
                return;
            }

            if (pendingBooking && pendingBooking.providerId) {
                navigate(`/provider/${pendingBooking.providerId}`, { replace: true });
                return;
            }

            const destination = from || (userRole === 'admin'
                ? '/dashboard/admin'
                : userRole === 'provider'
                    ? '/dashboard/provider'
                    : '/');
            navigate(destination, { replace: true, state: { askLocation: userRole === 'client', autoOpenMap: userRole === 'client' } });
        } catch (err) {
            play('error');
            setErrors({ _form: err.message || 'Google login failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-glow-orb auth-glow-orb--amber"></div>
            <div className="auth-glow-orb auth-glow-orb--teal"></div>

            {/* Left Showcase Panel */}
            <div className="auth-panel auth-panel--brand">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-logo-badge">
                        <div className="auth-logo-icon">A</div>
                        <span className="auth-logo-text">Appointly</span>
                    </Link>

                    <div className="auth-brand-copy">
                        <h2>
                            Appointments, <em>reimagined.</em>
                        </h2>
                        <p>Sign in to manage confirmed bookings, interact via real-time chat, and discover top-rated verified professionals.</p>
                    </div>

                    {/* Interactive Live Appointment Preview Card */}
                    <div className="auth-preview-card">
                        <div className="auth-preview-top">
                            <div className="auth-preview-provider">
                                <div className="auth-preview-avatar"><User size={16} /></div>
                                <div>
                                    <div className="auth-preview-name">Dr. Maya Sharma</div>
                                    <div className="auth-preview-role">Wellness &amp; Health Specialist</div>
                                </div>
                            </div>
                            <span className="auth-preview-status">
                                <span className="auth-preview-pulse"></span>
                                Live Booking
                            </span>
                        </div>
                        <div className="auth-preview-bottom">
                            <span className="auth-preview-verified"><Star size={13} className="auth-preview-star" /> <strong>Verified Specialist</strong></span>
                            <span className="auth-preview-highlight auth-preview-highlight--amber">Confirmed: Today, 4:30 PM</span>
                        </div>
                    </div>

                    {/* Feature Highlights */}
                    <div className="auth-feature-tags">
                        <span className="auth-feature-tag"><Zap size={13} className="auth-tag-icon auth-tag-icon--amber" /> Instant Slot Confirmation</span>
                        <span className="auth-feature-tag"><MessageSquare size={13} className="auth-tag-icon auth-tag-icon--blue" /> Real-Time Chat &amp; Blue Ticks</span>
                        <span className="auth-feature-tag"><ShieldCheck size={13} className="auth-tag-icon auth-tag-icon--green" /> 100% Verified Profiles</span>
                    </div>

                    {/* Community highlights */}
                    <div className="auth-social-proof">
                        <div className="auth-avatars">
                            <span className="auth-avatar auth-avatar--1">AK</span>
                            <span className="auth-avatar auth-avatar--2">RS</span>
                            <span className="auth-avatar auth-avatar--3">MD</span>
                            <span className="auth-avatar auth-avatar--4">SK</span>
                        </div>
                        <span className="auth-social-text">Direct scheduling with <strong>verified local professionals</strong></span>
                    </div>
                </div>
            </div>

            {/* Right Panel : Form */}
            <div className="auth-panel auth-panel--form">
                <motion.div
                    className="auth-form-box"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="auth-back-nav">
                        <Link to="/" className="auth-back-link">
                            <ArrowLeft size={14} /> Back to Home
                        </Link>
                    </div>

                    <div className="auth-form-header">
                        <h1>Welcome back</h1>
                        {pendingBooking && (
                            <div className="auth-pending-slot-banner" style={{
                                background: 'rgba(226, 137, 47, 0.12)',
                                border: '1px solid rgba(226, 137, 47, 0.35)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                marginBottom: '14px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                color: 'var(--paper, #F4F1E8)'
                            }}>
                                <span style={{ color: 'var(--amber, #E2892F)', marginTop: '2px', display: 'inline-flex' }}><Sparkles size={16} /></span>
                                <div style={{ fontSize: '13px', lineHeight: '1.45', textAlign: 'left' }}>
                                    <strong style={{ color: 'var(--amber, #E2892F)', display: 'block', marginBottom: '2px' }}>
                                        Your appointment slot is held!
                                    </strong>
                                    <span>
                                        {pendingBooking.providerName ? `Consultation with ${pendingBooking.providerName}` : 'Appointment'}
                                        {pendingBooking.formattedDate ? ` on ${pendingBooking.formattedDate}` : ''}
                                        {pendingBooking.formattedTime ? ` at ${pendingBooking.formattedTime}` : ''}.
                                        Sign in to complete your booking.
                                    </span>
                                </div>
                            </div>
                        )}
                        {showRedirectMessage && (
                            <div className="auth-info-alert" style={{
                                background: 'rgba(37, 99, 235, 0.1)',
                                color: '#60A5FA',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12.5px',
                                marginBottom: '10px',
                                border: '1px solid rgba(37, 99, 235, 0.25)',
                                fontWeight: '500'
                            }}>
                                🔒 Please sign in to view this professional's full profile and book a slot.
                            </div>
                        )}
                        <p>Don't have an account? <Link to="/signup" className="auth-link" state={{ from: location.state?.from }}>Create one free →</Link></p>
                    </div>

                    {/* Role toggle */}
                    <div className="auth-role-toggle">
                        {['client', 'provider', 'admin'].map((r) => (
                            <button
                                key={r}
                                type="button"
                                className={`auth-role-btn ${form.role === r ? 'auth-role-btn--active' : ''}`}
                                onClick={() => {
                                    setForm((f) => ({ ...f, role: r }));
                                    setErrors({});
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    {r === 'client' && <User size={14} />}
                                    {r === 'provider' && <Briefcase size={14} />}
                                    {r === 'admin' && <Shield size={14} />}
                                    {r === 'client' ? 'Client' : r === 'provider' ? 'Provider' : 'Admin'}
                                </span>
                            </button>
                        ))}
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                        {errors._form && <div className="auth-error" role="alert">{errors._form}</div>}

                        <Input
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={set('email')}
                            onBlur={clearErrorOnBlur('email')}
                            error={errors.email}
                            leftIcon={<Mail size={16} />}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={set('password')}
                            onBlur={clearErrorOnBlur('password')}
                            error={errors.password}
                            leftIcon={<Lock size={16} />}
                            showPasswordToggle={true}
                            required
                        />

                        <div className="auth-row">
                            <label className="auth-checkbox">
                                <input
                                    type="checkbox"
                                    checked={form.rememberMe}
                                    onChange={(e) => setForm(f => ({ ...f, rememberMe: e.target.checked }))}
                                /> Remember me
                            </label>
                            <Link to="/forgot-password" className="auth-link auth-link--sm">Forgot password?</Link>
                        </div>

                        <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                            Sign in to Account
                        </Button>

                        <div className="auth-divider"><span>or continue with</span></div>

                        <div className="auth-social-btns">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setErrors({ _form: 'Google Login Failed' })}
                                theme="outline"
                                size="large"
                                shape="pill"
                                width="100%"
                                locale="en"
                            />
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
