import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../ui/Button/Button';
import { authApi } from '../../../api/auth';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../utils/toast';
import './OTPModal.css';

const OTPModal = ({ type, email, phone, onClose, onSuccess }) => {
    const { token, login } = useAuth();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(120); // 2 minutes
    const [canResend, setCanResend] = useState(false);

    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setLoading(true);
        setError('');
        try {
            await authApi.requestOTP(type, token);
            toast.success('New code sent!');
            setCountdown(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            inputRefs[0].current.focus();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6) {
            setError('Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await authApi.verifyOTP(type, fullOtp, token);
            setSuccess(true);
            toast.success(res.message);

            // Refresh user data globally
            const updatedUser = await authApi.me(token);
            login(updatedUser, token);

            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="otp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                className="otp-modal-container"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
                <button className="otp-modal-close" onClick={onClose}><X size={20} /></button>

                {success ? (
                    <div className="otp-success-state">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                            className="otp-success-icon"
                        >
                            <CheckCircle2 size={64} color="var(--success)" />
                        </motion.div>
                        <h3>Verification Successful!</h3>
                        <p>Your {type === 'email' ? 'email address' : 'phone number'} has been verified.</p>
                    </div>
                ) : (
                    <>
                        <div className="otp-modal-header">
                            <div className="otp-lock-icon"><ShieldCheck size={32} color="var(--primary)" /></div>
                            <h2>Verify your {type === 'email' ? 'Email' : 'Phone'}</h2>
                            <p>We've sent a 6-digit code to <br />
                                <strong>{type === 'email' ? email : phone}</strong>
                            </p>
                        </div>

                        <div className="otp-inputs-wrapper">
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={inputRefs[idx]}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(idx, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(idx, e)}
                                    className={`otp-digit-input ${error ? 'otp-input-error' : ''}`}
                                    autoFocus={idx === 0}
                                />
                            ))}
                        </div>

                        {error && (
                            <motion.div
                                className="otp-error-msg"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                            >
                                <AlertCircle size={14} /> {error}
                            </motion.div>
                        )}

                        <div className="otp-timer-row">
                            {countdown > 0 ? (
                                <span>Code expires in <span className="text-primary font-bold">{formatTime(countdown)}</span></span>
                            ) : (
                                <span className="text-muted">Code expired</span>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            className="otp-verify-btn"
                            onClick={handleVerify}
                            loading={loading}
                            disabled={loading || otp.some(d => !d)}
                        >
                            {loading ? 'Verifying Security Code...' : 'Verify Account'}
                        </Button>

                        <div className="otp-resend-footer">
                            Didn't receive the code?
                            <button
                                className={`resend-link ${canResend ? '' : 'resend-disabled'}`}
                                onClick={handleResend}
                                disabled={!canResend || loading}
                            >
                                {loading && canResend ? 'Sending...' : 'Resend Code'}
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default OTPModal;
