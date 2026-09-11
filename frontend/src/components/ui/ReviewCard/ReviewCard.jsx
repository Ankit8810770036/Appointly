import { Star } from 'lucide-react';
import './ReviewCard.css';

export default function ReviewCard({ review }) {
    const clientName = review?.appointment?.client?.name || review?.clientName || review?.name || 'Client Feedback';
    const clientAvatar = review?.appointment?.client?.avatar || review?.avatar;
    const rating = Math.max(1, Math.min(5, review?.rating || 5));

    let dateStr = '';
    if (review?.createdAt || review?.appointment?.date) {
        const rawDate = new Date(review.createdAt || review.appointment?.date);
        if (!isNaN(rawDate.getTime())) {
            dateStr = rawDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }

    const commentText = review?.comment || review?.text || "Very satisfied with the consultation. The provider was professional, clear in communication, and delivered excellent care.";

    const initials = clientName
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CL';

    return (
        <div className="review-card-compact">
            {/* Top Row: Profile Info & Stars */}
            <div className="review-card-header">
                <div className="review-card-user-info">
                    <div className="review-card-avatar">
                        {clientAvatar ? (
                            <img src={clientAvatar} alt={clientName} />
                        ) : (
                            <span className="review-card-avatar-text">{initials}</span>
                        )}
                    </div>
                    <div className="review-card-meta">
                        <strong className="review-card-author-name">{clientName}</strong>
                        {dateStr && <span className="review-card-date">{dateStr}</span>}
                    </div>
                </div>

                <div className="review-card-stars" aria-label={`${rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star
                            key={s}
                            size={14}
                            fill={s <= rating ? "#E2892F" : "rgba(203, 213, 225, 0.2)"}
                            stroke="none"
                        />
                    ))}
                </div>
            </div>

            {/* Comment Body */}
            <p className="review-comment-body">{commentText}</p>
        </div>
    );
}

