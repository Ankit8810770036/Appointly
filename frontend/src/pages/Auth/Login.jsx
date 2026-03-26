import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

/* ── Icons (inline SVG for zero deps) ── */
const EyeIcon = () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeOffIcon = () => (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { play } = useSound();

    const from = location.state?.from?.pathname || null;

    const [form, setForm] = useState({ email: '', password: '', role: 'client', rememberMe: true });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field) => (e) => {
        setForm((f) => ({ ...f, [field]: e.target.value }));
        // Clear error when typing
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
            const { user, token } = await authApi.login(form.email, form.password, form.role);
            play('success');
            login(user, token, form.rememberMe);

            if (from) {
                navigate(from, { replace: true });
            } else {
                navigate(user.role === 'provider' ? '/dashboard/provider' : '/dashboard/client');
            }
        } catch (err) {
            play('error');
            // Check if it's a field-specific error from server or a general one
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

    return (
        <div className="auth-page">
            {/* Left panel */}
            <div className="auth-panel auth-panel--brand">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-logo">Appointly</Link>
                    <div className="auth-brand-copy">
                        <h2>Welcome back 👋</h2>
                        <p>Log in to manage your appointments, connect with providers, and more.</p>
                    </div>
                    <div className="auth-social-proof">
                        <div className="auth-avatars">
                            {['👩🏽', '👨🏻', '👩🏼', '👨🏾'].map((a, i) => (
                                <span key={i} className="auth-avatar" style={{ zIndex: 4 - i }}>{a}</span>
                            ))}
                        </div>
                        <span><strong>5,000+</strong> professionals &amp; clients trust Appointly</span>
                    </div>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="auth-panel auth-panel--form">
                <motion.div
                    className="auth-form-box"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="auth-form-header">
                        <h1>Sign in</h1>
                        {from && (
                            <div className="auth-info-alert" style={{
                                background: 'rgba(37, 99, 235, 0.1)',
                                color: 'var(--primary)',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--fs-sm)',
                                marginBottom: 'var(--space-4)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                fontWeight: '500'
                            }}>
                                🔒 Please sign in or create an account to view this professional's full profile.
                            </div>
                        )}
                        <p>Don't have an account? <Link to="/signup" className="auth-link" state={{ from: location.state?.from }}>Create one free →</Link></p>
                    </div>

                    {/* Role toggle */}
                    <div className="auth-role-toggle">
                        {['client', 'provider'].map((r) => (
                            <button
                                key={r}
                                type="button"
                                className={`auth-role-btn ${form.role === r ? 'auth-role-btn--active' : ''}`}
                                onClick={() => setForm((f) => ({ ...f, role: r }))}
                            >
                                {r === 'client' ? '🙋 Client' : '🧑‍💼 Provider'}
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
                            error={errors.email}
                            leftIcon={<span>✉️</span>}
                            required
                        />

                        <Input
                            label="Password"
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={set('password')}
                            error={errors.password}
                            leftIcon={<span>🔒</span>}
                            rightIcon={
                                <button type="button" onClick={() => setShowPw((v) => !v)} className="auth-eye-btn" aria-label="Toggle password visibility">
                                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            }
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
                            Sign in
                        </Button>

                        <div className="auth-divider"><span>or continue with</span></div>

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
                </motion.div>
            </div>
        </div>
    );
}
