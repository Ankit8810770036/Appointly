import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
    X, Navigation, MapPin, Search, ChevronRight, ChevronDown, ExternalLink,
    Route, Compass, AlertTriangle, ShieldCheck, Globe, Layers,
    Sparkles, ArrowRight, Crosshair, Star, Check, Building2, LocateFixed
} from 'lucide-react';
import { toast } from '../../../utils/toast';
import { detectCoordinatesAndAddress, reverseGeocode } from '../../../utils/geolocation';
import { providerApi } from '../../../api/providers';
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

// Cache for marker icons to avoid recreating DOM elements on every pan/render
const iconCache = new Map();
const getProviderIcon = (initial, isSelected, isRouted, isOutOfRadius) => {
    const key = `${initial}_${isSelected}_${isRouted}_${isOutOfRadius}`;
    if (iconCache.has(key)) return iconCache.get(key);

    let activeClass = '';
    if (isOutOfRadius) activeClass = 'provider-marker-badge--out-of-range';
    else if (isRouted) activeClass = 'provider-marker-badge--routed';
    else if (isSelected) activeClass = 'provider-marker-badge--selected';

    const icon = L.divIcon({
        className: 'provider-pin-container',
        html: `<div class="provider-marker-badge ${activeClass}">
                 <span class="provider-badge-initial">${initial}</span>
                 <div class="provider-marker-arrow"></div>
               </div>`,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
        popupAnchor: [0, -42]
    });

    iconCache.set(key, icon);
    return icon;
};

// City Cluster Pin Icon
const getClusterIcon = (cityName, count) => {
    return L.divIcon({
        className: 'city-cluster-pin-container',
        html: `<div class="city-cluster-badge">
                 <span class="cluster-city-name">${cityName}</span>
                 <span class="cluster-count">${count}</span>
               </div>`,
        iconSize: [80, 36],
        iconAnchor: [40, 18],
        popupAnchor: [0, -18]
    });
};

/**
 * Accurate Haversine Distance in Kilometers
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
        return null;
    }
    const numLat1 = parseFloat(lat1);
    const numLon1 = parseFloat(lon1);
    const numLat2 = parseFloat(lat2);
    const numLon2 = parseFloat(lon2);
    if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (numLat2 - numLat1) * Math.PI / 180;
    const dLon = (numLon2 - numLon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(numLat1 * Math.PI / 180) * Math.cos(numLat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist < 1 ? parseFloat(dist.toFixed(2)) : parseFloat(dist.toFixed(1));
}

// Popular Cities Dropdown Options
const CITY_OPTIONS = [
    { value: 'ALL', label: 'All Cities (Nationwide)', emoji: '🌐', subtitle: 'View all specialists across India' },
    { value: 'Delhi NCR', label: 'Delhi NCR', emoji: '🏛️', subtitle: 'Connaught Place & Delhi NCR', lat: 28.6139, lng: 77.2090 },
    { value: 'Mumbai', label: 'Mumbai', emoji: '🏙️', subtitle: 'Bandra, South Mumbai & Suburbs', lat: 19.0760, lng: 72.8777 },
    { value: 'Bengaluru', label: 'Bengaluru', emoji: '💻', subtitle: 'Indiranagar, Koramangala & Whitefield', lat: 12.9716, lng: 77.5946 },
    { value: 'Hyderabad', label: 'Hyderabad', emoji: '💎', subtitle: 'Banjara Hills, Hitec City & Gachibowli', lat: 17.3850, lng: 78.4867 },
    { value: 'Pune', label: 'Pune', emoji: '🌳', subtitle: 'Koregaon Park, Kalyani Nagar & Baner', lat: 18.5204, lng: 73.8567 },
    { value: 'Chennai', label: 'Chennai', emoji: '🌊', subtitle: 'T. Nagar, Nungambakkam & Adyar', lat: 13.0827, lng: 80.2707 },
    { value: 'Kolkata', label: 'Kolkata', emoji: '🌉', subtitle: 'Salt Lake, Park Street & New Town', lat: 22.5726, lng: 88.3639 },
    { value: 'Ahmedabad', label: 'Ahmedabad', emoji: '🪁', subtitle: 'Navrangpura, SG Highway & Satellite', lat: 23.0225, lng: 72.5714 },
    { value: 'Jaipur', label: 'Jaipur', emoji: '🏰', subtitle: 'Malviya Nagar, C-Scheme & Vaishali', lat: 26.9124, lng: 75.7873 },
    { value: 'Lucknow', label: 'Lucknow', emoji: '🕌', subtitle: 'Gomti Nagar, Hazratganj & Aliganj', lat: 26.8467, lng: 80.9462 },
    { value: 'Chandigarh', label: 'Chandigarh', emoji: '🌹', subtitle: 'Sector 17, Sector 35 & Mohali', lat: 30.7333, lng: 76.7794 }
];

// Rich Localities / Neighborhoods by City
const CITY_NEIGHBORHOODS = {
    'Delhi NCR': [
        { name: 'Connaught Place', lat: 28.6304, lng: 77.2177 },
        { name: 'South Extension', lat: 28.5728, lng: 77.2215 },
        { name: 'Saket', lat: 28.5245, lng: 77.2066 },
        { name: 'Noida Sector 18', lat: 28.5708, lng: 77.3260 },
        { name: 'Cyber Hub Gurugram', lat: 28.4950, lng: 77.0895 },
        { name: 'Dwarka', lat: 28.5921, lng: 77.0460 }
    ],
    'Mumbai': [
        { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
        { name: 'Andheri West', lat: 19.1363, lng: 72.8277 },
        { name: 'Colaba / South Mumbai', lat: 18.9067, lng: 72.8147 },
        { name: 'Powai', lat: 19.1176, lng: 72.9060 },
        { name: 'Juhu', lat: 19.1075, lng: 72.8263 },
        { name: 'Thane', lat: 19.2183, lng: 72.9781 }
    ],
    'Bengaluru': [
        { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 },
        { name: 'Koramangala', lat: 12.9352, lng: 77.6245 },
        { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
        { name: 'HSR Layout', lat: 12.9121, lng: 77.6446 },
        { name: 'Jayanagar', lat: 12.9308, lng: 77.5838 },
        { name: 'MG Road', lat: 12.9756, lng: 77.6066 }
    ],
    'Hyderabad': [
        { name: 'Banjara Hills', lat: 17.4156, lng: 78.4350 },
        { name: 'Jubilee Hills', lat: 17.4319, lng: 78.4073 },
        { name: 'Hitec City', lat: 17.4474, lng: 78.3762 },
        { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
        { name: 'Madhapur', lat: 17.4483, lng: 78.3915 }
    ],
    'Pune': [
        { name: 'Koregaon Park', lat: 18.5362, lng: 73.8940 },
        { name: 'Kalyani Nagar', lat: 18.5463, lng: 73.9034 },
        { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143 },
        { name: 'Baner', lat: 18.5590, lng: 73.7868 },
        { name: 'Kothrud', lat: 18.5074, lng: 73.8077 }
    ],
    'Chennai': [
        { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
        { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
        { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
        { name: 'Anna Nagar', lat: 13.0850, lng: 80.2101 },
        { name: 'Velachery', lat: 12.9815, lng: 80.2180 }
    ],
    'Kolkata': [
        { name: 'Salt Lake', lat: 22.5804, lng: 88.4378 },
        { name: 'Park Street', lat: 22.5510, lng: 88.3524 },
        { name: 'New Town', lat: 22.5880, lng: 88.4639 },
        { name: 'Ballygunge', lat: 22.5280, lng: 88.3656 }
    ],
    'Ahmedabad': [
        { name: 'Navrangpura', lat: 23.0373, lng: 72.5613 },
        { name: 'SG Highway', lat: 23.0360, lng: 72.5110 },
        { name: 'Satellite', lat: 23.0300, lng: 72.5178 },
        { name: 'Prahlad Nagar', lat: 23.0125, lng: 72.5112 }
    ],
    'Jaipur': [
        { name: 'Malviya Nagar', lat: 26.8530, lng: 75.8050 },
        { name: 'C-Scheme', lat: 26.9110, lng: 75.8010 },
        { name: 'Vaishali Nagar', lat: 26.9030, lng: 75.7430 },
        { name: 'Mansarovar', lat: 26.8600, lng: 75.7680 }
    ],
    'Lucknow': [
        { name: 'Gomti Nagar', lat: 26.8500, lng: 80.9920 },
        { name: 'Hazratganj', lat: 26.8500, lng: 80.9450 },
        { name: 'Aliganj', lat: 26.8850, lng: 80.9400 },
        { name: 'Indira Nagar', lat: 26.8800, lng: 80.9850 }
    ],
    'Chandigarh': [
        { name: 'Sector 17', lat: 30.7410, lng: 76.7790 },
        { name: 'Sector 35', lat: 30.7240, lng: 76.7640 },
        { name: 'Mohali Phase 7', lat: 30.7040, lng: 76.7170 },
        { name: 'Panchkula Sector 5', lat: 30.6940, lng: 76.8600 }
    ]
};

// Specialties Dropdown Options
const SPECIALTY_OPTIONS = [
    { value: 'ALL', label: 'All Specialties', subtitle: 'Explore all certified specialists' },
    { value: 'Health', label: 'Health & Wellness', subtitle: 'Doctors, Therapists & Nutritionists' },
    { value: 'Beauty', label: 'Beauty & Salon', subtitle: 'Stylists, Spas & Skin Care' },
    { value: 'Home', label: 'Home Services & Repairs', subtitle: 'Plumbers, Electricians & Cleaners' },
    { value: 'Fitness', label: 'Fitness & Training', subtitle: 'Yoga Instructors & Gym Trainers' },
    { value: 'Legal', label: 'Legal & Advisory', subtitle: 'Attorneys, Consultants & CAs' },
    { value: 'Education', label: 'Education & Tutoring', subtitle: 'Academic Tutors & Coaches' }
];

const RADIUS_PRESETS = [5, 15, 30, 50, 2000];

// Custom Professional Dark Glass Dropdown Component
function CustomDropdown({ icon: Icon, label, value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value) || {
        label: placeholder || value
    };

    return (
        <div className="custom-dropdown-container" ref={dropdownRef}>
            <button
                type="button"
                className={`custom-dropdown-trigger ${isOpen ? 'custom-dropdown-trigger--open' : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(prev => !prev);
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="custom-dropdown-trigger-left">
                    {Icon && <Icon size={14} className="dropdown-prefix-icon" />}
                    {selectedOption.emoji && <span className="dropdown-emoji">{selectedOption.emoji}</span>}
                    <span className="dropdown-trigger-label">{selectedOption.label}</span>
                </div>
                <ChevronDown size={14} className={`dropdown-chevron ${isOpen ? 'dropdown-chevron--rotated' : ''}`} />
            </button>

            {isOpen && (
                <div className="custom-dropdown-menu" role="listbox" onClick={(e) => e.stopPropagation()}>
                    <div className="custom-dropdown-menu-header">{label}</div>
                    <div className="custom-dropdown-list">
                        {options.map((opt) => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`custom-dropdown-item ${isSelected ? 'custom-dropdown-item--selected' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(opt.value, opt);
                                        setIsOpen(false);
                                    }}
                                    role="option"
                                    aria-selected={isSelected}
                                >
                                    <div className="dropdown-item-left">
                                        {opt.emoji && <span className="dropdown-item-emoji">{opt.emoji}</span>}
                                        <div className="dropdown-item-text">
                                            <span className="dropdown-item-title">{opt.label}</span>
                                            {opt.subtitle && <span className="dropdown-item-sub">{opt.subtitle}</span>}
                                        </div>
                                    </div>
                                    {isSelected && <Check size={14} className="dropdown-check-icon" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Map Viewport Tracker & Controller with Debounced Viewport & Fluid Navigation
function MapViewportController({ center, radiusKm, activeRouteCoords, onBoundsChange, onZoomChange, mapRef }) {
    const map = useMap();
    const lat = center?.lat;
    const lng = center?.lng;

    useEffect(() => {
        if (mapRef) {
            mapRef.current = map;
        }
    }, [map, mapRef]);

    const debounceTimerRef = useRef(null);

    const updateViewport = useCallback(() => {
        if (!map) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            onBoundsChange(bounds);
            onZoomChange(zoom);
        }, 120);
    }, [map, onBoundsChange, onZoomChange]);

    useMapEvents({
        moveend: updateViewport,
        zoomend: updateViewport
    });

    useEffect(() => {
        if (!map) return;
        onBoundsChange(map.getBounds());
        onZoomChange(map.getZoom());
    }, [map, onBoundsChange, onZoomChange]);

    const prevRadiusRef = useRef(radiusKm);
    const prevRouteRef = useRef(null);

    useEffect(() => {
        if (!map) return;

        // 1. If active route changed, smoothly fit bounds
        if (activeRouteCoords && activeRouteCoords.length > 0) {
            if (prevRouteRef.current !== activeRouteCoords) {
                prevRouteRef.current = activeRouteCoords;
                map.fitBounds(activeRouteCoords, { padding: [60, 60], maxZoom: 15, animate: true, duration: 0.45 });
            }
            return;
        }
        prevRouteRef.current = null;

        // 2. If Nationwide view (radius >= 2000), set nationwide center
        if (radiusKm >= 2000) {
            if (prevRadiusRef.current < 2000) {
                prevRadiusRef.current = radiusKm;
                map.setView([22.5937, 78.9629], 5, { animate: true });
            }
            return;
        }

        prevRadiusRef.current = radiusKm;
        if (!lat || !lng) return;

        // 3. Only animate if distance is significant (> 0.5km) or zoom changed
        const currentCenter = map.getCenter();
        const distFromCurrent = currentCenter ? calculateDistanceKm(currentCenter.lat, currentCenter.lng, lat, lng) : 999;

        let targetZoom = 12;
        if (radiusKm <= 5) targetZoom = 13;
        else if (radiusKm <= 15) targetZoom = 12;
        else if (radiusKm <= 30) targetZoom = 11;
        else if (radiusKm <= 50) targetZoom = 10;
        else targetZoom = 5;

        if (distFromCurrent > 0.5 || Math.abs(map.getZoom() - targetZoom) > 0) {
            map.flyTo([lat, lng], targetZoom, { duration: 0.45 });
        }
    }, [lat, lng, radiusKm, activeRouteCoords, map]);

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

// Memoized Specialist Marker to prevent re-rendering unaffected markers
const ProviderMarker = React.memo(function ProviderMarker({
    provider,
    isSelected,
    isRouted,
    isOutOfRadius,
    routeStats,
    googleMapsNavUrl,
    onSelect,
    onFetchRoute,
    onClearRoute,
    onOpenProfile
}) {
    const p = provider;
    const initial = p.name ? p.name.charAt(0).toUpperCase() : 'S';
    const minPrice = p.providerProfile?.services?.length > 0
        ? Math.min(...p.providerProfile.services.map(s => s.price))
        : null;

    const eventHandlers = useMemo(() => ({
        click: () => onSelect(p.id)
    }), [onSelect, p.id]);

    return (
        <Marker
            position={[p.lat, p.lng]}
            icon={getProviderIcon(initial, isSelected, isRouted, isOutOfRadius)}
            eventHandlers={eventHandlers}
        >
            <Popup>
                <div className="nearby-provider-popup">
                    <div className="nearby-popup-header">
                        <div className="nearby-popup-avatar" style={{ overflow: 'hidden' }}>
                            {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : (
                                initial
                            )}
                        </div>
                        <div className="nearby-popup-info">
                            <h4 className="nearby-popup-name">{p.name}</h4>
                            <span className="nearby-popup-spec">
                                {p.providerProfile?.specialty || 'Specialist'}
                            </span>
                        </div>
                    </div>

                    <div className="nearby-popup-meta">
                        <span className="nearby-meta-rating">
                            <Star size={12} fill="#e2892f" color="#e2892f" /> {p.providerProfile?.rating && Number(p.providerProfile.rating) > 0 ? Number(p.providerProfile.rating).toFixed(1) : (p.providerProfile?.reviewsCount > 0 ? '5.0' : 'New')}
                        </span>
                        <span className="nearby-meta-dist" style={{ color: isOutOfRadius ? '#ef4444' : '#38bdf8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} />
                            {isRouted && routeStats?.distanceKm
                                ? `${routeStats.distanceKm} km (driving)`
                                : (p.distanceKm !== null ? `${p.distanceKm} km away` : 'Available')}
                        </span>
                    </div>

                    {isRouted && routeStats?.durationMins > 0 && (
                        <div className="nearby-popup-drive-time">
                            <span className="drive-time-badge">⏱️ Est. Drive: ~{routeStats.durationMins} mins</span>
                            {googleMapsNavUrl && (
                                <a
                                    href={googleMapsNavUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="popup-gmaps-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={11} /> Maps
                                </a>
                            )}
                        </div>
                    )}

                    {minPrice && (
                        <div className="nearby-popup-price">
                            <span>Starting from</span>
                            <strong>₹{minPrice}</strong>
                        </div>
                    )}

                    <div className="nearby-popup-actions">
                        <button
                            type="button"
                            className={`nearby-popup-route-btn ${isRouted ? 'nearby-popup-route-btn--active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isRouted) {
                                    onClearRoute();
                                } else {
                                    onFetchRoute(p);
                                }
                            }}
                        >
                            <Route size={13} />
                            <span>{isRouted ? 'Clear Route' : '🧭 Directions'}</span>
                        </button>

                        {isOutOfRadius ? (
                            <div className="out-of-range-warning">
                                <AlertTriangle size={12} /> Outside 50km Service Area
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="nearby-popup-book-btn"
                                onClick={() => onOpenProfile(p.id, p.distanceKm)}
                            >
                                View Profile & Book →
                            </button>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
});

// Memoized Provider Sidebar Card to eliminate card list re-render lag
const ProviderSidebarCard = React.memo(function ProviderSidebarCard({
    provider,
    isSelected,
    isRouted,
    isOutOfRadius,
    routeDistanceKm,
    onSelect,
    onFetchRoute,
    onOpenProfile
}) {
    const p = provider;
    const initial = p.name ? p.name.charAt(0).toUpperCase() : 'S';
    const minPrice = p.providerProfile?.services?.length > 0
        ? Math.min(...p.providerProfile.services.map(s => s.price))
        : null;

    return (
        <div
            className={`nearby-provider-card ${isSelected ? 'nearby-provider-card--active' : ''} ${isRouted ? 'nearby-provider-card--routed' : ''} ${isOutOfRadius ? 'nearby-provider-card--out-of-range' : ''}`}
            onClick={() => onSelect(p)}
        >
            <div className="nearby-card-top">
                <div className="nearby-card-avatar" style={{ overflow: 'hidden' }}>
                    {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                        initial
                    )}
                </div>
                <div className="nearby-card-details">
                    <div className="card-name-row">
                        <h5 className="nearby-card-name">{p.name}</h5>
                        {isOutOfRadius && (
                            <span className="out-of-range-tag">&gt;50km</span>
                        )}
                    </div>
                    <span className="nearby-card-specialty">
                        {p.providerProfile?.specialty || 'Verified Specialist'}
                    </span>
                    <div className="nearby-card-location">
                        <MapPin size={11} />
                        <span>{p.location || p.city || 'India'}</span>
                    </div>
                </div>
            </div>

            <div className="nearby-card-bottom">
                <div className="nearby-card-stats">
                    <span className="nearby-stat-rating">
                        <Star size={11} fill="#e2892f" color="#e2892f" /> {p.providerProfile?.rating && Number(p.providerProfile.rating) > 0 ? Number(p.providerProfile.rating).toFixed(1) : (p.providerProfile?.reviewsCount > 0 ? '5.0' : 'New')}
                    </span>
                    <span className="nearby-stat-distance" style={{ color: isOutOfRadius ? '#ef4444' : '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} />
                        {isRouted && routeDistanceKm
                            ? `${routeDistanceKm} km (driving)`
                            : (p.distanceKm !== null ? `${p.distanceKm} km` : 'Available')}
                    </span>
                </div>

                {minPrice && (
                    <div className="nearby-card-price">
                        ₹{minPrice}
                    </div>
                )}
            </div>

            <div className="nearby-card-actions">
                <button
                    type="button"
                    className={`card-action-btn direction-btn ${isRouted ? 'active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFetchRoute(p);
                    }}
                    title="Draw driving directions on the map"
                >
                    <Route size={12} />
                    <span>{isRouted ? 'Route Active' : 'Directions'}</span>
                </button>

                {isOutOfRadius ? (
                    <button
                        type="button"
                        disabled
                        className="card-action-btn disabled-btn"
                        title="Cannot book: Specialist is outside the 50 km service radius"
                    >
                        <span>&gt;50km Blocked</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        className="card-action-btn book-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenProfile(p.id, p.distanceKm);
                        }}
                    >
                        <span>Book Slot</span>
                        <ChevronRight size={13} />
                    </button>
                )}
            </div>
        </div>
    );
});

export default function NearbyProvidersMapModal({
    isOpen,
    onClose,
    providers = [],
    initialLocation = null,
    onSelectLocation,
    currentLocationName = '',
    initialFilters = { service: '', maxPrice: '', specialty: '' }
}) {
    const navigate = useNavigate();
    const isNationwide = !initialLocation || (!initialLocation.lat && !initialLocation.lng);

    const [userLocation, setUserLocation] = useState(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            const lat = Number(initialLocation.lat);
            const lng = Number(initialLocation.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }
        return { lat: 28.6304, lng: 77.2177 };
    });

    const [locationLabel, setLocationLabel] = useState(() => {
        return initialLocation?.name || currentLocationName || (isNationwide ? 'All Locations (Nationwide)' : 'Selected Location');
    });

    const [radiusKm, setRadiusKm] = useState(() => (isNationwide ? 2000 : 50));
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceFilter, setServiceFilter] = useState(initialFilters?.service || '');
    const [selectedCategory, setSelectedCategory] = useState(initialFilters?.specialty || 'ALL');
    const [isLocating, setIsLocating] = useState(false);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [selectedProviderId, setSelectedProviderId] = useState(null);
    const [visibleCount, setVisibleCount] = useState(24);

    // Interactive Area Prompt State (when selecting a new city/location)
    const [areaPromptCity, setAreaPromptCity] = useState(null);
    const [areaSearchInput, setAreaSearchInput] = useState('');
    const [isSearchingArea, setIsSearchingArea] = useState(false);

    const [currentBounds, setCurrentBounds] = useState(null);
    const [currentZoom, setCurrentZoom] = useState(11);

    const [activeRouteProvider, setActiveRouteProvider] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState(null);
    const [routeStats, setRouteStats] = useState({ distanceKm: 0, durationMins: 0 });
    const [loadingRoute, setLoadingRoute] = useState(false);

    const sidebarScrollRef = useRef(null);
    const mapRef = useRef(null);
    const routeAbortControllerRef = useRef(null);
    const reverseGeocodeAbortRef = useRef(null);

    const [localProviders, setLocalProviders] = useState(providers || []);

    // Always fetch full nationwide provider list on modal open to enable unrestricted map exploration across all cities
    useEffect(() => {
        if (isOpen) {
            providerApi.getAll().then(data => {
                if (data && data.length > 0) {
                    setLocalProviders(data);
                } else if (providers && providers.length > 0) {
                    setLocalProviders(providers);
                }
            }).catch(err => {
                console.error('Failed to load map providers:', err);
                if (providers && providers.length > 0) setLocalProviders(providers);
            });
        }
    }, [isOpen, providers]);

    // Active City value for the dropdown
    const activeCityValue = useMemo(() => {
        if (radiusKm >= 2000) return 'ALL';
        const match = CITY_OPTIONS.find(c => c.value !== 'ALL' && locationLabel.toLowerCase().includes(c.value.toLowerCase()));
        return match ? match.value : locationLabel;
    }, [radiusKm, locationLabel]);

    // Update location when initialLocation prop changes
    useEffect(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            setUserLocation({ lat: Number(initialLocation.lat), lng: Number(initialLocation.lng) });
            setLocationLabel(initialLocation.name || currentLocationName || 'Selected Location');
            setRadiusKm(50);
        } else {
            setLocationLabel('All Locations (Nationwide)');
            setRadiusKm(2000);
        }
    }, [initialLocation, currentLocationName]);

    // Filter providers
    const processedProviders = useMemo(() => {
        const sourceList = localProviders && localProviders.length > 0 ? localProviders : (providers || []);
        if (!sourceList || !sourceList.length) return [];

        return sourceList
            .map(p => {
                const pLat = p.latitude != null ? p.latitude : (p.providerProfile?.latitude != null ? p.providerProfile.latitude : null);
                const pLng = p.longitude != null ? p.longitude : (p.providerProfile?.longitude != null ? p.providerProfile.longitude : null);

                if (pLat === null || pLng === null || pLat === '' || pLng === '') return null;
                const parsedLat = parseFloat(pLat);
                const parsedLng = parseFloat(pLng);
                if (isNaN(parsedLat) || isNaN(parsedLng)) return null;

                const distance = userLocation ? calculateDistanceKm(userLocation.lat, userLocation.lng, parsedLat, parsedLng) : null;

                return {
                    ...p,
                    distanceKm: distance,
                    lat: parsedLat,
                    lng: parsedLng
                };
            })
            .filter(p => {
                if (!p) return false;
                if (radiusKm < 2000 && p.distanceKm !== null && p.distanceKm > radiusKm) return false;

                if (selectedCategory !== 'ALL') {
                    const spec = (p.providerProfile?.specialty || '').toLowerCase();
                    const catLower = selectedCategory.toLowerCase();
                    if (!spec.includes(catLower)) return false;
                }

                if (serviceFilter.trim()) {
                    const term = serviceFilter.toLowerCase().trim();
                    const nameMatch = (p.name || '').toLowerCase().includes(term);
                    const specMatch = (p.providerProfile?.specialty || '').toLowerCase().includes(term);
                    const serviceMatch = p.providerProfile?.services?.some(s => (s.name || '').toLowerCase().includes(term));
                    if (!nameMatch && !specMatch && !serviceMatch) return false;
                }

                return true;
            })
            .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }, [localProviders, providers, userLocation, radiusKm, selectedCategory, serviceFilter]);

    // City Clusters for nationwide view
    const cityClusters = useMemo(() => {
        if (currentZoom >= 8 && radiusKm < 2000) return [];

        const clusters = {};
        processedProviders.forEach(p => {
            const cityName = p.city || p.location || 'Specialists';
            const matchingPop = CITY_OPTIONS.find(c => c.value !== 'ALL' && calculateDistanceKm(c.lat, c.lng, p.lat, p.lng) < 60);
            const clusterKey = matchingPop ? matchingPop.label : cityName;
            const clusterCoord = matchingPop ? { lat: matchingPop.lat, lng: matchingPop.lng } : { lat: p.lat, lng: p.lng };

            if (!clusters[clusterKey]) {
                clusters[clusterKey] = {
                    name: clusterKey,
                    lat: clusterCoord.lat,
                    lng: clusterCoord.lng,
                    count: 0,
                    providers: []
                };
            }
            clusters[clusterKey].count += 1;
            clusters[clusterKey].providers.push(p);
        });

        return Object.values(clusters);
    }, [processedProviders, currentZoom, radiusKm]);

    // Viewport-culled markers (capped at top 60, always includes activeRouteProvider)
    const visibleMapMarkers = useMemo(() => {
        if (!processedProviders.length) return [];

        if (currentZoom < 7 && radiusKm >= 2000 && cityClusters.length > 0) {
            return [];
        }

        let candidates = processedProviders;
        if (currentBounds) {
            candidates = candidates.filter(p => currentBounds.contains([p.lat, p.lng]));
        }
        let list = candidates.slice(0, 60);

        // Ensure activeRouteProvider is visible even if right at boundary
        if (activeRouteProvider && !list.some(p => p.id === activeRouteProvider.id)) {
            const found = processedProviders.find(p => p.id === activeRouteProvider.id);
            if (found) list.push(found);
        }

        return list;
    }, [processedProviders, currentBounds, currentZoom, radiusKm, cityClusters, activeRouteProvider]);

    // Fetch Driving Route with Instant Feedback & Simplified Geometry
    const handleFetchRoute = useCallback(async (provider) => {
        if (!provider || !provider.lat || !provider.lng) return;

        setSelectedProviderId(provider.id);
        setActiveRouteProvider(provider);

        const originLat = userLocation.lat;
        const originLng = userLocation.lng;
        const destLat = provider.lat;
        const destLng = provider.lng;

        // Immediate instant straight-line feedback (0ms UI lag)
        const straightLine = [[originLat, originLng], [destLat, destLng]];
        const approxDist = provider.distanceKm != null ? provider.distanceKm : calculateDistanceKm(originLat, originLng, destLat, destLng);
        setRouteCoordinates(straightLine);
        setRouteStats({
            distanceKm: approxDist ? approxDist.toFixed(1) : '1.0',
            durationMins: Math.max(1, Math.round((approxDist || 1) * 2))
        });

        // Abort previous route request if pending
        if (routeAbortControllerRef.current) {
            routeAbortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        routeAbortControllerRef.current = abortController;

        setLoadingRoute(true);

        try {
            const timeoutId = setTimeout(() => abortController.abort(), 3500);
            const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=simplified&geometries=geojson`;
            const resp = await fetch(url, { signal: abortController.signal });
            clearTimeout(timeoutId);

            if (resp.ok) {
                const data = await resp.json();
                if (data && data.routes && data.routes.length > 0) {
                    const routeData = data.routes[0];
                    let coords = routeData.geometry.coordinates.map(c => [c[1], c[0]]);

                    // Decimate if too many coordinates to maintain 60fps
                    if (coords.length > 150) {
                        const step = Math.ceil(coords.length / 100);
                        const sampled = coords.filter((_, idx) => idx % step === 0 || idx === coords.length - 1);
                        coords = sampled;
                    }

                    setRouteCoordinates(coords);
                    setRouteStats({
                        distanceKm: (routeData.distance / 1000).toFixed(1),
                        durationMins: Math.max(1, Math.round(routeData.duration / 60))
                    });
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('OSRM route calculation unavailable, using direct trajectory:', err.message);
            }
        } finally {
            if (!abortController.signal.aborted) {
                setLoadingRoute(false);
            }
        }
    }, [userLocation]);

    const handleClearRoute = () => {
        if (routeAbortControllerRef.current) {
            routeAbortControllerRef.current.abort();
        }
        setActiveRouteProvider(null);
        setRouteCoordinates(null);
        setRouteStats({ distanceKm: 0, durationMins: 0 });
    };

    // When selecting a new city, trigger neighborhood prompt and center the map
    const handleSelectCity = (city) => {
        const cityName = city.label || city.name;
        const target = { lat: city.lat, lng: city.lng, name: cityName, city: cityName };
        setUserLocation(target);
        setLocationLabel(cityName);
        setRadiusKm(50);
        setAreaPromptCity(cityName);
        if (activeRouteProvider) handleClearRoute();
        try {
            localStorage.setItem('appointly_client_location', JSON.stringify({
                lat: target.lat,
                lng: target.lng,
                name: target.name,
                city: target.city,
                setAt: new Date().toISOString()
            }));
        } catch { }
        if (onSelectLocation) onSelectLocation(target);
    };

    // Confirm a specific neighborhood/locality under 50km
    const handleConfirmAreaLocality = (areaObj) => {
        const fullLabel = `${areaObj.name}, ${areaPromptCity || ''}`.replace(/,\s*$/, '');
        const target = { lat: areaObj.lat, lng: areaObj.lng, name: fullLabel, city: areaPromptCity || areaObj.name };
        setUserLocation(target);
        setLocationLabel(fullLabel);
        setRadiusKm(50);
        setAreaPromptCity(null);
        setAreaSearchInput('');
        if (activeRouteProvider) handleClearRoute();
        try {
            localStorage.setItem('appointly_client_location', JSON.stringify({
                lat: target.lat,
                lng: target.lng,
                name: fullLabel,
                city: target.city,
                setAt: new Date().toISOString()
            }));
        } catch { }
        if (onSelectLocation) onSelectLocation(target);
        toast.success(`📍 Center set to ${fullLabel}! Showing providers within 50 km.`);
    };

    // Search specific area within the selected city
    const handleSearchAreaInCity = async (e) => {
        if (e) e.preventDefault();
        if (!areaSearchInput.trim()) return;

        setIsSearchingArea(true);
        const queryWithCity = `${areaSearchInput.trim()}, ${areaPromptCity || ''}`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithCity)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const name = data[0].display_name.split(',')[0];
                handleConfirmAreaLocality({
                    name,
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                });
            } else {
                toast.error(`Could not locate "${areaSearchInput}". Please choose from popular areas below.`);
            }
        } catch {
            toast.error('Search network error. Please select one of the areas below.');
        } finally {
            setIsSearchingArea(false);
        }
    };

    // Handle Top Bar Search Location input (Geocoding via OpenStreetMap)
    const handleSearchLocation = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearchingLocation(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const name = data[0].display_name.split(',')[0];
                const target = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name, city: name };
                setUserLocation(target);
                setLocationLabel(name);
                setSearchQuery('');
                setRadiusKm(50);
                setAreaPromptCity(name);
                try {
                    localStorage.setItem('appointly_client_location', JSON.stringify({
                        lat: target.lat,
                        lng: target.lng,
                        name,
                        city: name,
                        setAt: new Date().toISOString()
                    }));
                } catch { }
                if (onSelectLocation) onSelectLocation(target);
                if (activeRouteProvider) handleClearRoute();
                toast.success(`📍 Center updated to ${name}. Pick your area below to refine 50 km providers.`);
            } else {
                toast.error(`No locations found for "${searchQuery}".`);
            }
        } catch (err) {
            console.error('Location search failed:', err);
            toast.error('Search network error. Please try again.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    // Re-detect User Location (GPS)
    const handleUseMyLocation = async () => {
        setIsLocating(true);
        try {
            const loc = await detectCoordinatesAndAddress({ forceDevice: true });
            const name = loc.name || loc.city || 'My Location';
            const target = { lat: loc.lat, lng: loc.lng, name, city: loc.city || name };
            setUserLocation(target);
            setLocationLabel(name);
            setRadiusKm(50);
            setAreaPromptCity(null);
            try {
                localStorage.setItem('appointly_client_location', JSON.stringify({
                    lat: loc.lat,
                    lng: loc.lng,
                    name,
                    city: loc.city || name,
                    setAt: new Date().toISOString()
                }));
            } catch { }
            if (onSelectLocation) {
                onSelectLocation(target);
            }
            if (activeRouteProvider) handleClearRoute();

            if (loc.source === 'gps') {
                toast.success(`📍 Exact Device Location: ${name}`);
            } else if (loc.source === 'ip') {
                if (loc.permissionDenied) {
                    toast.warn(
                        `🌐 Browser location access is blocked. Showing approximate area (${name}). Allow location in address bar for exact precision.`,
                        { duration: 7000 }
                    );
                } else {
                    toast.info(
                        `🌐 Device GPS timed out. Showing approximate area (${name}). Click map to pinpoint your exact location.`,
                        { duration: 6000 }
                    );
                }
            } else {
                toast.info(`📍 Location set: ${name}`);
            }
        } catch (err) {
            console.error('My Location failed:', err);
            toast.error(err.message || 'Could not detect location. Please search your area or drop a pin on the map.');
        } finally {
            setIsLocating(false);
        }
    };

    // Click Provider -> Open Profile (Guarded by 50km rule)
    const handleOpenProfile = (providerId, distanceKm) => {
        if (radiusKm < 2000 && distanceKm !== null && distanceKm !== undefined && distanceKm > 50) {
            toast.error('Booking is only allowed for specialists within a 50 km radius of your location.');
            return;
        }

        onClose();
        navigate(`/provider/${providerId}`);
    };

    // Show all locations nationwide
    const handleShowAllLocations = () => {
        setRadiusKm(2000);
        setLocationLabel('All Locations (Nationwide)');
        setAreaPromptCity(null);
        try {
            localStorage.removeItem('appointly_client_location');
        } catch { }
        if (activeRouteProvider) handleClearRoute();
        if (onSelectLocation) onSelectLocation(null);
        toast.info('Showing specialists across all cities.');
    };

    const handleSelectProviderCard = useCallback((provider) => {
        setSelectedProviderId(provider.id);
        if (provider.lat && provider.lng && mapRef.current) {
            mapRef.current.panTo([provider.lat, provider.lng], { animate: true, duration: 0.35 });
        }
    }, []);

    const handleMapLocationChange = useCallback(async (newPos) => {
        if (reverseGeocodeAbortRef.current) {
            reverseGeocodeAbortRef.current.abort();
        }
        const abortController = new AbortController();
        reverseGeocodeAbortRef.current = abortController;

        const initialTarget = { lat: newPos.lat, lng: newPos.lng, name: 'Pinned Location', city: 'Pinned Location' };
        setUserLocation(initialTarget);
        setLocationLabel('Resolving area...');
        setAreaPromptCity(null);
        if (activeRouteProvider) handleClearRoute();

        try {
            const addr = await reverseGeocode(newPos.lat, newPos.lng);
            if (abortController.signal.aborted) return;
            const resolvedName = addr.name || addr.streetAddress || addr.city || 'Pinned Location';
            const finalTarget = { lat: newPos.lat, lng: newPos.lng, name: resolvedName, city: addr.city || resolvedName };
            setUserLocation(finalTarget);
            setLocationLabel(resolvedName);
            try {
                localStorage.setItem('appointly_client_location', JSON.stringify({
                    ...finalTarget,
                    setAt: new Date().toISOString()
                }));
            } catch { }
            if (onSelectLocation) onSelectLocation(finalTarget);
            toast.success(`📍 Pin placed at ${resolvedName}! Showing specialists within 50 km.`);
        } catch {
            if (!abortController.signal.aborted) {
                setLocationLabel('Pinned Location');
                if (onSelectLocation) onSelectLocation(initialTarget);
                toast.success('📍 Pin dropped! Showing specialists within 50 km.');
            }
        }
    }, [activeRouteProvider, onSelectLocation]);

    if (!isOpen) return null;

    const googleMapsNavUrl = activeRouteProvider
        ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${activeRouteProvider.lat},${activeRouteProvider.lng}&travelmode=driving`
        : null;

    // Available neighborhoods for current prompted city
    const availableNeighborhoods = areaPromptCity ? (CITY_NEIGHBORHOODS[areaPromptCity] || []) : [];

    return (
        <div className="nearby-map-overlay" onClick={onClose}>
            <div className="nearby-map-modal glass" onClick={e => e.stopPropagation()}>
                {/* Clean Top Navigation Bar */}
                <div className="nearby-map-topbar">
                    <div className="nearby-map-top-left">
                        <div className="nearby-brand-badge">
                            <Compass size={14} className="spin-slow" />
                            <span>Interactive Map</span>
                        </div>
                        <div className="nearby-title-wrap">
                            <h3 className="nearby-top-title">Find & Navigate Specialists</h3>
                            <div className="nearby-top-status">
                                <span className="nearby-status-dot"></span>
                                <span className="nearby-status-text">
                                    Center: <strong>{locationLabel}</strong>
                                    {radiusKm < 2000 && <span className="radius-tag">({radiusKm} km)</span>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="nearby-map-top-actions">
                        <form className="nearby-search-box" onSubmit={handleSearchLocation}>
                            <Search size={15} className="nearby-search-icon" />
                            <input
                                type="text"
                                placeholder="Search city or area..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="nearby-search-input"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="nearby-search-clear"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X size={13} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="nearby-search-btn"
                                disabled={isSearchingLocation || !searchQuery.trim()}
                            >
                                {isSearchingLocation ? '...' : 'Search'}
                            </button>
                        </form>

                        <button
                            type="button"
                            className={`nearby-action-btn nearby-gps-btn ${isLocating ? 'loading' : ''}`}
                            onClick={handleUseMyLocation}
                            disabled={isLocating}
                            title="Auto-detect current GPS coordinates"
                        >
                            <Navigation size={14} />
                            <span>{isLocating ? 'Detecting...' : 'My Location'}</span>
                        </button>

                        <button
                            type="button"
                            className={`nearby-action-btn nearby-allcities-btn ${radiusKm >= 2000 ? 'active' : ''}`}
                            onClick={handleShowAllLocations}
                            title="View all specialists nationwide"
                        >
                            <Globe size={14} />
                            <span>All Cities</span>
                        </button>

                        <button
                            type="button"
                            className="nearby-modal-close"
                            onClick={onClose}
                            aria-label="Close Map"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Professional Filter Toolbar with Dropdowns */}
                <div className="nearby-filter-toolbar">
                    {/* 1. Quick City Dropdown */}
                    <div className="toolbar-filter-item">
                        <span className="filter-group-label">Quick City:</span>
                        <CustomDropdown
                            icon={Building2}
                            label="Select City / Region"
                            value={activeCityValue}
                            options={CITY_OPTIONS}
                            onChange={(val, opt) => {
                                if (val === 'ALL') {
                                    handleShowAllLocations();
                                } else {
                                    handleSelectCity(opt);
                                }
                            }}
                            placeholder="Choose City"
                        />
                    </div>

                    {/* 2. Specialty Dropdown */}
                    <div className="toolbar-filter-item">
                        <span className="filter-group-label">Specialty:</span>
                        <CustomDropdown
                            icon={Sparkles}
                            label="Select Specialist Category"
                            value={selectedCategory}
                            options={SPECIALTY_OPTIONS}
                            onChange={(val) => setSelectedCategory(val)}
                            placeholder="Specialty"
                        />
                    </div>

                    {/* 3. Radius Selector */}
                    <div className="toolbar-filter-item toolbar-radius-item">
                        <span className="filter-group-label">Radius:</span>
                        <div className="radius-pills-list">
                            {RADIUS_PRESETS.map((km) => (
                                <button
                                    key={km}
                                    type="button"
                                    className={`radius-pill ${radiusKm === km ? 'radius-pill--active' : ''}`}
                                    onClick={() => setRadiusKm(km)}
                                >
                                    {km >= 2000 ? 'All India' : `${km} km`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Body */}
                <div className="nearby-map-body">
                    {/* Left: Leaflet Map Container */}
                    <div className="nearby-map-stage">
                        <MapContainer
                            center={[userLocation.lat, userLocation.lng]}
                            zoom={11}
                            scrollWheelZoom={true}
                            preferCanvas={true}
                            wheelDebounceTime={40}
                            wheelPxPerZoomLevel={120}
                            style={{ width: '100%', height: '100%', borderRadius: '12px' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                keepBuffer={6}
                                updateWhenZooming={false}
                                updateWhenIdle={true}
                            />

                            <MapViewportController
                                center={userLocation}
                                radiusKm={radiusKm}
                                activeRouteCoords={routeCoordinates}
                                onBoundsChange={setCurrentBounds}
                                onZoomChange={setCurrentZoom}
                                mapRef={mapRef}
                            />

                            <MapClickHandler onLocationChange={handleMapLocationChange} />

                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userMarkerIcon}>
                                <Popup>
                                    <div className="nearby-popup-client">
                                        <strong>📍 Your Center</strong>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                                            Click anywhere on map to reposition
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>

                            {radiusKm < 2000 && (
                                <Circle
                                    key="active-search-radius-circle"
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={radiusKm * 1000}
                                    pathOptions={{
                                        color: radiusKm > 50 ? '#0284c7' : '#e2892f',
                                        fillColor: radiusKm > 50 ? '#38bdf8' : '#e2892f',
                                        fillOpacity: 0.14,
                                        weight: 2.5,
                                        dashArray: '6, 6'
                                    }}
                                >
                                    <Tooltip permanent direction="top" opacity={0.96} className="nearby-radius-map-tooltip">
                                        <span>📍 Search Radius: <strong>{radiusKm} km</strong></span>
                                    </Tooltip>
                                </Circle>
                            )}

                            {radiusKm > 50 && radiusKm < 2000 && (
                                <Circle
                                    key="strict-50km-boundary-circle"
                                    center={[userLocation.lat, userLocation.lng]}
                                    radius={50000}
                                    pathOptions={{
                                        color: '#10b981',
                                        fillColor: '#10b981',
                                        fillOpacity: 0.04,
                                        weight: 2,
                                        dashArray: '2, 6'
                                    }}
                                />
                            )}

                            {routeCoordinates && (
                                <Polyline
                                    positions={routeCoordinates}
                                    pathOptions={{
                                        color: '#3b82f6',
                                        weight: 5,
                                        opacity: 0.95,
                                        lineJoin: 'round'
                                    }}
                                />
                            )}

                            {currentZoom < 7 && radiusKm >= 2000 && cityClusters.map(cluster => {
                                const handleClusterSelect = () => {
                                    handleSelectCity({ name: cluster.name, lat: cluster.lat, lng: cluster.lng });
                                };

                                return (
                                    <Marker
                                        key={cluster.name}
                                        position={[cluster.lat, cluster.lng]}
                                        icon={getClusterIcon(cluster.name, cluster.count)}
                                        eventHandlers={{
                                            click: handleClusterSelect
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ textAlign: 'center', padding: '4px' }}>
                                                <strong>{cluster.name}</strong>
                                                <p style={{ margin: '4px 0', fontSize: '0.85rem' }}>{cluster.count} verified specialists</p>
                                                <button
                                                    type="button"
                                                    className="nearby-popup-book-btn"
                                                    onClick={handleClusterSelect}
                                                >
                                                    Select {cluster.name} Area →
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {(currentZoom >= 7 || radiusKm < 2000) && visibleMapMarkers.map(p => (
                                <ProviderMarker
                                    key={p.id}
                                    provider={p}
                                    isSelected={selectedProviderId === p.id}
                                    isRouted={activeRouteProvider?.id === p.id}
                                    isOutOfRadius={radiusKm < 2000 && p.distanceKm !== null && p.distanceKm > 50}
                                    routeStats={activeRouteProvider?.id === p.id ? routeStats : null}
                                    googleMapsNavUrl={activeRouteProvider?.id === p.id ? googleMapsNavUrl : null}
                                    onSelect={setSelectedProviderId}
                                    onFetchRoute={handleFetchRoute}
                                    onClearRoute={handleClearRoute}
                                    onOpenProfile={handleOpenProfile}
                                />
                            ))}
                        </MapContainer>

                        {/* Interactive Area Selection Floating Sheet */}
                        {areaPromptCity && (
                            <div className="nearby-area-prompt-sheet glass animate-fade-in">
                                <div className="area-prompt-header">
                                    <div className="area-prompt-title-wrap">
                                        <LocateFixed size={16} className="text-amber" />
                                        <h4 className="area-prompt-title">Where are you located in {areaPromptCity}?</h4>
                                    </div>
                                    <button
                                        type="button"
                                        className="area-prompt-close"
                                        onClick={() => setAreaPromptCity(null)}
                                        title="Dismiss area selector"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <p className="area-prompt-sub">
                                    Select your neighborhood or enter your locality to strictly view specialists within <strong>50 km</strong> of your chosen area.
                                </p>

                                {/* Neighborhood Quick Pills */}
                                <div className="area-neighborhoods-list">
                                    <span className="area-list-label">Quick Neighborhoods:</span>
                                    <div className="area-pills-wrap">
                                        <button
                                            type="button"
                                            className="area-locality-pill area-locality-pill--center"
                                            onClick={() => {
                                                const cityMatch = CITY_OPTIONS.find(c => c.value === areaPromptCity || c.label.includes(areaPromptCity));
                                                if (cityMatch && cityMatch.lat) {
                                                    handleConfirmAreaLocality({ name: `${areaPromptCity} (Center)`, lat: cityMatch.lat, lng: cityMatch.lng });
                                                } else {
                                                    setAreaPromptCity(null);
                                                }
                                            }}
                                        >
                                            {areaPromptCity} Center
                                        </button>
                                        {availableNeighborhoods.map((nh) => (
                                            <button
                                                key={nh.name}
                                                type="button"
                                                className="area-locality-pill"
                                                onClick={() => handleConfirmAreaLocality(nh)}
                                            >
                                                📍 {nh.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Specific Street / Area Search Box */}
                                <form className="area-specific-search-form" onSubmit={handleSearchAreaInCity}>
                                    <Search size={14} className="area-search-icon" />
                                    <input
                                        type="text"
                                        placeholder={`Type specific street, sector, or landmark in ${areaPromptCity}...`}
                                        value={areaSearchInput}
                                        onChange={(e) => setAreaSearchInput(e.target.value)}
                                        className="area-search-input"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="area-search-submit-btn"
                                        disabled={isSearchingArea || !areaSearchInput.trim()}
                                    >
                                        {isSearchingArea ? '...' : 'Find Area'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {radiusKm < 2000 && (
                            <div className="nearby-map-radius-badge">
                                <Crosshair size={13} className="radius-badge-icon" />
                                <span>Radius: <strong>{radiusKm} km</strong></span>
                            </div>
                        )}

                        <div className={`nearby-map-pill ${activeRouteProvider ? 'nearby-map-pill--route' : ''}`}>
                            {activeRouteProvider ? (
                                <>
                                    <Route size={13} color="#818cf8" />
                                    <span>
                                        Route to <strong>{activeRouteProvider.name}</strong> • {loadingRoute ? 'Calculating...' : `${routeStats.distanceKm} km (~${routeStats.durationMins} mins)`}
                                    </span>
                                    <button
                                        type="button"
                                        className="nearby-pill-clear-route"
                                        onClick={handleClearRoute}
                                        title="Clear Route"
                                    >
                                        <X size={12} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={13} color="#10b981" />
                                    <span>
                                        {processedProviders.length} Specialists Available • {radiusKm >= 2000 ? 'Nationwide' : `${radiusKm} km Radius`}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="nearby-providers-sidebar">
                        <div className="nearby-sidebar-header">
                            <div className="sidebar-header-left">
                                <h4 className="sidebar-heading">Available Specialists</h4>
                                <span className="sidebar-count-badge">
                                    {processedProviders.length} Found
                                </span>
                            </div>
                            <span className="sidebar-radius-badge">
                                {radiusKm >= 2000 ? 'All India' : `Within ${radiusKm} km`}
                            </span>
                        </div>

                        <div className="nearby-cards-scroll" ref={sidebarScrollRef}>
                            {processedProviders.length === 0 ? (
                                <div className="nearby-empty-state">
                                    <div className="nearby-empty-icon">📍</div>
                                    <h4 className="empty-title">No specialists in this radius</h4>
                                    <p className="empty-desc">
                                        We couldn't find specialists within {radiusKm} km of {locationLabel}.
                                    </p>
                                    {radiusKm < 2000 && (
                                        <button
                                            type="button"
                                            className="nearby-expand-btn"
                                            onClick={() => {
                                                const nextMap = { 5: 15, 15: 30, 30: 50, 50: 2000 };
                                                setRadiusKm(nextMap[radiusKm] || 2000);
                                            }}
                                        >
                                            <Sparkles size={14} />
                                            <span>Expand Radius to {radiusKm === 50 ? 'All India' : `${{ 5: 15, 15: 30, 30: 50 }[radiusKm] || 'All'} km`}</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {processedProviders.slice(0, visibleCount).map(p => (
                                        <ProviderSidebarCard
                                            key={p.id}
                                            provider={p}
                                            isSelected={selectedProviderId === p.id}
                                            isRouted={activeRouteProvider?.id === p.id}
                                            isOutOfRadius={p.distanceKm !== null && p.distanceKm > 50}
                                            routeDistanceKm={activeRouteProvider?.id === p.id ? routeStats.distanceKm : null}
                                            onSelect={handleSelectProviderCard}
                                            onFetchRoute={handleFetchRoute}
                                            onOpenProfile={handleOpenProfile}
                                        />
                                    ))}

                                    {processedProviders.length > visibleCount && (
                                        <div className="load-more-wrap">
                                            <button
                                                type="button"
                                                className="nearby-load-more-btn"
                                                onClick={() => setVisibleCount(prev => prev + 24)}
                                            >
                                                Show More Specialists ({processedProviders.length - visibleCount} remaining)
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
