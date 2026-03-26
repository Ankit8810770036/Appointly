import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../../components/ui/Button/Button';
import Input from '../../components/ui/Input/Input';
import { authApi } from '../../api/auth';
import { useSound } from '../../hooks/useSound';
import './Auth.css';

export default function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { play } = useSound();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            return setError('Passwords do not match');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            await authApi.resetPassword(token, password);
            play('success');
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            play('error');
            setError(err.message || 'Token is invalid or has expired.');
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
                        <h2>Set New Password 🆕</h2>
                        <p>Great! You're almost back. Choose a secure new password for your account.</p>
                    </div>
                </div>
            </div>

            <div className="auth-panel auth-panel--form">
                <div className="auth-form-box animate-fade-in">
                    <div className="auth-form-header">
                        <h1>Reset Password</h1>
                        <p>Please enter your new password below.</p>
                    </div>

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Success!</h2>
                            <p>Your password has been reset. Redirecting to login...</p>
                            <Button variant="primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/login')}>Sign in now</Button>
                        </div>
                    ) : (
                        <form className="auth-form" onSubmit={handleSubmit}>
                            {error && <div className="auth-error">{error}</div>}

                            <Input
                                label="New Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                leftIcon={<span>🔒</span>}
                                required
                            />

                            <Input
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                leftIcon={<span>🔒</span>}
                                required
                            />

                            <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit-btn">
                                Reset Password
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
