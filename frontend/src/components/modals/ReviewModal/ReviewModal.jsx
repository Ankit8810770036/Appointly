import { useState } from 'react';
import { toast } from 'sonner';
import Button from '../../ui/Button/Button';
import './ReviewModal.css';

export default function ReviewModal({ appointment, onClose, onSubmit }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit({ appointmentId: appointment.id, rating, comment });
            onClose();
        } catch (err) {
            // Error is already handled by onSubmit or can be caught here if needed
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Rate your experience</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="review-target">
                    <div className="review-provider-info">
                        <span className="review-avatar">🧑‍💼</span>
                        <div>
                            <div className="review-provider-name">{appointment.providerName}</div>
                            <div className="review-service-name">{appointment.serviceName}</div>
                        </div>
                    </div>
                    <div className="review-date">Completed on {appointment.date}</div>
                </div>

                <form onSubmit={handleSubmit} className="review-form">
                    <div className="rating-selector">
                        <label>Your Rating <span className="req">*</span></label>
                        <div className="stars" onMouseLeave={() => setHoverRating(0)}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    className={`star-btn ${(hoverRating || rating) >= s ? 'star-btn--active' : ''}`}
                                    onClick={() => setRating(s)}
                                    onMouseEnter={() => setHoverRating(s)}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        <span className="rating-desc">
                            {(hoverRating || rating) === 5 && 'Amazing! 🌟'}
                            {(hoverRating || rating) === 4 && 'Very Good! 👍'}
                            {(hoverRating || rating) === 3 && 'Average 😐'}
                            {(hoverRating || rating) === 2 && 'Poor 👎'}
                            {(hoverRating || rating) === 1 && 'Terrible 😠'}
                            {!(hoverRating || rating) && 'Select a rating to continue'}
                        </span>
                    </div>

                    <div className="settings-field">
                        <label>Your Feedback (Optional)</label>
                        <textarea
                            className="auth-textarea"
                            rows={4}
                            placeholder="Share your experience to help others..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer">
                        <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
                        <Button variant="primary" type="submit" loading={submitting} disabled={rating === 0}>Submit Review</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
