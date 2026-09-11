import { useState, useEffect } from 'react';
import { User, Mail, Lock, Phone, MapPin, ChevronRight, RotateCw, CheckCircle2, Sparkles, ShieldCheck, Zap, MessageSquare } from 'lucide-react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { toast } from '../../utils/toast';
import MapPicker from '../../components/ui/Map/MapPicker';
import { GoogleLogin } from '@react-oauth/google';
import './Auth.css';

const INITIAL_SPECIALTIES = [
    'Health & Wellness', 'Beauty & Spa', 'Home Services',
    'Fitness', 'Legal & Finance', 'Education', 'Other',
];

export default function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const initialRole = searchParams.get('role') || 'client';
    const from = location.state?.from?.pathname || null;

    const [step, setStep] = useState(location.state?.step || 1); // 1 = Account, 2 = Contact/Profile, 3 = Location
    const [categories, setCategories] = useState(INITIAL_SPECIALTIES);
    const [customSpecialty, setCustomSpecialty] = useState('');
    const [form, setForm] = useState({
        role: location.state?.form?.role || initialRole,
        fullName: location.state?.form?.name || '',
        email: location.state?.form?.email || '',
        password: '',
        phone: location.state?.form?.phone || '',
        location: location.state?.form?.location || '',
        streetAddress: location.state?.form?.streetAddress || '',
        city: location.state?.form?.city || '',
        state: location.state?.form?.state || '',
        zipCode: location.state?.form?.zipCode || '',
        country: location.state?.form?.country || 'IND',
        latitude: location.state?.form?.latitude || null,
        longitude: location.state?.form?.longitude || null,
        specialty: location.state?.form?.providerProfile?.specialty || '',
        bio: location.state?.form?.providerProfile?.about || '',
        agree: !!location.state?.form,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showRedirectMessage, setShowRedirectMessage] = useState(!!from);

    // Verification State
    const [emailVerified, setEmailVerified] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [verifyingPhone, setVerifyingPhone] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [phoneOtp, setPhoneOtp] = useState('');
    const [sendingOtp, setSendingOtp] = useState({ email: false, phone: false });

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
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const setNumeric = (field) => (e) => {
        const val = e.target.value.replace(/\D/g, '');
        setForm((f) => ({ ...f, [field]: val }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateStep = (currentStep = step) => {
        const errs = {};
        if (currentStep === 1) {
            if (!form.fullName.trim()) errs.fullName = 'Full name is required';

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(form.email)) {
                errs.email = 'Valid email is required';
            } else if (!emailVerified) {
                errs.email = 'Please click "Verify" to verify your email address before continuing';
            }

            const pw = form.password;
            if (pw.length < 8) {
                errs.password = 'Minimum 8 characters required';
            } else if (!/(?=.*\d)(?=.*[!@#$%^&*])/.test(pw)) {
                errs.password = 'Include at least one number and one symbol (!@#$%^&*)';
            }

            if (!form.agree) errs.agree = 'You must accept the terms & privacy policy';
        } else if (currentStep === 2) {
            const phoneRegex = /^\+?[\d\s-]{10,}$/;
            if (!phoneRegex.test(form.phone)) {
                errs.phone = 'Valid 10-digit phone number is required';
            } else if (!phoneVerified) {
                errs.phone = 'Please click "Verify" to verify your phone number with OTP before continuing';
            }

            if (form.role === 'provider') {
                if (!form.specialty) errs.specialty = 'Please select a specialty';
                if (form.specialty === 'Other' && !customSpecialty.trim()) errs.customSpecialty = 'Please enter your specialty';
                if (!form.bio.trim() || form.bio.length < 50) errs.bio = 'Bio (minimum 50 characters) is required';
            }
        } else if (currentStep === 3) {
            if (!form.streetAddress.trim()) errs.streetAddress = 'Street address is required';
            if (!form.city.trim()) errs.city = 'City is required';
            if (!form.zipCode.trim()) errs.zipCode = 'Postal code is required';
            if (!form.country.trim()) errs.country = 'Country is required';
        }
        return errs;
    };

    const handleSendSignupOTP = async (type) => {
        const identifier = type === 'email' ? form.email : form.phone;
        if (!identifier) {
            setErrors(prev => ({ ...prev, [type]: `Please enter your ${type} first` }));
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (type === 'email' && !emailRegex.test(identifier)) {
            setErrors(prev => ({ ...prev, email: 'Valid email is required' }));
            return;
        }

        setSendingOtp(prev => ({ ...prev, [type]: true }));
        try {
            await authApi.sendSignupOTP(identifier, type.toUpperCase());
            if (type === 'email') setVerifyingEmail(true);
            else setVerifyingPhone(true);
            toast.success(`OTP sent to your ${type}`);
        } catch (err) {
            setErrors(prev => ({ ...prev, [type]: err.message }));
        } finally {
            setSendingOtp(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleVerifySignupOTP = async (type) => {
        const identifier = type === 'email' ? form.email : form.phone;
        const otp = type === 'email' ? emailOtp : phoneOtp;

        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await authApi.verifySignupOTP(identifier, type.toUpperCase(), otp);
            if (type === 'email') {
                setEmailVerified(true);
                setVerifyingEmail(false);
            } else {
                setPhoneVerified(true);
                setVerifyingPhone(false);
            }
            toast.success(`${type} verified!`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNextStep = (e) => {
        if (e) e.preventDefault();

        const errs = validateStep(step);
        if (Object.keys(errs).length) {
            setErrors(errs);
            const firstErr = Object.values(errs)[0];
            toast.error(firstErr);
            return;
        }
        setErrors({});
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        setErrors({});
        setStep(prev => Math.max(1, prev - 1));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const errs = validateStep(3);
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }
        handleRegister();
    };

    const handleRegister = async () => {
        setErrors({});
        setLoading(true);
        try {
            const finalSpecialty = form.specialty === 'Other' ? customSpecialty : form.specialty;

            if (form.specialty === 'Other' && !categories.includes(customSpecialty)) {
                setCategories(prev => {
                    const newList = [...prev];
                    newList.splice(newList.length - 1, 0, customSpecialty);
                    return newList;
                });
            }

            const signupData = { ...form, specialty: finalSpecialty };

            let user, token, refreshToken;
            const authToken = localStorage.getItem('token');

            if (authToken && form.role === 'provider' && step === 3) {
                const updatePayload = {
                    name: form.fullName,
                    specialty: finalSpecialty,
                    about: form.bio,
                    phone: form.phone,
                    streetAddress: form.streetAddress,
                    city: form.city,
                    state: form.state,
                    zipCode: form.zipCode,
                    country: form.country,
                    latitude: form.latitude,
                    longitude: form.longitude
                };
                user = await authApi.updateMe(updatePayload, authToken);
                token = authToken;
                refreshToken = localStorage.getItem('abs_refreshToken');
            } else {
                const res = await authApi.signup(signupData);
                user = res.user;
                token = res.token;
                refreshToken = res.refreshToken;
            }
            toast.success('Account created successfully!');
            login(user, token, refreshToken);

            if (from) {
                navigate(from, { replace: true });
            } else {
                navigate(user?.role?.toLowerCase() === 'provider' ? '/dashboard/provider' : '/dashboard/client');
            }
        } catch (err) {
            toast.error(err.message || 'Sign up failed');
            setErrors({ api: err.message || 'Sign up failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setErrors({});
        try {
            const { user, token } = await authApi.googleLogin(credentialResponse.credential, form.role);
            toast.success('Welcome to Appointly!');
            login(user, token);

            if (user?.role?.toLowerCase() === 'provider' && user.isNewUser) {
                setStep(2);
                setEmailVerified(true);
                setForm(f => ({
                    ...f,
                    fullName: user.name,
                    email: user.email,
                    agree: true
                }));
                return;
            }

            const destination = from || (user?.role?.toLowerCase() === 'provider' ? '/dashboard/provider' : '/dashboard/client');
            navigate(destination, { replace: true });
        } catch (err) {
            toast.error(err.message || 'Google login failed');
            setErrors({ api: err.message || 'Google signup failed' });
        } finally {
            setLoading(false);
        }
    };

    const stepLabels = form.role === 'provider'
        ? ['Account', 'Profile', 'Location']
        : ['Account', 'Phone', 'Location'];

    return (
        <div className="auth-page">
            <div className="auth-glow-orb auth-glow-orb--amber"></div>
            <div className="auth-glow-orb auth-glow-orb--teal"></div>

            {/* Left Showcase Panel */}
            <div className="auth-panel auth-panel--brand auth-panel--signup">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-logo-badge">
                        <div className="auth-logo-icon">A</div>
                        <span className="auth-logo-text">Appointly</span>
                    </Link>

                    <div className="auth-brand-copy">
                        <h2>
                            Join the future of <em>smart booking.</em>
                        </h2>
                        <p>Join thousands of verified specialists and clients using Appointly to streamline appointments and payments effortlessly.</p>
                    </div>

                    {/* Interactive Live Preview Card */}
                    <div className="auth-preview-card">
                        <div className="auth-preview-top">
                            <div className="auth-preview-provider">
                                <div className="auth-preview-avatar">⚡</div>
                                <div>
                                    <div className="auth-preview-name">Instant Synchronization</div>
                                    <div className="auth-preview-role">Zero double-booking guarantee</div>
                                </div>
                            </div>
                            <span className="auth-preview-status">
                                <span className="auth-preview-pulse"></span>
                                99.9% Uptime
                            </span>
                        </div>
                        <div className="auth-preview-bottom">
                            <span>⭐ <strong>4.9 / 5</strong> average rating</span>
                            <span style={{ color: '#10B981', fontWeight: 600 }}>Free forever for clients</span>
                        </div>
                    </div>

                    {/* Feature Highlights */}
                    <div className="auth-feature-tags">
                        <span className="auth-feature-tag"><Zap size={13} style={{ color: '#F59E0B' }} /> Real-Time Live Chat</span>
                        <span className="auth-feature-tag"><ShieldCheck size={13} style={{ color: '#10B981' }} /> Bank-Grade Privacy</span>
                        <span className="auth-feature-tag"><Sparkles size={13} style={{ color: '#38BDF8' }} /> Smart SMS Reminders</span>
                    </div>

                    {/* Social proof */}
                    <div className="auth-social-proof">
                        <div className="auth-avatars">
                            {['👩🏽', '👨🏻', '👩🏼', '👨🏾'].map((a, i) => (
                                <span key={i} className="auth-avatar" style={{ zIndex: 4 - i }}>{a}</span>
                            ))}
                        </div>
                        <span><strong>5,000+</strong> professionals trust Appointly</span>
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="auth-panel auth-panel--form">
                <div className="auth-form-box">
                    <div className="auth-form-header">
                        <h1>
                            {step === 1 && 'Create Account'}
                            {step === 2 && (form.role === 'provider' ? 'Professional Profile' : 'Phone Verification')}
                            {step === 3 && (form.role === 'provider' ? 'Business Location' : 'Your Address')}
                        </h1>
                        {showRedirectMessage && step === 1 && (
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
                                🔒 Please create an account to view this professional's full profile.
                            </div>
                        )}
                        <p>Already have an account? <Link to="/login" className="auth-link" state={{ from: location.state?.from }}>Sign in →</Link></p>
                    </div>

                    {/* Step indicator */}
                    <div className="auth-steps">
                        {stepLabels.map((s, i) => (
                            <div key={s} className="auth-step-wrapper">
                                <div className={`auth-step ${step > i + 1 ? 'auth-step--done' : ''} ${step === i + 1 ? 'auth-step--active' : ''}`}>
                                    <span className="auth-step__dot">{step > i + 1 ? '✓' : i + 1}</span>
                                    <span>{s}</span>
                                </div>
                                {i < stepLabels.length - 1 && <ChevronRight className="auth-step-arrow" size={14} />}
                            </div>
                        ))}
                    </div>

                    {errors.api && <div className="auth-error" role="alert">{errors.api}</div>}

                    <AnimatePresence mode="wait">
                        {/* ─── STEP 1: ACCOUNT DETAILS ─── */}
                        {step === 1 && (
                            <motion.form
                                key="step-1"
                                className="auth-form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleNextStep}
                                noValidate
                            >
                                {/* Role toggle */}
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

                                <Input
                                    label="Full name"
                                    placeholder="Enter your full name"
                                    value={form.fullName}
                                    onChange={set('fullName')}
                                    leftIcon={<User size={16} />}
                                    error={errors.fullName}
                                    required
                                />

                                <div className="auth-verify-field">
                                    <Input
                                        label="Email address"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={set('email')}
                                        leftIcon={<Mail size={16} />}
                                        error={errors.email}
                                        required
                                        disabled={emailVerified}
                                    />
                                    {!emailVerified && !verifyingEmail && (
                                        <button
                                            type="button"
                                            className="auth-verify-btn"
                                            onClick={() => handleSendSignupOTP('email')}
                                            disabled={sendingOtp.email}
                                        >
                                            {sendingOtp.email ? 'Sending...' : 'Verify'}
                                        </button>
                                    )}
                                    {emailVerified && <span className="auth-verified-badge"><CheckCircle2 size={14} /> Verified</span>}
                                </div>

                                {verifyingEmail && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="auth-otp-box">
                                        <div className="auth-otp-header">
                                            <span>📩 Enter Email OTP Code</span>
                                            <span>Expires in 2m</span>
                                        </div>
                                        <div className="auth-otp-input-row">
                                            <Input
                                                placeholder="••••••"
                                                value={emailOtp}
                                                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                                                maxLength={6}
                                                inputMode="numeric"
                                            />
                                            <button
                                                type="button"
                                                className="auth-otp-verify-btn"
                                                onClick={() => handleVerifySignupOTP('email')}
                                                disabled={loading}
                                            >
                                                Confirm Code
                                            </button>
                                        </div>
                                        <div className="auth-otp-footer">
                                            <span>Didn't receive code?</span>
                                            <button
                                                type="button"
                                                className="auth-resend-btn"
                                                onClick={() => handleSendSignupOTP('email')}
                                                disabled={sendingOtp.email}
                                            >
                                                <RotateCw size={11} className={sendingOtp.email ? 'spin-icon' : ''} />
                                                Resend OTP
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={set('password')}
                                    leftIcon={<Lock size={16} />}
                                    error={errors.password}
                                    showPasswordToggle={true}
                                    required
                                    hint="At least 8 characters with 1 number & 1 special symbol"
                                />

                                <label className={`auth-checkbox ${errors.agree ? 'auth-checkbox--error' : ''}`}>
                                    <input type="checkbox" checked={form.agree} onChange={set('agree')} />
                                    I agree to the <Link to="/terms" className="auth-link">Terms</Link> &amp; <Link to="/privacy" className="auth-link">Privacy</Link>
                                </label>
                                {errors.agree && <span className="auth-field-error">{errors.agree}</span>}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    className="auth-submit-btn"
                                >
                                    {form.role === 'provider' ? 'Next: Profile Details →' : 'Next: Phone Verification →'}
                                </Button>

                                <div className="auth-divider"><span>or sign up with</span></div>
                                <div className="auth-social-btns">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setErrors({ api: 'Google Signup Failed' })}
                                        theme="outline"
                                        size="large"
                                        shape="pill"
                                        width="100%"
                                        locale="en"
                                    />
                                </div>
                            </motion.form>
                        )}

                        {/* ─── STEP 2: PHONE & PROFILE DETAILS ─── */}
                        {step === 2 && (
                            <motion.form
                                key="step-2"
                                className="auth-form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleNextStep}
                                noValidate
                            >
                                <div className="auth-step-info-card">
                                    <span className="auth-step-info-icon">📱</span>
                                    <div>
                                        <strong style={{ color: '#FFFFFF' }}>Phone Verification</strong>
                                        <div>Used for instant SMS booking confirmations, slot updates, and account security.</div>
                                    </div>
                                </div>

                                <div className="auth-verify-field">
                                    <Input
                                        label="Phone number"
                                        type="tel"
                                        placeholder="9876543210"
                                        value={form.phone}
                                        onChange={setNumeric('phone')}
                                        leftIcon={<Phone size={16} />}
                                        error={errors.phone}
                                        required
                                        inputMode="numeric"
                                        disabled={phoneVerified}
                                    />
                                    {!phoneVerified && !verifyingPhone && (
                                        <button
                                            type="button"
                                            className="auth-verify-btn"
                                            onClick={() => handleSendSignupOTP('phone')}
                                            disabled={sendingOtp.phone}
                                        >
                                            {sendingOtp.phone ? 'Sending...' : 'Verify'}
                                        </button>
                                    )}
                                    {phoneVerified && <span className="auth-verified-badge"><CheckCircle2 size={14} /> Verified</span>}
                                </div>

                                {verifyingPhone && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="auth-otp-box">
                                        <div className="auth-otp-header">
                                            <span>📱 Enter SMS OTP Code</span>
                                            <span>Expires in 2m</span>
                                        </div>
                                        <div className="auth-otp-input-row">
                                            <Input
                                                placeholder="••••••"
                                                value={phoneOtp}
                                                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                                                maxLength={6}
                                                inputMode="numeric"
                                            />
                                            <button
                                                type="button"
                                                className="auth-otp-verify-btn"
                                                onClick={() => handleVerifySignupOTP('phone')}
                                                disabled={loading}
                                            >
                                                Confirm Phone
                                            </button>
                                        </div>
                                        <div className="auth-otp-footer">
                                            <span>Didn't receive SMS?</span>
                                            <button
                                                type="button"
                                                className="auth-resend-btn"
                                                onClick={() => handleSendSignupOTP('phone')}
                                                disabled={sendingOtp.phone}
                                            >
                                                <RotateCw size={11} className={sendingOtp.phone ? 'spin-icon' : ''} />
                                                Resend OTP
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {form.role === 'provider' && (
                                    <>
                                        <div className="auth-field-group">
                                            <label className="input-label">Your specialty *</label>
                                            <select className={`auth-select ${errors.specialty ? 'auth-select--error' : ''}`} value={form.specialty} onChange={set('specialty')}>
                                                <option value="">Select a category…</option>
                                                {categories.map((s) => <option key={s}>{s}</option>)}
                                            </select>
                                            {errors.specialty && <span className="auth-field-error">{errors.specialty}</span>}
                                        </div>

                                        {form.specialty === 'Other' && (
                                            <Input
                                                label="Enter your category"
                                                placeholder="e.g. Photography, Interior Design"
                                                value={customSpecialty}
                                                onChange={(e) => {
                                                    setCustomSpecialty(e.target.value);
                                                    if (errors.customSpecialty) setErrors(prev => ({ ...prev, customSpecialty: '' }));
                                                }}
                                                error={errors.customSpecialty}
                                                required
                                            />
                                        )}

                                        <div className="auth-field-group">
                                            <label className="input-label">Short bio (min 50 chars) *</label>
                                            <textarea
                                                className={`auth-textarea ${errors.bio ? 'auth-textarea--error' : ''}`}
                                                placeholder="Tell clients about your experience, training, and services…"
                                                rows={3}
                                                value={form.bio}
                                                onChange={set('bio')}
                                            />
                                            {errors.bio && <span className="auth-field-error">{errors.bio}</span>}
                                        </div>
                                    </>
                                )}

                                <div className="auth-actions-row">
                                    <button type="button" className="auth-back-btn" onClick={handlePrevStep}>
                                        ← Back
                                    </button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        className="auth-submit-btn"
                                        style={{ flex: 1 }}
                                    >
                                        Next: Location &amp; Map →
                                    </Button>
                                </div>
                            </motion.form>
                        )}

                        {/* ─── STEP 3: LOCATION & MAP ─── */}
                        {step === 3 && (
                            <motion.form
                                key="step-3"
                                className="auth-form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                onSubmit={handleFormSubmit}
                                noValidate
                            >
                                <div className="auth-address-group">
                                    <div className="auth-address-header">
                                        {form.role === 'provider' ? '📍 Business Location' : '📍 Home Address'}
                                    </div>
                                    <Input
                                        label="Street Address / Apt / Suite"
                                        placeholder="44/1 Bharat Apartment, 5th Main Road"
                                        value={form.streetAddress}
                                        onChange={set('streetAddress')}
                                        leftIcon={<MapPin size={16} />}
                                        error={errors.streetAddress}
                                        required
                                    />
                                    <div className="auth-row">
                                        <Input label="City" placeholder="Bangalore" value={form.city} onChange={set('city')} error={errors.city} required />
                                        <Input label="State" placeholder="KA" value={form.state} onChange={set('state')} error={errors.state} required />
                                    </div>
                                    <div className="auth-row">
                                        <Input label="Postal Code" placeholder="560041" value={form.zipCode} onChange={setNumeric('zipCode')} error={errors.zipCode} required type="text" inputMode="numeric" />
                                        <Input label="Country" placeholder="IND" value={form.country} onChange={set('country')} error={errors.country} required />
                                    </div>
                                    <MapPicker
                                        value={{ lat: form.latitude, lng: form.longitude }}
                                        onChange={(pos) => setForm(f => ({ ...f, latitude: pos.lat, longitude: pos.lng }))}
                                        onAddressUpdate={(addr) => setForm(f => ({
                                            ...f,
                                            streetAddress: addr.street || f.streetAddress,
                                            city: addr.city || f.city,
                                            state: addr.state || f.state,
                                            zipCode: addr.zipCode || f.zipCode,
                                            country: addr.country || f.country
                                        }))}
                                        label="Pin location on map *"
                                        height="145px"
                                    />
                                </div>

                                <div className="auth-actions-row">
                                    <button type="button" className="auth-back-btn" onClick={handlePrevStep}>
                                        ← Back
                                    </button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        loading={loading}
                                        className="auth-submit-btn"
                                        style={{ flex: 1 }}
                                    >
                                        {form.role === 'provider' ? 'Complete & Launch Profile 🚀' : 'Create Account 🎉'}
                                    </Button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
