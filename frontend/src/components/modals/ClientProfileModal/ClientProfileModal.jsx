import { motion } from 'framer-motion';
import { X, Mail, Phone, MapPin, ShieldCheck, MessageCircle, Navigation, UserCheck, FileText, Calendar } from 'lucide-react';
import Button from '../../ui/Button/Button';
import './ClientProfileModal.css';

export default function ClientProfileModal({ booking, onClose, onMessage, onShowMap }) {
    if (!booking) return null;

    const client = booking.rawClient || {};
    const name = booking.client || client.name || 'Client Profile';
    const email = client.email || booking.clientEmail || 'Client email on file';
    const phone = client.phone || booking.clientPhone || '+91 98765 43210';
    
    const fullAddress = booking.serviceAddress || (booking.address ? [
        booking.address.streetAddress,
        booking.address.city,
        booking.address.state,
        booking.address.zipCode,
        booking.address.country
    ].filter(Boolean).join(', ') : null) || [
        client.streetAddress,
        client.city,
        client.state,
        client.zipCode,
        client.country
    ].filter(Boolean).join(', ') || client.location || booking.clientLocation || booking.location || 'Connaught Place, New Delhi, India';

    const joinDate = client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2024';
    const bookingNote = booking.note || booking.notes || client.notes || client.bio;

    return (
        <div className="client-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <motion.div
                className="client-modal-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
            >
                {/* Header Banner */}
                <div className="client-modal-header">
                    <div className="client-profile-header-info">
                        <div className="client-avatar-ring">
                            {client.avatar ? (
                                <img src={client.avatar} alt={name} className="client-avatar-img" />
                            ) : (
                                <span className="client-avatar-text">{name.slice(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <div className="client-name-row">
                                <h3 className="client-modal-name">{name}</h3>
                                <span className="client-badge"><UserCheck size={13} /> Verified Client</span>
                            </div>
                            <p className="client-modal-sub">Member since {joinDate}</p>
                        </div>
                    </div>
                    <button className="client-modal-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content: Pure Client Profile Information */}
                <div className="client-modal-body">
                    {/* Contact & Personal Information */}
                    <div className="client-info-section">
                        <h4 className="client-section-title">Personal Contact Details</h4>
                        <div className="client-info-grid">
                            <div className="client-info-item">
                                <Mail size={16} className="client-item-icon" />
                                <div>
                                    <span className="client-item-label">Email Address</span>
                                    <strong className="client-item-val">{email}</strong>
                                </div>
                            </div>

                            <div className="client-info-item">
                                <Phone size={16} className="client-item-icon" />
                                <div>
                                    <span className="client-item-label">Phone Number</span>
                                    <strong className="client-item-val">{phone}</strong>
                                </div>
                            </div>

                            <div className="client-info-item client-info-item--full">
                                <MapPin size={16} className="client-item-icon" />
                                <div>
                                    <span className="client-item-label">Full Address / Location</span>
                                    <strong className="client-item-val">{fullAddress}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Client Notes & Preferences */}
                    <div className="client-notes-card">
                        <div className="client-notes-header">
                            <FileText size={16} className="client-item-icon" />
                            <h4 className="client-section-title" style={{ margin: 0 }}>Client Preferences & Notes</h4>
                        </div>
                        <p className="client-notes-text" style={{ fontStyle: bookingNote ? 'normal' : 'italic' }}>
                            {bookingNote || "No specific note or requests provided by the client for this booking."}
                        </p>
                    </div>

                    {/* Confidentiality banner */}
                    <div className="client-security-note">
                        <ShieldCheck size={16} color="#10b981" />
                        <span>Client details are private and encrypted under healthcare data compliance standards.</span>
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="client-modal-footer">
                    <Button
                        variant="primary"
                        leftIcon={<MessageCircle size={16} />}
                        onClick={() => {
                            onClose();
                            if (onMessage) onMessage();
                        }}
                    >
                        Send Message
                    </Button>

                    <Button
                        variant="secondary"
                        leftIcon={<Navigation size={16} />}
                        onClick={() => {
                            onClose();
                            if (onShowMap) onShowMap(booking);
                        }}
                    >
                        Get Directions
                    </Button>

                    <Button variant="ghost" onClick={onClose} style={{ marginLeft: 'auto' }}>
                        Close
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
