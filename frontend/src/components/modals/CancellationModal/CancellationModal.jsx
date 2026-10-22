import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../../utils/toast';
import {
    AlertTriangle, X, CheckCircle2, Clock,
    HelpCircle, ShieldAlert, Calendar, User
} from 'lucide-react';
import Button from '../../ui/Button/Button';
import { appointmentApi } from '../../../api/appointments';
import { useAuth } from '../../../context/AuthContext';
import './CancellationModal.css';

const REASON_PRESETS = [
    'Schedule conflict / Work commitment',
    'Personal / Family emergency',
    'Health / Medical emergency',
    'Change of plans / No longer needed',
    'Provider unreachable / Requested reschedule',
    'Booked by mistake / Duplicate booking',
    'Other reason'
];

export default function CancellationModal({ appointment, onClose, onSuccess, userRole = 'CLIENT' }) {
    const { token } = useAuth();
    const [selectedReason, setSelectedReason] = useState(REASON_PRESETS[0]);
    const [customNote, setCustomNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!appointment) return null;

    let appointmentDate = new Date(appointment.rawDate || appointment.date);
    if ((isNaN(appointmentDate.getTime()) || (appointment.rawDate === undefined && appointment.time)) && appointment.date && appointment.time) {
        const combined = new Date(`${appointment.date} ${appointment.time}`);
        if (!isNaN(combined.getTime())) {
            appointmentDate = combined;
        }
    }
    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const remainingMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    const isPast = diffMs <= 0;
    const isUnder2Hours = diffHours < 2;
    const isClient = userRole === 'CLIENT';
    const isRestricted = isClient && (isPast || isUnder2Hours);

    const providerName = appointment.providerName || appointment.provider?.user?.name || appointment.provider || 'Assigned Specialist';
    const serviceName = appointment.serviceName || appointment.service?.name || appointment.service || 'Service Consultation';
    const appointmentId = appointment.id;
    const shortId = appointmentId?.slice(0, 8);

    const handleConfirmCancel = async (e) => {
        if (e) e.preventDefault();

        if (isRestricted) {
            toast.error('This appointment is within the 2-hour restriction window and cannot be cancelled online.');
            return;
        }

        const finalReason = selectedReason === 'Other reason'
            ? (customNote.trim() || 'Other reason')
            : (customNote.trim() ? `${selectedReason} - ${customNote.trim()}` : selectedReason);

        if (!finalReason) {
            toast.warning('Please select or provide a cancellation reason.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await appointmentApi.updateStatus(appointmentId, 'CANCELLED', token, {
                reason: finalReason,
                cancellationReason: finalReason
            });

            toast.success('Appointment has been cancelled according to policy.');
            if (onSuccess) onSuccess(res);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to cancel appointment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="cancel-modal-overlay animate-fade-in" onClick={onClose}>
            <motion.div
                className="cancel-modal-card"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="cancel-modal-header">
                    <div className="cancel-modal-header__title">
                        <div className="cancel-icon-wrapper">
                            <AlertTriangle size={22} className="cancel-warning-icon" />
                        </div>
                        <div>
                            <h3>Cancel Appointment</h3>
                            <p className="cancel-booking-id">Booking #{shortId}</p>
                        </div>
                    </div>
                    <button className="cancel-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Appointment Snapshot */}
                <div className="cancel-appt-snapshot">
                    <div className="cancel-snapshot-item">
                        <span className="cancel-snapshot-label">Service</span>
                        <strong>{serviceName}</strong>
                    </div>
                    <div className="cancel-snapshot-item">
                        <span className="cancel-snapshot-label">Specialist</span>
                        <strong>{providerName}</strong>
                    </div>
                    <div className="cancel-snapshot-item">
                        <span className="cancel-snapshot-label">Date & Time</span>
                        <strong>
                            {isNaN(appointmentDate.getTime()) ? 'Scheduled Time' : appointmentDate.toLocaleString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </strong>
                    </div>
                </div>

                {/* Grace Period Policy Warning */}
                <div className={`cancel-policy-box ${isRestricted ? 'cancel-policy-box--blocked' : ''}`}>
                    <div className="cancel-policy-box__header">
                        <ShieldAlert size={16} />
                        <strong>Platform Cancellation Policy & Grace Period</strong>
                    </div>
                    <p className="cancel-policy-desc">
                        To protect specialist schedules, appointments may only be cancelled up to <strong>2 hours</strong> before the scheduled appointment start time.
                    </p>

                    {isPast ? (
                        <div className="cancel-policy-status cancel-policy-status--past">
                            <Clock size={14} />
                            <span>This appointment was scheduled in the past and cannot be cancelled online.</span>
                        </div>
                    ) : isUnder2Hours ? (
                        <div className="cancel-policy-status cancel-policy-status--urgent">
                            <Clock size={14} />
                            <span>
                                {isClient
                                    ? `Cancellation window closed: Scheduled in ${remainingMinutes}m (less than 2h required). Please message your specialist or contact support.`
                                    : `Notice: Scheduled in ${remainingMinutes}m. As ${userRole.toLowerCase()}, you may still override.`}
                            </span>
                        </div>
                    ) : (
                        <div className="cancel-policy-status cancel-policy-status--ok">
                            <CheckCircle2 size={14} />
                            <span>Within policy grace period ({Math.floor(diffHours)}h {remainingMinutes % 60}m remaining until cutoff).</span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleConfirmCancel} className="cancel-modal-form">
                    <div className="cancel-form-group">
                        <label htmlFor="cancel-reason-select">
                            Select Reason for Cancellation <span className="cancel-required">*</span>
                        </label>
                        <select
                            id="cancel-reason-select"
                            className="cancel-select"
                            value={selectedReason}
                            onChange={(e) => setSelectedReason(e.target.value)}
                            disabled={isRestricted || submitting}
                        >
                            {REASON_PRESETS.map((reason) => (
                                <option key={reason} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="cancel-form-group">
                        <label htmlFor="cancel-custom-note">
                            Additional Details / Note (Optional)
                        </label>
                        <textarea
                            id="cancel-custom-note"
                            className="cancel-textarea"
                            placeholder="Please provide any helpful context for your specialist..."
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            disabled={isRestricted || submitting}
                            rows={3}
                            maxLength={300}
                        />
                        <span className="cancel-char-count">{customNote.length}/300</span>
                    </div>

                    {/* Actions */}
                    <div className="cancel-modal-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={submitting}
                        >
                            Keep Appointment
                        </Button>

                        <button
                            type="submit"
                            className="cancel-btn-confirm-destructive"
                            disabled={isRestricted || submitting}
                        >
                            {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
