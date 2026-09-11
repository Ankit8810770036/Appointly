import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Calendar, Settings, CheckCircle, Clock, CreditCard } from 'lucide-react';
import './VideoGuideModal.css';

const GUIDES = [
    {
        id: 'provider-setup',
        title: 'Provider Setup & Profile',
        icon: <Settings size={18} />,
        embedId: 'L_LUpnjgPso',
        duration: '2:15'
    },
    {
        id: 'provider-bookings',
        title: 'Managing Bookings',
        icon: <CheckCircle size={18} />,
        embedId: 'L_LUpnjgPso',
        duration: '2:00'
    },
    {
        id: 'provider-schedule',
        title: 'Working Schedule & Slots',
        icon: <Clock size={18} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:50'
    },
    {
        id: 'provider-earnings',
        title: 'Earnings & Payouts',
        icon: <CreditCard size={18} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:30'
    },
    {
        id: 'booking',
        title: 'Client Booking Guide',
        icon: <Calendar size={18} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:45'
    }
];

const VideoGuideModal = ({ onClose }) => {
    const [selectedGuide, setSelectedGuide] = useState(GUIDES[0]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="video-guide-modal glass"
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="video-guide-modal__header">
                    <div className="video-guide-modal__title-area">
                        <div className="title-icon-badge">
                            <Play size={18} />
                        </div>
                        <div>
                            <h2>{selectedGuide.title}</h2>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        <X size={18} />
                    </button>
                </div>

                {/* Content Body: Left Guide List + Right Video ONLY */}
                <div className="video-guide-modal__content">
                    {/* Left: Guide Selector List */}
                    <div className="video-guide-modal__sidebar">
                        {GUIDES.map((guide) => (
                            <div
                                key={guide.id}
                                className={`video-guide-item ${selectedGuide.id === guide.id ? 'video-guide-item--active' : ''}`}
                                onClick={() => setSelectedGuide(guide)}
                            >
                                <div className="video-guide-item__icon">
                                    {guide.icon}
                                </div>
                                <div className="video-guide-item__info">
                                    <span className="video-guide-item__title">{guide.title}</span>
                                    <span className="video-guide-item__duration">{guide.duration}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: YouTube Video ONLY */}
                    <div className="video-guide-modal__player">
                        <div className="video-player-wrapper">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube-nocookie.com/embed/${selectedGuide.embedId}?autoplay=1&rel=0&modestbranding=1`}
                                title={selectedGuide.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default VideoGuideModal;
