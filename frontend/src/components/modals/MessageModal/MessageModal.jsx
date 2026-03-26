import { useState } from 'react';
import { toast } from 'sonner';
import Button from '../../ui/Button/Button';
import './MessageModal.css';
import { messageApi } from '../../../api/messages';
import { useAuth } from '../../../context/AuthContext';

export default function MessageModal({ provider, onClose, onSuccess }) {
    const { token } = useAuth();
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSending(true);
        setError('');
        try {
            await messageApi.send({
                receiverId: provider?.id || provider?.userId,
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content message-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Message {provider?.name}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="message-target">
                    <p>Have a question about their services? Ask below.</p>
                </div>

                <form onSubmit={handleSubmit} className="message-form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="settings-field">
                        <label>Your Message</label>
                        <textarea
                            className="auth-textarea"
                            rows={5}
                            placeholder="Type your question here..."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="modal-footer">
                        <Button variant="ghost" type="button" onClick={onClose} disabled={sending}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={sending} disabled={!content.trim()}>Send Message</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
