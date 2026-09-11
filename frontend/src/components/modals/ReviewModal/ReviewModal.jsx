import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, UserRound, Sparkles, Calendar, CheckCircle2 } from 'lucide-react';
import Button from '../../ui/Button/Button';
import './ReviewModal.css';

export default function ReviewModal({ appointment, onClose, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!appointment) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await onSubmit({ appointmentId: appointment.id, rating, comment });
            onClose();
        } catch {
            // Error is handled by parent / toast
        } finally {
            setSubmitting(false);
        }
    };

    const activeRating = hoverRating || rating;

    const RATING_FEEDBACK = {
        5: { label: 'Exceptional Experience! 🌟', color: '#f59e0b' },
        4: { label: 'Very Good & Professional 👍', color: '#10b981' },
        3: { label: 'Average Consultation 😐', color: '#94a3b8' },
        2: { label: 'Below Expectations 👎', color: '#f97316' },
        1: { label: 'Unsatisfactory Service 😠', color: '#ef4444' }
    };

    return (
        <div className="review-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <motion.div
                className="review-modal-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.93, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="review-modal-header">
                    <div className="review-modal-header-left">
                        <div className="review-header-icon-badge">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h3 className="review-modal-title">Rate Your Experience</h3>
                            <p className="review-modal-subtitle">Your feedback helps improve service quality</p>
                        </div>
                    </div>
                    <button className="review-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Provider & Appointment Target Card */}
                <div className="review-appointment-target">
                    <div className="review-avatar-ring">
                        <UserRound size={20} />
                    </div>
                    <div className="review-target-info">
                        <h4 className="review-target-provider">{appointment.providerName || appointment.provider || 'Provider'}</h4>
                        <span className="review-target-service">{appointment.serviceName || appointment.service || 'Consultation Service'}</span>
                    </div>
                    <div className="review-target-meta">
                        <Calendar size={13} />
                        <span>Completed on {appointment.date}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="review-form">
                    {/* Star Rating Selector */}
                    <div className="rating-selector-block">
                        <span className="rating-block-label">Your Rating <span className="req-asterisk">*</span></span>
                        
                        <div className="rating-stars-row" onMouseLeave={() => setHoverRating(0)}>
                            {[1, 2, 3, 4, 5].map(s => {
                                const isFilled = activeRating >= s;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`review-star-btn ${isFilled ? 'review-star-btn--filled' : ''}`}
                                        onClick={() => setRating(s)}
                                        onMouseEnter={() => setHoverRating(s)}
                                        aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                                    >
                                        <Star
                                            size={32}
                                            fill={isFilled ? 'var(--amber, #f59e0b)' : 'transparent'}
                                            stroke={isFilled ? 'var(--amber, #f59e0b)' : 'rgba(255, 255, 255, 0.25)'}
                                            strokeWidth={1.75}
                                        />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="rating-feedback-badge" style={{ color: activeRating ? RATING_FEEDBACK[activeRating]?.color : 'var(--muted)' }}>
                            {activeRating ? RATING_FEEDBACK[activeRating]?.label : 'Select a rating to continue'}
                        </div>
                    </div>

                    {/* Feedback Textarea */}
                    <div className="review-input-group">
                        <div className="review-input-header">
                            <label htmlFor="review-comment">Your Feedback (Optional)</label>
                            <span className="review-char-count">{comment.length} / 500</span>
                        </div>
                        <textarea
                            id="review-comment"
                            className="review-textarea"
                            rows={3}
                            maxLength={500}
                            placeholder="Share specific details about punctuality, service quality, or communication..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="review-modal-footer">
                        <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            loading={submitting}
                            disabled={rating === 0 || submitting}
                            style={{ minWidth: '150px' }}
                        >
                            Submit Review
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
