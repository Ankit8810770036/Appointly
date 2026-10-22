import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Download, ExternalLink, ChevronDown, Check } from 'lucide-react';
import {
    buildGoogleCalendarUrl,
    buildOutlookLiveUrl,
    buildOffice365Url,
    buildYahooCalendarUrl,
    downloadIcsCalendarFile
} from '../../../utils/calendarExport';
import './CalendarExportDropdown.css';

/**
 * 1-Click Calendar Export Dropdown Component
 * @param {Object} props
 * @param {string} props.title - Event title e.g. "Dental Consultation with Dr. Smith"
 * @param {string} props.details - Event notes & description
 * @param {string} props.location - Service address / online consultation link
 * @param {string|Date} props.startDate - ISO string or Date object
 * @param {number} [props.durationMinutes=30] - Duration in minutes
 * @param {string} [props.buttonText="Add to Calendar"]
 * @param {string} [props.variant="primary"] - "primary" | "outline" | "secondary" | "ghost"
 * @param {string} [props.size="md"] - "sm" | "md" | "lg"
 */
export default function CalendarExportDropdown({
    title,
    details,
    location,
    startDate,
    durationMinutes = 30,
    buttonText = 'Add to Calendar',
    variant = 'outline',
    size = 'md',
    fullWidth = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const eventPayload = {
        title,
        details,
        location,
        startDate,
        durationMinutes
    };

    const handleGoogle = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const url = buildGoogleCalendarUrl(eventPayload);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOutlook = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const url = buildOutlookLiveUrl(eventPayload);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOffice365 = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const url = buildOffice365Url(eventPayload);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleYahoo = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        const url = buildYahooCalendarUrl(eventPayload);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleAppleIcs = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        downloadIcsCalendarFile({
            ...eventPayload,
            filename: `${(title || 'appointly-booking').toLowerCase().replace(/[^a-z0-9]/g, '-')}.ics`
        });
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
    };

    return (
        <div ref={containerRef} className={`cal-export-container ${fullWidth ? 'cal-export-container--full' : ''} ${className}`}>
            <button
                type="button"
                className={`cal-export-btn cal-export-btn--${variant} cal-export-btn--${size} ${fullWidth ? 'cal-export-btn--full' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <Calendar size={14} className="cal-btn-icon" />
                <span>{downloaded ? 'Calendar Downloaded ✓' : buttonText}</span>
                <ChevronDown size={13} className={`cal-chevron ${isOpen ? 'cal-chevron--open' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="cal-export-menu"
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                    >
                        <div className="cal-menu-header">
                            <span>1-Click Calendar Sync</span>
                        </div>

                        <div className="cal-menu-items">
                            {/* Google Calendar */}
                            <button type="button" className="cal-item-btn" onClick={handleGoogle}>
                                <div className="cal-item-icon-box gcal-box">
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="#4285F4" d="M19.5 3h-15C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5z"/>
                                        <path fill="#FFF" d="M12 7v5.5l4 2.5-.75 1.23L10.5 13.5V7H12z"/>
                                    </svg>
                                </div>
                                <div className="cal-item-text">
                                    <span className="cal-item-name">Google Calendar</span>
                                    <span className="cal-item-hint">Direct Web Sync</span>
                                </div>
                                <ExternalLink size={13} className="cal-item-action-icon" />
                            </button>

                            {/* Apple Calendar / iCal */}
                            <button type="button" className="cal-item-btn" onClick={handleAppleIcs}>
                                <div className="cal-item-icon-box apple-box">
                                    <Download size={14} />
                                </div>
                                <div className="cal-item-text">
                                    <span className="cal-item-name">Apple Calendar / iCal</span>
                                    <span className="cal-item-hint">Universal .ics file</span>
                                </div>
                                {downloaded ? <Check size={13} className="cal-item-check" /> : <Download size={13} className="cal-item-action-icon" />}
                            </button>

                            {/* Microsoft Outlook Web */}
                            <button type="button" className="cal-item-btn" onClick={handleOutlook}>
                                <div className="cal-item-icon-box outlook-box">
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="#0078D4" d="M22 6.5v11c0 .8-.7 1.5-1.5 1.5H9.5c-.8 0-1.5-.7-1.5-1.5V16l14-5.5V6.5z"/>
                                        <path fill="#106EBE" d="M22 6.5L8 12V6.5C8 5.7 8.7 5 9.5 5h11c.8 0 1.5.7 1.5 1.5z"/>
                                        <path fill="#005A9E" d="M8 8H2.5C1.7 8 1 8.7 1 9.5v5c0 .8.7 1.5 1.5 1.5H8V8z"/>
                                        <path fill="#FFF" d="M4.5 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                                    </svg>
                                </div>
                                <div className="cal-item-text">
                                    <span className="cal-item-name">Outlook Web</span>
                                    <span className="cal-item-hint">Live / Hotmail</span>
                                </div>
                                <ExternalLink size={13} className="cal-item-action-icon" />
                            </button>

                            {/* Microsoft Office 365 */}
                            <button type="button" className="cal-item-btn" onClick={handleOffice365}>
                                <div className="cal-item-icon-box office-box">
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                        <path fill="#D83B01" d="M21.5 4h-19C1.7 4 1 4.7 1 5.5v13c0 .8.7 1.5 1.5 1.5h19c.8 0 1.5-.7 1.5-1.5v-13c0-.8-.7-1.5-1.5-1.5z"/>
                                        <path fill="#FFF" d="M12 7l5 5-5 5V7z"/>
                                    </svg>
                                </div>
                                <div className="cal-item-text">
                                    <span className="cal-item-name">Office 365</span>
                                    <span className="cal-item-hint">Work & Enterprise</span>
                                </div>
                                <ExternalLink size={13} className="cal-item-action-icon" />
                            </button>

                            {/* Yahoo Calendar */}
                            <button type="button" className="cal-item-btn" onClick={handleYahoo}>
                                <div className="cal-item-icon-box yahoo-box">
                                    <span style={{ fontSize: '11px', fontWeight: '900', color: '#7B0099' }}>Y!</span>
                                </div>
                                <div className="cal-item-text">
                                    <span className="cal-item-name">Yahoo Calendar</span>
                                    <span className="cal-item-hint">Yahoo Mail Sync</span>
                                </div>
                                <ExternalLink size={13} className="cal-item-action-icon" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
