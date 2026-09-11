import { useState } from 'react';
import { Mail, Lock, RotateCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { authApi } from '../../api/auth';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { play } = useSound();
    const [email, setEmail] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: OTP + Password
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRequestOTP = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            play('success');
            setStep(2);
            setMessage('A 6-digit OTP has been sent to your email. It expires in 2 minutes.');
        } catch (err) {
            play('error');
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            return setError('Password must be at least 8 characters');
        }
        if (otp.length !== 6) {
            return setError('Please enter a valid 6-digit OTP');
        }

        setLoading(true);
        try {
            await authApi.resetPassword(email, otp, password);
            play('success');
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            play('error');
            setError(err.message || 'Invalid or expired OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-panel auth-panel--brand">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-logo">Appointly</Link>
                    <div className="auth-brand-copy">
                        <h2>Recover Account 🔐</h2>
                        <p>Don't worry, it happens! Enter your email and we'll help you get back into your account.</p>
                    </div>
                </div>
            </div>

            <div className="auth-panel auth-panel--form">
                <div className="auth-form-box animate-fade-in">
                    <div className="auth-form-header">
                        <h1>{step === 1 ? 'Forgot Password?' : 'Verify OTP & Reset'}</h1>
                        <p>{step === 1 ? 'Enter your email to receive a reset code.' : 'Enter the 6-digit code and your new password.'}</p>
                    </div>

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Success!</h2>
                            <p>Your password has been reset. Redirecting to login...</p>
                            <Button variant="primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/login')}>Sign in now</Button>
                        </div>
                    ) : (
                        <form className="auth-form" onSubmit={step === 1 ? handleRequestOTP : handleResetPassword}>
                            {message && <div style={{ background: 'rgba(62, 142, 126, 0.15)', border: '1px solid rgba(62, 142, 126, 0.3)', color: 'var(--teal)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>{message}</div>}
                            {error && <div className="auth-error">{error}</div>}

                            {step === 1 ? (
                                <>
                                    <Input
                                        label="Email address"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        leftIcon={<Mail size={16} />}
                                        required
                                    />
                                    <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                                        Send OTP Code
                                    </Button>
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                                        Remember your password? <Link to="/login" className="auth-link">Sign in →</Link>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Input
                                        label="6-Digit OTP Code"
                                        type="text"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                        style={{ fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.35rem', fontWeight: 'bold' }}
                                    />
                                    <Input
                                        label="New Password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        leftIcon={<Lock size={16} />}
                                        showPasswordToggle={true}
                                        required
                                        hint="At least 8 characters"
                                    />
                                    <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                                        Reset Password
                                    </Button>
                                    <div className="auth-otp-footer" style={{ marginTop: '8px' }}>
                                        <span>Didn't receive code?</span>
                                        <button
                                            type="button"
                                            className="auth-resend-btn"
                                            onClick={handleRequestOTP}
                                            disabled={loading}
                                        >
                                            <RotateCw size={11} className={loading ? 'spin-icon' : ''} />
                                            Resend OTP
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
