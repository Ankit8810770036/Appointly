import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { authApi } from '../../api/auth';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

export default function ForgotPassword() {
    const { play } = useSound();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await authApi.forgotPassword(email);
            play('success');
            setMessage('If an account exists with this email, a reset link has been sent!');
        } catch (err) {
            play('error');
            setError(err.message || 'Something went wrong. Please try again.');
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
                        <h1>Forgot Password?</h1>
                        <p>Remembered? <Link to="/login" className="auth-link">Back to sign in →</Link></p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {message && <div style={{ background: 'hsla(142, 70%, 45%, 0.1)', border: '1px solid hsla(142, 70%, 45%, 0.3)', color: 'hsl(142, 70%, 35%)', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem' }}>{message}</div>}
                        {error && <div className="auth-error">{error}</div>}

                        <Input
                            label="Email address"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={<span>✉️</span>}
                            required
                        />

                        <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                            Send Reset Link
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
