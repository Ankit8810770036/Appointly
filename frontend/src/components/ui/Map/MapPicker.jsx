import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, Search, X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import CooperativeGestures from './CooperativeGestures';
import { detectCoordinatesAndAddress } from '../../../utils/geolocation';
import './MapPicker.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, onPositionDrag }) {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                drag: (e) => {
                    if (onPositionDrag) {
                        onPositionDrag(e.target.getLatLng());
                    }
                },
                dragend: (e) => {
                    setPosition(e.target.getLatLng());
                }
            }}
        />
    );
}

// Internal component to handle map movement from outside
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center && center.lat && center.lng) {
            map.flyTo([center.lat, center.lng], 15);
        }
    }, [center, map]);
    return null;
}

// Format clean address from Nominatim data
function formatCleanAddress(data) {
    if (!data) return '';
    const addr = data.address || {};
    
    // Extract key parts
    const street = [addr.house_number, addr.road || addr.street || addr.pedestrian || addr.suburb].filter(Boolean).join(' ');
    const locality = addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || '';
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const state = addr.state || '';

    const parts = [street, locality, city, state].filter(Boolean);
    if (parts.length >= 2) {
        return Array.from(new Set(parts)).slice(0, 3).join(', ');
    }
    
    if (data.display_name) {
        return data.display_name.split(',').map(s => s.trim()).slice(0, 3).join(', ');
    }
    
    return '';
}

export default function MapPicker({
    value,
    onChange,
    onAddressUpdate,
    label = "Pin your home location",
    height = "250px"
}) {
    const hasValidCoords = value?.lat != null && value?.lng != null && !isNaN(Number(value.lat)) && !isNaN(Number(value.lng));
    const initialPos = hasValidCoords ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
    const [position, setPosition] = useState(initialPos);
    const [mapCenter, setMapCenter] = useState(initialPos || { lat: 20.5937, lng: 78.9629 }); // Default India center
    const [isResolving, setIsResolving] = useState(false);
    const [resolvedAddress, setResolvedAddress] = useState('');

    // Fullscreen & Cooperative Gestures State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [gestureHint, setGestureHint] = useState(null);

    // GPS State
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [gpsActive, setGpsActive] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Search Autocomplete State
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchWrapperRef = useRef(null);
    const suggestionsListRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Sync external value changes
    useEffect(() => {
        if (value?.lat != null && value?.lng != null) {
            const lat = Number(value.lat);
            const lng = Number(value.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                if (!position || Math.abs(position.lat - lat) > 0.0001 || Math.abs(position.lng - lng) > 0.0001) {
                    const newPos = { lat, lng };
                    setPosition(newPos);
                    setMapCenter(newPos);
                    if (!resolvedAddress) {
                        reverseGeocode(lat, lng);
                    }
                }
            }
        }
    }, [value?.lat, value?.lng]);

    // Initial address resolution on mount if coordinates exist
    useEffect(() => {
        if (initialPos && !resolvedAddress) {
            reverseGeocode(initialPos.lat, initialPos.lng);
        }
    }, []);

    // Handle Escape key to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Prevent body scrolling when in fullscreen
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    const toggleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    // Reverse Geocode
    const reverseGeocode = async (lat, lng) => {
        setIsResolving(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
            const data = await response.json();
            if (data) {
                const formatted = formatCleanAddress(data);
                if (formatted) {
                    setResolvedAddress(formatted);
                }
                
                if (data.address && onAddressUpdate) {
                    const addr = data.address;
                    onAddressUpdate({
                        street: addr.road || addr.suburb || addr.neighbourhood || '',
                        city: addr.city || addr.town || addr.village || addr.municipality || '',
                        state: addr.state || '',
                        zipCode: addr.postcode || '',
                        country: addr.country_code?.toUpperCase() || 'IND'
                    });
                }
            }
        } catch (error) {
            console.error("Reverse geocoding failed:", error);
        } finally {
            setIsResolving(false);
        }
    };

    const handleSetPosition = (pos) => {
        setPosition(pos);
        if (onChange) {
            onChange({ lat: pos.lat, lng: pos.lng });
        }
        reverseGeocode(pos.lat, pos.lng);
    };

    const handlePositionDrag = (pos) => {
        setPosition(pos);
        // Turn off GPS accuracy circle once manually dragged
        if (gpsActive) setGpsActive(false);
    };

    // GPS Locate Me
    const handleLocateMe = async () => {
        setIsLocating(true);
        try {
            const loc = await detectCoordinatesAndAddress({ forceDevice: true });
            const accuracy = Math.round(loc.accuracy || 30);
            const newPos = { lat: loc.lat, lng: loc.lng };
            setGpsAccuracy(accuracy);
            setGpsActive(true);
            setMapCenter(newPos);
            handleSetPosition(newPos);
        } catch (err) {
            console.warn("Geolocation lookup failed:", err);
            alert(err.message || "Unable to retrieve your current location. Please check browser permissions.");
        } finally {
            setIsLocating(false);
        }
    };

    // Debounced Search
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsSearching(false);
            setSelectedIndex(-1);
            return;
        }

        setIsSearching(true);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                    { signal: controller.signal }
                );
                const data = await response.json();
                setSuggestions(data || []);
                setShowSuggestions(true);
                setSelectedIndex(-1);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error("Search failed:", err);
                }
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchQuery]);

    // Handle suggestion selection
    const selectSuggestion = (suggestion) => {
        const newPos = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
        setGpsActive(false);
        setMapCenter(newPos);
        setPosition(newPos);
        if (onChange) {
            onChange(newPos);
        }

        const formatted = formatCleanAddress(suggestion);
        if (formatted) {
            setResolvedAddress(formatted);
            setSearchQuery(formatted);
        } else {
            setSearchQuery(suggestion.display_name || '');
        }

        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);

        if (suggestion.address && onAddressUpdate) {
            const addr = suggestion.address;
            onAddressUpdate({
                street: addr.road || addr.suburb || addr.neighbourhood || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                zipCode: addr.postcode || '',
                country: addr.country_code?.toUpperCase() || 'IND'
            });
        }
    };

    // Keyboard navigation (↑/↓/Enter/Escape)
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
            if (target) {
                selectSuggestion(target);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    // Auto-scroll selected suggestion into view
    useEffect(() => {
        if (selectedIndex >= 0 && suggestionsListRef.current) {
            const activeEl = suggestionsListRef.current.children[selectedIndex];
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Click outside search wrapper closes suggestions
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const clearSearch = () => {
        setSearchQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    };

    // Split suggestion for editorial typography
    const renderSuggestionParts = (item) => {
        const parts = (item.display_name || '').split(',').map((p) => p.trim());
        const primary = parts[0] || item.display_name || 'Location';
        const secondary = parts.slice(1, 4).join(', ');
        return { primary, secondary };
    };

    return (
        <div className="map-picker-container">
            {/* Top Bar: Label & GPS Locate Button */}
            <div className="map-picker-topbar">
                <label className="map-picker-label">{label}</label>
                <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="locate-me-btn"
                    title="Find current GPS location"
                >
                    {isLocating ? (
                        <>
                            <Loader2 size={13} className="animate-spin" />
                            Locating...
                        </>
                    ) : (
                        <>
                            <Crosshair size={13} />
                            Locate Me
                        </>
                    )}
                </button>
            </div>

            {/* Search Input with Autocomplete */}
            <div className="map-search-wrapper" ref={searchWrapperRef}>
                <input
                    type="text"
                    className="map-search-input"
                    placeholder="Search address or landmark..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                />
                <div className="map-search-icon-left">
                    <Search size={15} />
                </div>
                <div className="map-search-icon-right">
                    {isSearching && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--amber, #E2892F)' }} />}
                    {searchQuery.length > 0 && !isSearching && (
                        <button
                            type="button"
                            className="map-search-clear-btn"
                            onClick={clearSearch}
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="map-suggestions" ref={suggestionsListRef}>
                        {suggestions.map((item, index) => {
                            const { primary, secondary } = renderSuggestionParts(item);
                            const isSelected = selectedIndex === index;
                            return (
                                <div
                                    key={item.place_id || index}
                                    className={`map-suggestion-item ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => selectSuggestion(item)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="suggestion-icon-wrap">
                                        <MapPin size={14} />
                                    </div>
                                    <div className="suggestion-text-wrap">
                                        <span className="suggestion-primary">{primary}</span>
                                        {secondary && <span className="suggestion-secondary">{secondary}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Map Canvas */}
            <div
                className={`map-stage-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}
                style={isFullscreen ? {} : { height }}
            >
                {/* Discrete Expand / Exit Button */}
                <button
                    type="button"
                    className="map-picker-expand-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit full screen (Esc)" : "Expand map to full screen for detailed street inspection"}
                    aria-label={isFullscreen ? "Exit full screen" : "Expand map to full screen"}
                >
                    {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    <span>{isFullscreen ? "Exit" : "Expand"}</span>
                </button>

                {/* Fullscreen Top HUD Pill */}
                {isFullscreen && (
                    <div className="map-picker-fullscreen-hud">
                        <MapPin size={13} style={{ color: 'var(--amber, #E2892F)' }} />
                        <span>Pin Inspection Mode • Press Esc to exit</span>
                    </div>
                )}

                {/* Cooperative Gesture Handling Overlay */}
                {gestureHint && (
                    <div className="map-gesture-hint-overlay">
                        <div className="map-gesture-hint-box">
                            <span>{gestureHint}</span>
                        </div>
                    </div>
                )}

                <MapContainer
                    center={mapCenter}
                    zoom={position ? 15 : 5}
                    preferCanvas={true}
                    wheelDebounceTime={40}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        keepBuffer={6}
                        updateWhenZooming={false}
                        updateWhenIdle={true}
                    />

                    {/* Cooperative gestures (touch scroll protection & desktop ctrl+scroll) */}
                    <CooperativeGestures
                        isFullscreen={isFullscreen}
                        onHint={setGestureHint}
                        onClearHint={() => setGestureHint(null)}
                    />

                    <ChangeView center={mapCenter} />
                    <LocationMarker
                        position={position}
                        setPosition={handleSetPosition}
                        onPositionDrag={handlePositionDrag}
                    />

                    {/* GPS Accuracy Circle with Pulse Animation */}
                    {position && gpsActive && gpsAccuracy && (
                        <Circle
                            center={position}
                            radius={Math.max(gpsAccuracy, 25)}
                            pathOptions={{
                                color: 'var(--amber, #E2892F)',
                                fillColor: 'var(--amber, #E2892F)',
                                fillOpacity: 0.16,
                                weight: 1.5,
                                dashArray: '4, 6',
                                className: 'gps-pulse-circle'
                            }}
                        />
                    )}
                </MapContainer>

                {/* GPS Accuracy HUD Pill on the map */}
                {position && gpsActive && gpsAccuracy && (
                    <div className="map-picker-gps-hud">
                        <span className="gps-hud-dot" />
                        GPS locked (±{gpsAccuracy}m)
                    </div>
                )}

                {/* Empty State Overlay */}
                {!position && (
                    <div className="map-empty-overlay">
                        <div className="map-empty-badge">
                            Click on the map to pin location
                        </div>
                    </div>
                )}
            </div>

            {/* Live Resolved Address Pill */}
            {position && (
                <div className="map-picker-address-pill">
                    <div className="map-pill-left">
                        <MapPin size={14} className="map-pill-icon" />
                        <span className="map-pill-prefix">Pin:</span>
                        {isResolving ? (
                            <span className="map-pill-loading">
                                <Loader2 size={12} className="animate-spin" />
                                Resolving address...
                            </span>
                        ) : resolvedAddress ? (
                            <span className="map-pill-address" title={resolvedAddress}>
                                {resolvedAddress}
                            </span>
                        ) : (
                            <span className="map-pill-address">Pinned Location</span>
                        )}
                    </div>
                    <div className="map-pill-right">
                        <span className="map-pill-coords">
                            {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
