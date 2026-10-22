import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from '../../../utils/toast';
import {
    X, Copy, Check, Calendar, Clock, MapPin, User,
    FileText, Phone, Mail, Sparkles, Star, AlertTriangle,
    ShieldAlert, CheckCircle2, XCircle, Hourglass, ArrowRight,
    ExternalLink, Edit3, ShieldCheck
} from 'lucide-react';
import Button from '../../ui/Button/Button';
import Badge from '../../ui/Badge/Badge';
import Card from '../../ui/Card/Card';
import Skeleton from '../../ui/Skeleton/Skeleton';
import { adminApi } from '../../../api/admin';
import { useAuth } from '../../../context/AuthContext';
import './BookingDetailsModal.css';

export default function BookingDetailsModal({
    appointmentId,
    initialData = null,
    onClose,
    onStatusUpdated,
    onOpenDisputeResolution
}) {
    const { token } = useAuth();
    const [appointment, setAppointment] = useState(initialData);
    const [loading, setLoading] = useState(!initialData && !!appointmentId);
    const [copied, setCopied] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [adminNote, setAdminNote] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const activeId = appointment?.id || appointmentId;
    const shortId = activeId ? `#APT-${activeId.replace(/-/g, '').slice(0, 8).toUpperCase()}` : 'N/A';

    useEffect(() => {
        if (!appointmentId && !initialData) return;
        if (!initialData && appointmentId) {
            setLoading(true);
            adminApi.getAppointmentById(appointmentId, token)
                .then(data => {
                    setAppointment(data);
                    setSelectedStatus(data.status);
                })
                .catch(err => {
                    toast.error(err.message || 'Could not load appointment details');
                })
                .finally(() => setLoading(false));
        } else if (initialData) {
            setAppointment(initialData);
            setSelectedStatus(initialData.status);
        }
    }, [appointmentId, initialData, token]);

    const handleCopy = () => {
        if (!activeId) return;
        navigator.clipboard.writeText(activeId);
        setCopied(true);
        toast.success(`Copied Booking ID: ${shortId}`);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStatusChange = async (newStatus) => {
        if (!activeId) return;
        let reason = null;
        if (newStatus === 'CANCELLED') {
            reason = window.prompt('Enter cancellation / refund reason for the client and provider (recorded in audit trail):', 'Admin cancelled & processed refund');
            if (!reason || !reason.trim()) {
                toast.warning('A reason is required to cancel or override an appointment.');
                return;
            }
        }
        setUpdatingStatus(true);
        try {
            const res = await adminApi.updateAppointmentStatus(activeId, newStatus, adminNote, token, reason ? reason.trim() : null);
            toast.success(res.message || `Status updated to ${newStatus}`);
            setAppointment(prev => ({
                ...prev,
                status: newStatus,
                note: adminNote || prev.note,
                cancellationReason: reason ? reason.trim() : prev.cancellationReason,
                cancelledBy: newStatus === 'CANCELLED' ? 'ADMIN' : prev.cancelledBy
            }));
            setSelectedStatus(newStatus);
            if (onStatusUpdated) onStatusUpdated(res.appointment);
        } catch (err) {
            toast.error(err.message || 'Failed to update appointment status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const client = appointment?.client;
    const provider = appointment?.provider?.user || appointment?.provider;
    const specialty = appointment?.provider?.specialty || 'Specialist';
    const service = appointment?.service;
    const review = appointment?.review;
    const complaints = appointment?.complaints || [];

    const statusBadgeMap = {
        COMPLETED: { label: 'Completed & Done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
        CONFIRMED: { label: 'Confirmed Booking', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
        PENDING: { label: 'Pending Confirmation', color: '#e2892f', bg: 'rgba(226, 137, 47, 0.15)' },
        CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    };

    const currentStatus = statusBadgeMap[appointment?.status] || statusBadgeMap.PENDING;

    return (
        <div className="bdm-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <motion.div
                className="bdm-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="bdm-header">
                    <div className="bdm-header-left">
                        <div className="bdm-id-pill" onClick={handleCopy} title="Click to copy full Booking UUID">
                            <span className="bdm-short-id">{shortId}</span>
                            <span className="bdm-copy-btn">
                                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                            </span>
                        </div>
                        <div className="bdm-status-badge" style={{ color: currentStatus.color, background: currentStatus.bg, border: `1px solid ${currentStatus.color}40` }}>
                            ● {currentStatus.label}
                        </div>
                    </div>
                    <button className="bdm-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem' }}>
                        <Skeleton height="40px" count={4} />
                    </div>
                ) : !appointment ? (
                    <div className="bdm-empty">
                        <AlertTriangle size={36} color="#ef4444" />
                        <p>No appointment details found for this Booking ID.</p>
                    </div>
                ) : (
                    <div className="bdm-body">
                        {/* Summary Banner */}
                        <div className="bdm-summary-banner">
                            <div className="bdm-summary-item">
                                <span className="bdm-summary-label">Service</span>
                                <strong className="bdm-summary-val">{service?.name || 'General Consultation'}</strong>
                                <span className="bdm-summary-sub">₹{service?.price || 0} • {service?.duration || 30} mins</span>
                            </div>
                            <div className="bdm-summary-item">
                                <span className="bdm-summary-label">Scheduled Date & Time</span>
                                <strong className="bdm-summary-val">
                                    {new Date(appointment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </strong>
                                <span className="bdm-summary-sub">
                                    {new Date(appointment.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="bdm-summary-item">
                                <span className="bdm-summary-label">Service Location</span>
                                <strong className="bdm-summary-val" style={{ fontSize: '0.85rem' }}>
                                    {appointment.serviceAddress || provider?.location || 'Office / Clinic'}
                                </strong>
                            </div>
                        </div>

                        {/* Cancellation Alert Banner */}
                        {appointment.status === 'CANCELLED' && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '10px',
                                padding: '0.85rem 1.15rem',
                                margin: '1rem 0',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ fontSize: '0.84rem' }}>
                                    <strong style={{ color: '#ef4444' }}>
                                        Cancelled {appointment.cancelledBy ? `by ${appointment.cancelledBy}` : ''}:
                                    </strong>{' '}
                                    <span style={{ color: 'var(--text-main, #f8fafc)' }}>
                                        {appointment.cancellationReason || 'No specific cancellation reason provided'}
                                    </span>
                                    {appointment.cancelledAt && (
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
                                            Cancelled on {new Date(appointment.cancelledAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Two Columns: Client & Provider */}
                        <div className="bdm-parties-grid">
                            {/* Client Column */}
                            <div className="bdm-party-card">
                                <div className="bdm-party-header">
                                    <span className="bdm-party-tag">CLIENT DETAILS</span>
                                    {client?.id && <span className="bdm-party-sub">ID: {client.id.slice(0, 8)}</span>}
                                </div>
                                <div className="bdm-party-info">
                                    <div className="bdm-avatar">
                                        {client?.avatarUrl ? (
                                            <img src={client.avatarUrl} alt={client.name} />
                                        ) : (
                                            <span>{client?.name?.charAt(0) || 'C'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="bdm-party-name">{client?.name || 'Client Name'}</h4>
                                        <div className="bdm-meta-line"><Mail size={13} /> {client?.email || 'No email'}</div>
                                        <div className="bdm-meta-line"><Phone size={13} /> {client?.phone || 'No phone provided'}</div>
                                        <div className="bdm-meta-line"><MapPin size={13} /> {[client?.city, client?.state].filter(Boolean).join(', ') || client?.location || 'Location on file'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Column */}
                            <div className="bdm-party-card">
                                <div className="bdm-party-header">
                                    <span className="bdm-party-tag">SPECIALIST / PROVIDER</span>
                                    <Badge variant="primary" size="sm">{specialty}</Badge>
                                </div>
                                <div className="bdm-party-info">
                                    <div className="bdm-avatar">
                                        {provider?.avatarUrl ? (
                                            <img src={provider.avatarUrl} alt={provider.name} />
                                        ) : (
                                            <span>{provider?.name?.charAt(0) || 'P'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="bdm-party-name">{provider?.name || 'Provider Name'}</h4>
                                        <div className="bdm-meta-line"><Mail size={13} /> {provider?.email || 'No email'}</div>
                                        <div className="bdm-meta-line"><Phone size={13} /> {provider?.phone || 'No phone'}</div>
                                        <div className="bdm-meta-line"><MapPin size={13} /> {provider?.streetAddress || provider?.location || 'Clinic Address'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Client Note if present */}
                        {appointment.note && (
                            <div className="bdm-section-box">
                                <div className="bdm-section-title"><FileText size={15} /> Client Note / Special Requests:</div>
                                <p className="bdm-note-text">"{appointment.note}"</p>
                            </div>
                        )}

                        {/* Review / Feedback if present */}
                        {review && (
                            <div className="bdm-section-box">
                                <div className="bdm-section-title" style={{ color: '#f59e0b' }}>
                                    <Star size={15} fill="#f59e0b" /> Client Rating & Review: {review.rating}/5 Stars
                                </div>
                                <p className="bdm-note-text">"{review.comment || 'No comment provided.'}"</p>
                            </div>
                        )}

                        {/* Complaints & Disputes if present */}
                        {complaints.length > 0 && (
                            <div className="bdm-dispute-box">
                                <div className="bdm-dispute-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldAlert size={18} color="#ef4444" />
                                        <strong style={{ color: '#ef4444' }}>{complaints.length} Dispute / Complaint Ticket(s) Logged</strong>
                                    </div>
                                </div>
                                <div className="bdm-complaints-list">
                                    {complaints.map(comp => (
                                        <div key={comp.id} className="bdm-complaint-item">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <strong>{comp.subject}</strong>
                                                <span className="bdm-comp-status">[{comp.status}]</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1' }}>{comp.description}</p>
                                            {comp.adminNotes && (
                                                <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#10b981' }}>
                                                    Admin Resolution: {comp.adminNotes}
                                                </div>
                                            )}
                                            {onOpenDisputeResolution && (
                                                <button
                                                    className="bdm-comp-resolve-btn"
                                                    onClick={() => {
                                                        onClose();
                                                        onOpenDisputeResolution(comp);
                                                    }}
                                                >
                                                    Resolve in Disputes Tab →
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Admin Action Bar (Override / Resolve) */}
                        <div className="bdm-admin-actions-card">
                            <div className="bdm-admin-action-header">
                                <ShieldCheck size={16} /> Admin Service Resolution & Status Override
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                                If there is a dispute or booking issue, Admin can override the service status and record a resolution note.
                            </p>

                            <div className="bdm-action-buttons-grid">
                                <button
                                    className={`bdm-status-btn ${appointment.status === 'COMPLETED' ? 'active-completed' : ''}`}
                                    disabled={updatingStatus}
                                    onClick={() => handleStatusChange('COMPLETED')}
                                >
                                    <CheckCircle2 size={14} /> Mark as Done / Verified
                                </button>
                                <button
                                    className={`bdm-status-btn ${appointment.status === 'CONFIRMED' ? 'active-confirmed' : ''}`}
                                    disabled={updatingStatus}
                                    onClick={() => handleStatusChange('CONFIRMED')}
                                >
                                    <Check size={14} /> Mark Confirmed
                                </button>
                                <button
                                    className={`bdm-status-btn ${appointment.status === 'PENDING' ? 'active-pending' : ''}`}
                                    disabled={updatingStatus}
                                    onClick={() => handleStatusChange('PENDING')}
                                >
                                    <Hourglass size={14} /> Reset to Pending
                                </button>
                                <button
                                    className={`bdm-status-btn ${appointment.status === 'CANCELLED' ? 'active-cancelled' : ''}`}
                                    disabled={updatingStatus}
                                    onClick={() => handleStatusChange('CANCELLED')}
                                >
                                    <XCircle size={14} /> Cancel & Refund
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
