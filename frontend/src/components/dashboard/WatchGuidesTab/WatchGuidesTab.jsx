import React, { useState } from 'react';
import { Play, Settings, CheckCircle, Clock, CreditCard, Calendar, Sparkles } from 'lucide-react';
import Card from '../../ui/Card/Card';
import './WatchGuidesTab.css';

const GUIDES = [
    {
        id: 'provider-setup',
        title: 'Provider Setup & Profile',
        description: 'Set up your bio, specialty, location pin, and hourly prices.',
        icon: <Settings size={20} />,
        embedId: 'L_LUpnjgPso',
        duration: '2:15'
    },
    {
        id: 'provider-bookings',
        title: 'Managing Booking Requests',
        description: 'Accept, reject, and manage client appointment statuses.',
        icon: <CheckCircle size={20} />,
        embedId: 'L_LUpnjgPso',
        duration: '2:00'
    },
    {
        id: 'provider-schedule',
        title: 'Working Schedule & Time Slots',
        description: 'Customize working hours, slot intervals, and day-off exceptions.',
        icon: <Clock size={20} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:50'
    },
    {
        id: 'provider-earnings',
        title: 'Earnings & Payout Analytics',
        description: 'Track monthly revenue, payout history, and review ratings.',
        icon: <CreditCard size={20} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:30'
    },
    {
        id: 'booking',
        title: 'Client Booking Guide',
        description: 'How clients search for providers, choose slots, and book.',
        icon: <Calendar size={20} />,
        embedId: 'L_LUpnjgPso',
        duration: '1:45'
    }
];

export default function WatchGuidesTab() {
    const [selectedGuide, setSelectedGuide] = useState(GUIDES[0]);

    return (
        <div className="watch-guides-tab animate-fade-in">
            {/* Main Video Player Section */}
            <div className="guides-main-player-card">
                <div className="player-header-bar">
                    <span className="player-title">
                        <Play size={18} className="text-primary" /> {selectedGuide.title}
                    </span>
                    <span className="player-duration">⏱️ {selectedGuide.duration} video</span>
                </div>
                <div className="main-video-wrapper">
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
                <p className="player-description">{selectedGuide.description}</p>
            </div>

            {/* Video Selection Grid */}
            <div className="guides-grid-header">
                <h3><Sparkles size={18} className="text-primary" /> Video Guide Library</h3>
                <p>Click any guide below to watch the video</p>
            </div>

            <div className="guides-cards-grid">
                {GUIDES.map((guide) => (
                    <Card
                        key={guide.id}
                        variant={selectedGuide.id === guide.id ? 'primary' : 'default'}
                        className={`guide-card-tile ${selectedGuide.id === guide.id ? 'active-guide-tile' : ''}`}
                        onClick={() => setSelectedGuide(guide)}
                    >
                        <div className="guide-tile-icon">
                            {guide.icon}
                        </div>
                        <div className="guide-tile-content">
                            <h4>{guide.title}</h4>
                            <p>{guide.description}</p>
                            <span className="guide-tile-badge">⏱️ {guide.duration}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
