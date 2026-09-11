import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../../utils/toast';
import Button from '../../ui/Button/Button';
import { MessageSquare, Send, X } from 'lucide-react';
import './MessageModal.css';
import { messageApi } from '../../../api/messages';
import { useAuth } from '../../../context/AuthContext';
import { usePresence } from '../../../context/SocketContext';

export default function MessageModal({ provider, onClose, onSuccess }) {
    const { token } = useAuth();
    const { isUserOnline } = usePresence();
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const targetUserId = provider?.id || provider?.userId;
    const isOnline = isUserOnline(targetUserId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSending(true);
        setError('');
        try {
            await messageApi.send({
                receiverId: targetUserId,
                content: content.trim()
            }, token);

            if (onSuccess) onSuccess();
            toast.success('Message sent successfully!');
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const providerName = provider?.name || 'Service Provider';
    const providerTitle = provider?.title || provider?.providerProfile?.specialty || 'Professional';
    const avatarEmoji = provider?.avatar || '🩺';

    return (
        <div className="msg-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <motion.div
                className="msg-modal-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* Header Banner */}
                <div className="msg-modal-header">
                    <div className="msg-provider-info">
                        <div className="msg-avatar-badge" style={{ position: 'relative' }}>
                            <span className="msg-avatar-emoji">{avatarEmoji}</span>
                            <span className={`msg-presence-badge ${isOnline ? 'msg-presence-badge--online' : 'msg-presence-badge--offline'}`} style={{ position: 'absolute', bottom: 0, right: 0 }} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 className="msg-provider-name" style={{ margin: 0 }}>{providerName}</h3>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: isOnline ? '#10b981' : 'var(--muted)' }}>
                                    {isOnline ? '● Active now' : '○ Offline'}
                                </span>
                            </div>
                            <p className="msg-provider-title" style={{ margin: '2px 0 0 0' }}>{providerTitle}</p>
                        </div>
                    </div>
                    <button className="msg-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Info Note */}
                <div className="msg-info-banner">
                    <MessageSquare size={16} className="msg-banner-icon" />
                    <span>Ask a question about availability, pricing, or specialized services.</span>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="msg-form">
                    {error && <div className="msg-error-box">⚠️ {error}</div>}

                    <div className="msg-field-group">
                        <label htmlFor="msg-content-input">
                            <span>💬 Your Message</span>
                            <span className="msg-char-count">{content.length}/500</span>
                        </label>
                        <textarea
                            id="msg-content-input"
                            className="msg-textarea"
                            rows={4}
                            maxLength={500}
                            placeholder={`Hi ${providerName.split(' ')[0]}, I would like to ask...`}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="msg-modal-actions">
                        <Button variant="ghost" type="button" onClick={onClose} disabled={sending}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={!content.trim() || sending}
                            style={{ minWidth: '150px' }}
                        >
                            {sending ? 'Sending...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Send Message <Send size={15} /></span>}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
