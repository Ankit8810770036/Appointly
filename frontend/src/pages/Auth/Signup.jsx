import { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, MapPin } from 'lucide-react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

const SPECIALTIES = [
    'Health & Wellness', 'Beauty & Spa', 'Home Services',
    'Fitness', 'Legal & Finance', 'Education', 'Other',
];

export default function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { play } = useSound();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const initialRole = searchParams.get('role') || 'client';
    const from = location.state?.from?.pathname || null;

    const [step, setStep] = useState(1); // 1 = account info, 2 = profile details
    const [form, setForm] = useState({
        role: initialRole,
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        location: '',
        specialty: '',
        bio: '',
        agree: false,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showRedirectMessage, setShowRedirectMessage] = useState(!!from);

    useEffect(() => {
        if (showRedirectMessage) {
            const timer = setTimeout(() => {
                setShowRedirectMessage(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showRedirectMessage]);

    const set = (field) => (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((f) => ({ ...f, [field]: val }));
        // Clear error as user types
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validate = (currentStep = step) => {
        const errs = {};
        if (currentStep === 1) {
            if (!form.fullName.trim()) errs.fullName = 'Full name is required';

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email)) errs.email = 'Valid email is required';

            // Password strength: min 8 chars, 1 number, 1 special
            const pw = form.password;
            if (pw.length < 8) {
                errs.password = 'Minimum 8 characters required';
            } else if (!/(?=.*\d)(?=.*[!@#$%^&*])/.test(pw)) {
                errs.password = 'Include at least one number and one symbol (!@#$%^&*)';
            }

            if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
            if (!form.agree) errs.agree = 'You must accept the terms';

            if (form.role === 'client') {
                if (!form.phone.trim()) errs.phone = 'Phone number is required';
                if (!form.location.trim()) errs.location = 'Address is required';
            }
        } else if (currentStep === 2) {
            const phoneRegex = /^\+?[\d\s-]{10,}$/;
            if (!phoneRegex.test(form.phone)) errs.phone = 'Valid phone number is required';
            if (!form.location.trim()) errs.location = 'Business location is required';
            if (!form.specialty) errs.specialty = 'Please select a specialty';
            if (!form.bio.trim() || form.bio.length < 50) errs.bio = 'Bio (min 50 chars) is required';
        }
        return errs;
    };

    const handleNext = (e) => {
        e.preventDefault();
        const errs = validate(1);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        if (form.role === 'provider') { setStep(2); setErrors({}); return; }
        handleRegister();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(2);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        handleRegister();
    };

    const handleRegister = async () => {
        setErrors({});
        setLoading(true);
        try {
            const { user, token } = await authApi.signup(form);
            play('success');
            login(user, token);

            if (from) {
                navigate(from, { replace: true });
            } else {
                navigate(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/client');
            }
        } catch (err) {
            play('error');
            setErrors({ api: err.message || 'Sign up failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left panel */}
            <div className="auth-panel auth-panel--brand auth-panel--signup">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-logo">Appointly</Link>
                    <div className="auth-brand-copy">
                        <h2>Start for free 🚀</h2>
                        <p>Join thousands of clients and professionals already using Appointly to simplify their schedules.</p>
                    </div>
                    <ul className="auth-perks">
                        {[
                            '✅ Free forever for clients',
                            '📅 Smart scheduling & reminders',
                            '🔒 Secure & private',
                            '⭐ 4.9/5 average rating',
                        ].map((p) => <li key={p}>{p}</li>)}
                    </ul>
                </div>
            </div>

            {/* Right panel */}
            <div className="auth-panel auth-panel--form">
                <motion.div
                    className="auth-form-box"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="auth-form-header">
                        <h1>{step === 1 ? 'Create account' : 'Provider details'}</h1>
                        {showRedirectMessage && step === 1 && (
                            <div className="auth-info-alert" style={{
                                background: 'rgba(37, 99, 235, 0.1)',
                                color: 'var(--primary)',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--fs-sm)',
                                marginBottom: 'var(--space-4)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                fontWeight: '500',
                                animation: 'fadeIn 0.3s ease-out'
                            }}>
                                🔒 Please sign in or create an account to view this professional's full profile.
                            </div>
                        )}
                        <p>Already have one? <Link to="/login" className="auth-link" state={{ from: location.state?.from }}>Sign in →</Link></p>
                    </div>

                    {/* Step indicator */}
                    {form.role === 'provider' && (
                        <div className="auth-steps">
                            {['Account', 'Profile'].map((s, i) => (
                                <div key={s} className={`auth-step ${step > i ? 'auth-step--done' : ''} ${step === i + 1 ? 'auth-step--active' : ''}`}>
                                    <span className="auth-step__dot">{step > i + 1 ? '✓' : i + 1}</span>
                                    <span>{s}</span>
                                </div>
                            ))}
                            <div className="auth-steps__line" />
                        </div>
                    )}

                    {/* Role toggle */}
                    {step === 1 && (
                        <div className="auth-role-toggle">
                            {['client', 'provider'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`auth-role-btn ${form.role === r ? 'auth-role-btn--active' : ''}`}
                                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                                >
                                    {r === 'client' ? '🙋 I need services' : '🧑‍💼 I offer services'}
                                </button>
                            ))}
                        </div>
                    )}

                    {errors.api && <div className="auth-error" role="alert">{errors.api}</div>}

                    {step === 1 ? (
                        <form className="auth-form" onSubmit={handleNext} noValidate>
                            <Input label="Full name" placeholder="Enter your full name" value={form.fullName} onChange={set('fullName')} leftIcon={<User size={16} />} error={errors.fullName} required />
                            <Input label="Email address" type="email" placeholder="Enter your email address" value={form.email} onChange={set('email')} leftIcon={<Mail size={16} />} error={errors.email} required />
                            <Input label="Password" type="password" placeholder="Enter your password" value={form.password} onChange={set('password')} leftIcon={<Lock size={16} />} error={errors.password} showPasswordToggle={true} required hint="At least 8 characters" />
                            <Input label="Confirm password" type="password" placeholder="Enter your confirm password" value={form.confirmPassword} onChange={set('confirmPassword')} leftIcon={<Lock size={16} />} error={errors.confirmPassword} showPasswordToggle={true} required />

                            {form.role === 'client' && (
                                <div className="auth-row">
                                    <Input label="Phone number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} leftIcon={<Phone size={16} />} error={errors.phone} required />
                                    <Input label="Your Address" type="text" placeholder="Koramangala, Bengaluru" value={form.location} onChange={set('location')} leftIcon={<MapPin size={16} />} error={errors.location} required />
                                </div>
                            )}

                            <label className={`auth-checkbox ${errors.agree ? 'auth-checkbox--error' : ''}`}>
                                <input type="checkbox" checked={form.agree} onChange={set('agree')} />
                                I agree to the <Link to="/terms" className="auth-link">Terms</Link> &amp; <Link to="/privacy" className="auth-link">Privacy Policy</Link>
                            </label>
                            {errors.agree && <span className="auth-field-error">{errors.agree}</span>}

                            <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                                {form.role === 'provider' ? 'Next →' : 'Create account'}
                            </Button>

                            <div className="auth-divider"><span>or sign up with</span></div>
                            <div className="auth-social-btns">
                                <button type="button" className="auth-social-btn">
                                    <img src="https://www.google.com/favicon.ico" alt="" width="18" height="18" />
                                    Google
                                </button>
                                <button type="button" className="auth-social-btn">
                                    <span>🍎</span> Apple
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleFormSubmit} noValidate>
                            <Input label="Phone number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} leftIcon={<Phone size={16} />} error={errors.phone} required />
                            <Input label="Business Location" type="text" placeholder="Koramangala, Bengaluru" value={form.location} onChange={set('location')} leftIcon={<MapPin size={16} />} error={errors.location} required />

                            <div className="auth-field-group">
                                <label className="input-label">Your specialty *</label>
                                <select className={`auth-select ${errors.specialty ? 'auth-select--error' : ''}`} value={form.specialty} onChange={set('specialty')}>
                                    <option value="">Select a category…</option>
                                    {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                                </select>
                                {errors.specialty && <span className="auth-field-error">{errors.specialty}</span>}
                            </div>

                            <div className="auth-field-group">
                                <label className="input-label">Short bio (min 50 chars) *</label>
                                <textarea
                                    className={`auth-textarea ${errors.bio ? 'auth-textarea--error' : ''}`}
                                    placeholder="Tell clients about your experience, training, and what makes you special…"
                                    rows={5}
                                    value={form.bio}
                                    onChange={set('bio')}
                                />
                                {errors.bio && <span className="auth-field-error">{errors.bio}</span>}
                            </div>

                            <div className="auth-row">
                                <Button type="button" variant="ghost" size="md" onClick={() => { setStep(1); setErrors({}); }}>← Back</Button>
                                <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                                    Complete Setup
                                </Button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
