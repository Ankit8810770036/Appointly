import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Search, Check, X, Compass, Globe } from 'lucide-react';
import Skeleton from '../../ui/Skeleton/Skeleton';
import { toast } from '../../../utils/toast';
import { detectCoordinatesAndAddress } from '../../../utils/geolocation';
import './LocationPromptModal.css';

// Pre-configured major hubs matching database seeded providers & client cities
export const POPULAR_CITIES = [
    { name: 'Delhi', location: 'Connaught Place, Delhi', lat: 28.6304, lng: 77.2177, tag: 'Capital' },
    { name: 'Mumbai', location: 'Bandra / Nariman Point, Mumbai', lat: 19.0596, lng: 72.8295, tag: 'Metro' },
    { name: 'Bengaluru', location: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408, tag: 'Tech Hub' },
    { name: 'Pune', location: 'Koregaon Park, Pune', lat: 18.5362, lng: 73.8930, tag: 'Metro' },
    { name: 'Chandigarh', location: 'Sector 17, Chandigarh', lat: 30.7333, lng: 76.7794, tag: 'North' },
    { name: 'Hyderabad', location: 'Banjara Hills, Hyderabad', lat: 17.3850, lng: 78.4867, tag: 'Metro' },
    { name: 'Ahmedabad', location: 'Navrangpura, Ahmedabad', lat: 23.0225, lng: 72.5714, tag: 'West' },
    { name: 'Jaipur', location: 'Malviya Nagar, Jaipur', lat: 26.9124, lng: 75.7873, tag: 'North' },
];

export default function LocationPromptModal({
    isOpen,
    onClose,
    onSelectLocation,
    currentLocation = null,
    canDismiss = true,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    if (!isOpen) return null;

    // 1. Detect via browser GPS or automatic IP fallback
    const handleDetectGPS = async () => {
        setIsDetecting(true);
        try {
            const locObj = await detectCoordinatesAndAddress();
            confirmLocation(locObj);
        } catch (err) {
            console.error('Location error:', err);
            toast.error(err.message || 'Could not detect location. Please choose a city below.');
        } finally {
            setIsDetecting(false);
        }
    };

    // 2. Search city / address via Nominatim
    const handleSearch = async (e) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;

        // Check local popular cities first
        const localMatch = POPULAR_CITIES.find(
            c => c.name.toLowerCase().includes(q.toLowerCase()) || c.location.toLowerCase().includes(q.toLowerCase())
        );
        if (localMatch) {
            confirmLocation(localMatch);
            return;
        }

        setIsSearching(true);
        setSearchResults([]);

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=5`
            );
            const data = await res.json();
            if (data && data.length > 0) {
                const results = data.map(item => ({
                    name: item.display_name.split(',')[0],
                    location: item.display_name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                }));
                setSearchResults(results);
            } else {
                toast.error(`No results found for "${q}". Try a major city.`);
            }
        } catch {
            toast.error('Search network error. Please select one of the cities below.');
        } finally {
            setIsSearching(false);
        }
    };

    // 3. Clear location filter (Show all locations / Nationwide)
    const handleClearLocation = () => {
        try {
            localStorage.removeItem('appointly_client_location');
        } catch {
            // Ignore
        }
        toast.info('Location filter cleared! Showing all providers across all locations.');
        onSelectLocation(null);
        if (onClose) onClose();
    };

    // 4. Confirm selection
    const confirmLocation = (loc) => {
        try {
            localStorage.setItem('appointly_client_location', JSON.stringify({
                lat: loc.lat,
                lng: loc.lng,
                name: loc.name || loc.location,
                city: loc.city || loc.name,
                setAt: new Date().toISOString(),
            }));
        } catch {
            // Ignored if storage unavailable
        }

        toast.success(`Location set to ${loc.name || loc.location}! Showing providers within 50 km.`);
        onSelectLocation(loc);
        if (onClose) onClose();
    };

    return (
        <div
            className="location-modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && canDismiss && onClose) {
                    onClose();
                }
            }}
        >
            <motion.div
                className="location-modal-card"
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
            >
                {/* Modal Header */}
                <div className="location-modal-header">
                    <div className="location-icon-badge">
                        <MapPin size={22} />
                    </div>
                    <div className="location-modal-titles">
                        <h2>Set Your Location</h2>
                        <p>Available specialists are filtered strictly within <strong>50 km</strong> of your chosen area.</p>
                    </div>
                    {canDismiss && onClose && (
                        <button
                            type="button"
                            className="location-modal-close"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* GPS Auto-Detect Button & Clear Filter Option */}
                <div className="location-detect-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        type="button"
                        className="location-gps-btn"
                        onClick={handleDetectGPS}
                        disabled={isDetecting}
                    >
                        {isDetecting ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                                <Skeleton variant="circle" width="12px" height="12px" />
                                <span style={{ color: 'var(--amber)' }}>Detecting your coordinates...</span>
                            </div>
                        ) : (
                            <>
                                <Navigation size={18} />
                                <span>Use Current Location (GPS)</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleClearLocation}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px dashed rgba(255, 255, 255, 0.18)',
                            borderRadius: '10px',
                            color: 'var(--amber, #f59e0b)',
                            fontSize: '0.88rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Globe size={16} />
                        <span>Show All Locations (Clear Distance Filter)</span>
                    </button>
                </div>

                <div className="location-divider-text">
                    <span>or search an area</span>
                </div>

                {/* Search Input */}
                <form className="location-search-box" onSubmit={handleSearch}>
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search city, area, or landmark..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="location-search-submit"
                        disabled={isSearching || !searchQuery.trim()}
                    >
                        {isSearching ? <Skeleton variant="rect" width="45px" height="16px" style={{ borderRadius: '4px' }} /> : 'Search'}
                    </button>
                </form>

                {/* Search Loading Skeleton */}
                {isSearching && (
                    <div className="location-search-results">
                        <span className="results-label">Searching locations...</span>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Skeleton variant="circle" width="16px" height="16px" />
                                <Skeleton variant="text" width={`${75 - i * 15}%`} height="14px" style={{ margin: 0 }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Results Dropdown */}
                {!isSearching && searchResults.length > 0 && (
                    <div className="location-search-results">
                        <span className="results-label">Matching Locations:</span>
                        {searchResults.map((r, i) => (
                            <button
                                key={i}
                                type="button"
                                className="location-result-row"
                                onClick={() => confirmLocation(r)}
                            >
                                <MapPin size={15} />
                                <div className="result-text">
                                    <strong>{r.name}</strong>
                                    <small>{r.location}</small>
                                </div>
                                <Check size={14} className="result-arrow" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Popular Cities Grid */}
                <div className="location-cities-section">
                    <div className="cities-head">
                        <Compass size={14} />
                        <span>Quick Select Major Hubs (50 km coverage):</span>
                    </div>
                    <div className="cities-grid">
                        <button
                            type="button"
                            className={`city-pill ${!currentLocation ? 'city-pill--selected' : ''}`}
                            onClick={handleClearLocation}
                            style={{ borderColor: !currentLocation ? 'var(--amber)' : undefined }}
                        >
                            <span className="city-name">🌐 All Cities</span>
                            <span className="city-tag">Nationwide</span>
                            {!currentLocation && <Check size={12} className="city-check" />}
                        </button>
                        {POPULAR_CITIES.map((city) => {
                            const isSelected = currentLocation && (
                                Math.abs(currentLocation.lat - city.lat) < 0.05 &&
                                Math.abs(currentLocation.lng - city.lng) < 0.05
                            );

                            return (
                                <button
                                    key={city.name}
                                    type="button"
                                    className={`city-pill ${isSelected ? 'city-pill--selected' : ''}`}
                                    onClick={() => confirmLocation(city)}
                                >
                                    <span className="city-name">{city.name}</span>
                                    <span className="city-tag">{city.tag}</span>
                                    {isSelected && <Check size={12} className="city-check" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="location-modal-footer">
                    <span>🛡️ Set a location to filter specialists within 50 km, or choose 'All Cities' to browse everywhere.</span>
                </div>
            </motion.div>
        </div>
    );
}
