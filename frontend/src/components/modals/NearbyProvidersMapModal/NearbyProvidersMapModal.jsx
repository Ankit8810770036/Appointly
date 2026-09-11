import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { X, Navigation, MapPin, Search, Sliders, ChevronRight } from 'lucide-react';
import { detectCoordinatesAndAddress } from '../../../utils/geolocation';
import './NearbyProvidersMapModal.css';

// Fix for default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom User Pin Icon
const userMarkerIcon = L.divIcon({
    className: 'client-pin-container',
    html: `<div class="client-pulse-pin"><div class="client-pulse-dot"></div><div class="client-pulse-wave"></div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

// Custom Provider Pin Icon Creator
const createProviderIcon = (initial, isSelected) => {
    return L.divIcon({
        className: 'provider-pin-container',
        html: `<div class="provider-marker-badge ${isSelected ? 'provider-marker-badge--selected' : ''}">
                 <span class="provider-badge-initial">${initial}</span>
                 <div class="provider-marker-arrow"></div>
               </div>`,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42]
    });
};

// Haversine Distance in Kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

// Subcomponent to adjust map bounds/center when radius or location changes
function MapRecenter({ center, radiusKm }) {
    const map = useMap();
    const lat = center?.lat;
    const lng = center?.lng;

    useEffect(() => {
        if (!lat || !lng) return;
        
        // Calculate zoom level based on radius
        let zoom = 13;
        if (radiusKm <= 5) zoom = 14;
        else if (radiusKm <= 15) zoom = 12;
        else if (radiusKm <= 35) zoom = 11;
        else if (radiusKm <= 80) zoom = 10;
        else if (radiusKm <= 200) zoom = 8;
        else if (radiusKm <= 600) zoom = 6;
        else zoom = 5;

        map.flyTo([lat, lng], zoom, { duration: 1 });
    }, [lat, lng, radiusKm, map]);

    return null;
}

// Subcomponent to capture map click and relocate user pin
function MapClickHandler({ onLocationChange }) {
    useMapEvents({
        click(e) {
            onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });
    return null;
}

export default function NearbyProvidersMapModal({
    isOpen,
    onClose,
    providers = [],
    onSelectLocation,
    currentLocationName = ''
}) {
    const navigate = useNavigate();

    // Default to New Delhi (Connaught Place) coordinates if not detected
    const [userLocation, setUserLocation] = useState({ lat: 28.6304, lng: 77.2177 });
    const [locationLabel, setLocationLabel] = useState(currentLocationName || 'Connaught Place, Delhi');
    const [radiusKm, setRadiusKm] = useState(25); // Default 25 km (strictly 5, 10, 25, 50 km)
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedProviderId, setSelectedProviderId] = useState(null);

    // Strictly permitted radius options
    const RADIUS_PRESETS = [5, 10, 25, 50];

    // Auto-detect location when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setIsLocating(true);
        detectCoordinatesAndAddress()
            .then((loc) => {
                if (!isMounted) return;
                setUserLocation({ lat: loc.lat, lng: loc.lng });
                if (loc.name) setLocationLabel(loc.name);
            })
            .catch((err) => {
                console.warn('Map modal location detect failed:', err);
            })
            .finally(() => {
                if (isMounted) setIsLocating(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen]);

    // Calculate distance to each provider and filter within radius
    const nearbyProviders = useMemo(() => {
        if (!providers || !providers.length) return [];

        return providers
            .map(p => {
                const pLat = p.latitude || p.providerProfile?.latitude;
                const pLng = p.longitude || p.providerProfile?.longitude;

                if (!pLat || !pLng) return null;

                const distance = calculateDistanceKm(userLocation.lat, userLocation.lng, parseFloat(pLat), parseFloat(pLng));

                return {
                    ...p,
                    distanceKm: distance,
                    lat: parseFloat(pLat),
                    lng: parseFloat(pLng)
                };
            })
            .filter(p => p !== null && p.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }, [providers, userLocation, radiusKm]);

    // Handle Search Location input (Geocoding via OpenStreetMap)
    const handleSearchLocation = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearchingLocation(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const target = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setUserLocation(target);
                setLocationLabel(data[0].display_name.split(',')[0]);
                setSearchQuery('');
            }
        } catch (err) {
            console.error('Location search failed:', err);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    // Re-detect User Location
    const handleUseMyLocation = () => {
        if (!navigator.geolocation) return;
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(coords);
                setIsLocating(false);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`);
                    const data = await res.json();
                    if (data && data.address) {
                        const name = data.address.city || data.address.town || data.address.state || 'Your Location';
                        setLocationLabel(name);
                    }
                } catch {
                    setLocationLabel('Current Location');
                }
            },
            () => setIsLocating(false),
            { timeout: 8000 }
        );
    };

    // Click Provider -> Open Profile
    const handleOpenProfile = (providerId) => {
        if (onSelectLocation && locationLabel) {
            onSelectLocation(locationLabel);
        }
        onClose();
        navigate(`/provider/${providerId}`);
    };

    if (!isOpen) return null;

    return (
        <div className="nearby-map-overlay" onClick={onClose}>
            <div className="nearby-map-modal glass" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="nearby-map-header">
                    <div className="nearby-map-title-block">
                        <div className="nearby-map-badge">
                            <MapPin size={16} /> Live Specialist Radius Explorer
                        </div>
                        <h2 className="nearby-map-title">Find Providers Near You</h2>
                        <p className="nearby-map-subtitle">
                            Selected Area: <strong>{locationLabel}</strong> • Showing providers within <strong>{radiusKm} km</strong>
                        </p>
                    </div>
                    <button className="nearby-map-close-btn" onClick={onClose} aria-label="Close Map">
                        <X size={20} />
                    </button>
                </div>

                {/* Controls Bar: Location Search + Radius Slider + Presets */}
                <div className="nearby-map-controls">
                    {/* Location input & detect */}
                    <form className="nearby-location-search-form" onSubmit={handleSearchLocation}>
                        <Search size={16} className="nearby-search-icon" />
                        <input
                            type="text"
                            placeholder="Type city or area (e.g. Mumbai, Delhi, Bengaluru)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="nearby-location-input"
                        />
                        <button type="submit" className="nearby-location-submit-btn" disabled={isSearchingLocation}>
                            {isSearchingLocation ? '...' : 'Search'}
                        </button>
                        <button
                            type="button"
                            className={`nearby-gps-btn ${isLocating ? 'nearby-gps-btn--loading' : ''}`}
                            onClick={handleUseMyLocation}
                            title="Detect my current location"
                        >
                            <Navigation size={15} />
                            <span>{isLocating ? 'Locating...' : 'My Location'}</span>
                        </button>
                    </form>

                    {/* Radius Slider & Chips: Strictly 5, 10, 25, 50 km */}
                    <div className="nearby-radius-bar">
                        <div className="nearby-radius-slider-group">
                            <span className="nearby-radius-label">
                                <Sliders size={14} /> Radius: <strong>{radiusKm} km</strong>
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="1"
                                value={RADIUS_PRESETS.indexOf(radiusKm) !== -1 ? RADIUS_PRESETS.indexOf(radiusKm) : 2}
                                onChange={(e) => setRadiusKm(RADIUS_PRESETS[parseInt(e.target.value)])}
                                className="nearby-radius-range"
                                title="Select radius: 5, 10, 25, or 50 km"
                            />
                        </div>

                        <div className="nearby-radius-chips">
                            {RADIUS_PRESETS.map((km) => (
                                <button
                                    key={km}
                                    type="button"
                                    className={`nearby-radius-chip ${radiusKm === km ? 'nearby-radius-chip--active' : ''}`}
                                    onClick={() => setRadiusKm(km)}
                                >
                                    {km} km
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content: Leaflet Map + Provider Sidebar */}
                <div className="nearby-map-body">
                    {/* Map Panel */}
                    <div className="nearby-map-container">
                        <MapContainer
                            center={[userLocation.lat, userLocation.lng]}
                            zoom={11}
                            scrollWheelZoom={true}
                            style={{ width: '100%', height: '100%', borderRadius: '16px' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <MapRecenter center={userLocation} radiusKm={radiusKm} />
                            <MapClickHandler onLocationChange={setUserLocation} />

                            {/* Client Position Marker */}
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userMarkerIcon}>
                                <Popup>
                                    <div className="nearby-popup-client">
                                        <strong>📍 You are here</strong>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                                            Click anywhere on map to reposition
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Radius Circle in Meters */}
                            <Circle
                                center={[userLocation.lat, userLocation.lng]}
                                radius={radiusKm * 1000}
                                pathOptions={{
                                    color: '#4f46e5',
                                    fillColor: '#6366f1',
                                    fillOpacity: 0.12,
                                    weight: 2,
                                    dashArray: '6, 6'
                                }}
                            />

                            {/* Nearby Provider Markers */}
                            {nearbyProviders.map(p => {
                                const initial = p.name.charAt(0).toUpperCase();
                                const isSelected = selectedProviderId === p.id;
                                const minPrice = p.providerProfile?.services?.length > 0
                                    ? Math.min(...p.providerProfile.services.map(s => s.price))
                                    : null;

                                return (
                                    <Marker
                                        key={p.id}
                                        position={[p.lat, p.lng]}
                                        icon={createProviderIcon(initial, isSelected)}
                                        eventHandlers={{
                                            click: () => setSelectedProviderId(p.id)
                                        }}
                                    >
                                        <Popup>
                                            <div className="nearby-provider-popup">
                                                <div className="nearby-popup-header">
                                                    <div className="nearby-popup-avatar">{initial}</div>
                                                    <div>
                                                        <h4 className="nearby-popup-name">{p.name}</h4>
                                                        <span className="nearby-popup-spec">
                                                            {p.providerProfile?.specialty || 'Verified Specialist'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="nearby-popup-meta">
                                                    <span className="nearby-meta-rating">
                                                        ⭐ {p.providerProfile?.rating ?? 4.9}
                                                    </span>
                                                    <span className="nearby-meta-dist">
                                                        📍 {p.distanceKm} km away
                                                    </span>
                                                </div>

                                                {minPrice && (
                                                    <div className="nearby-popup-price">
                                                        <span>Starting from</span>
                                                        <strong>₹{minPrice}</strong>
                                                    </div>
                                                )}

                                                <button
                                                    className="nearby-popup-book-btn"
                                                    onClick={() => handleOpenProfile(p.id)}
                                                >
                                                    View Profile & Book →
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>

                        {/* Hint overlay */}
                        <div className="nearby-map-hint">
                            💡 Click anywhere on the map or drag to move your search location
                        </div>
                    </div>

                    {/* Sidebar Providers List */}
                    <div className="nearby-providers-sidebar">
                        <div className="nearby-sidebar-header">
                            <span className="nearby-results-badge">
                                {nearbyProviders.length} {nearbyProviders.length === 1 ? 'Provider' : 'Providers'} Found
                            </span>
                            <span className="nearby-radius-indicator">within {radiusKm} km</span>
                        </div>

                        <div className="nearby-cards-scroll">
                            {nearbyProviders.length === 0 ? (
                                <div className="nearby-empty-state">
                                    <div className="nearby-empty-icon">📍</div>
                                    <p>Try expanding your search area up to 50 km.</p>
                                    {radiusKm < 50 && (
                                        <button
                                            type="button"
                                            className="nearby-expand-btn"
                                            onClick={() => {
                                                const nextMap = { 5: 10, 10: 25, 25: 50 };
                                                setRadiusKm(nextMap[radiusKm] || 50);
                                            }}
                                        >
                                            Expand to {radiusKm === 5 ? '10 km' : radiusKm === 10 ? '25 km' : '50 km'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                nearbyProviders.map(p => {
                                    const initial = p.name.charAt(0).toUpperCase();
                                    const minPrice = p.providerProfile?.services?.length > 0
                                        ? Math.min(...p.providerProfile.services.map(s => s.price))
                                        : null;
                                    const isSelected = selectedProviderId === p.id;

                                    return (
                                        <div
                                            key={p.id}
                                            className={`nearby-provider-card ${isSelected ? 'nearby-provider-card--active' : ''}`}
                                            onClick={() => handleOpenProfile(p.id)}
                                        >
                                            <div className="nearby-card-top">
                                                <div className="nearby-card-avatar">{initial}</div>
                                                <div className="nearby-card-details">
                                                    <h4 className="nearby-card-name">{p.name}</h4>
                                                    <span className="nearby-card-specialty">
                                                        {p.providerProfile?.specialty || 'Professional'}
                                                    </span>
                                                    <div className="nearby-card-location">
                                                        📍 {p.location || p.city || 'India'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="nearby-card-bottom">
                                                <div className="nearby-card-stats">
                                                    <span className="nearby-stat-rating">⭐ {p.providerProfile?.rating ?? 4.9}</span>
                                                    <span className="nearby-stat-distance">⚡ {p.distanceKm} km away</span>
                                                </div>

                                                {minPrice && (
                                                    <div className="nearby-card-price">
                                                        ₹{minPrice}
                                                    </div>
                                                )}

                                                <div className="nearby-card-arrow">
                                                    <ChevronRight size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
