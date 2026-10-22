import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../../utils/toast';
import { ShieldAlert, AlertTriangle, X, Send, CheckCircle2, FileText, User, Wrench, Clock, CreditCard } from 'lucide-react';
import Button from '../../ui/Button/Button';
import { complaintApi } from '../../../api/complaints';
import { useAuth } from '../../../context/AuthContext';
import './ComplaintModal.css';

const CATEGORIES = [
    { value: 'SERVICE_QUALITY', label: 'Service Quality', icon: Wrench },
    { value: 'NO_SHOW', label: 'Provider No-Show', icon: Clock },
    { value: 'BILLING', label: 'Billing / Overcharge', icon: CreditCard },
    { value: 'BEHAVIOR', label: 'Unprofessional Conduct', icon: AlertTriangle },
    { value: 'OTHER', label: 'Other Issue', icon: FileText }
];

export default function ComplaintModal({ appointment, provider, onClose, onSuccess }) {
    const { token } = useAuth();
    const [category, setCategory] = useState('SERVICE_QUALITY');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const providerName = appointment?.providerName || appointment?.provider || provider?.name || 'Assigned Provider';
    const serviceName = appointment?.serviceName || appointment?.service || 'Consultation / Service';
    const apptId = appointment?.id || null;
    const providerId = appointment?.providerId || provider?.id || provider?.userId || null;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!subject.trim()) {
            toast.warning('Please enter a brief subject for your complaint.');
            return;
        }
        if (!description.trim() || description.trim().length < 10) {
            toast.warning('Please provide at least 10 characters describing the problem.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await complaintApi.create({
                appointmentId: apptId,
                providerId: providerId,
                category,
                subject: subject.trim(),
                description: description.trim()
            }, token);

            toast.success('Your complaint has been submitted directly to the Admin Portal.');
            if (onSuccess) onSuccess(res.complaint);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to file complaint');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="complaint-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <motion.div
                className="complaint-modal-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="complaint-modal-header">
                    <div className="complaint-header-left">
                        <div className="complaint-icon-badge">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="complaint-modal-title">File Issue with Admin</h3>
                            <p className="complaint-modal-subtitle">Direct escalation to Appointly Admin & Support</p>
                        </div>
                    </div>
                    <button className="complaint-modal-close" onClick={onClose} aria-label="Close modal">
                        <X size={18} />
                    </button>
                </div>

                {/* Info Card */}
                <div className="complaint-context-card">
                    <div className="context-item">
                        <User size={14} className="context-icon" />
                        <span>Provider: <strong>{providerName}</strong></span>
                    </div>
                    {serviceName && (
                        <div className="context-item">
                            <FileText size={14} className="context-icon" />
                            <span>Service: <strong>{serviceName}</strong></span>
                        </div>
                    )}
                    {apptId && (
                        <div className="context-item context-item--id">
                            <span>Booking ID: <code className="booking-ref-code">#{apptId.slice(0, 8)}</code></span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form className="complaint-form" onSubmit={handleSubmit}>
                    {/* Category Selector */}
                    <div className="complaint-field-group">
                        <label className="complaint-label">Issue Category</label>
                        <div className="complaint-category-grid">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`category-pill ${category === cat.value ? 'category-pill--active' : ''}`}
                                    onClick={() => setCategory(cat.value)}
                                >
                                    <span className="cat-icon"><cat.icon size={15} /></span>
                                    <span className="cat-label">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="complaint-field-group">
                        <label className="complaint-label">Subject</label>
                        <input
                            type="text"
                            className="complaint-input"
                            placeholder="e.g. Specialist was 45 minutes late / Incorrect charge"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            maxLength={150}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="complaint-field-group">
                        <label className="complaint-label">Describe What Happened</label>
                        <textarea
                            className="complaint-textarea"
                            placeholder="Provide specific details about the service issue so the admin team can investigate and take appropriate action..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={4}
                            maxLength={1500}
                            required
                        />
                        <span className="char-counter">{description.length}/1500</span>
                    </div>

                    {/* Guarantee note */}
                    <div className="complaint-notice">
                        <AlertTriangle size={15} className="notice-icon" />
                        <p>
                            Admins directly review every dispute. You can track status and admin notes in your dashboard.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="complaint-modal-actions">
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={submitting}
                            className="complaint-submit-btn"
                        >
                            {submitting ? 'Submitting to Admin...' : (
                                <>
                                    <Send size={15} /> Escalate to Admin
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
