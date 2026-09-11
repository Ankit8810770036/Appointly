import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin, Search } from 'lucide-react';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker position={position} draggable={true} eventHandlers={{
            dragend: (e) => {
                setPosition(e.target.getLatLng());
            }
        }} />
    );
}

// Internal component to handle map movement from outside
function ChangeView({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13);
        }
    }, [center, map]);
    return null;
}

export default function MapPicker({ value, onChange, onAddressUpdate, label = "Pin your home location", height = "250px" }) {
    const initialPos = value?.lat && value?.lng ? { lat: value.lat, lng: value.lng } : null;
    const [position, setPosition] = useState(initialPos);
    const [mapCenter, setMapCenter] = useState(initialPos || { lat: 20.5937, lng: 78.9629 }); // Default to India center
    const [isResolving, setIsResolving] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setIsResolving(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            if (data && data.address && onAddressUpdate) {
                const addr = data.address;
                onAddressUpdate({
                    street: addr.road || addr.suburb || addr.neighbourhood || '',
                    city: addr.city || addr.town || addr.village || addr.municipality || '',
                    state: addr.state || '',
                    zipCode: addr.postcode || '',
                    country: addr.country_code?.toUpperCase() || 'IND'
                });
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

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setMapCenter(newPos);
                handleSetPosition(newPos);
            },
            () => {
                alert("Unable to retrieve your location");
            }
        );
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 3) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Search failed:", error);
        }
    };

    const selectSuggestion = (suggestion) => {
        const newPos = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
        setMapCenter(newPos);
        handleSetPosition(newPos);
        setSearchQuery(suggestion.display_name);
        setSuggestions([]);
        setShowSuggestions(false);

        // If the suggestion already has address components, we can feed them to onAddressUpdate
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

    return (
        <div className="map-picker-container" style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>{label}</label>
                <button
                    type="button"
                    onClick={handleLocateMe}
                    className="locate-me-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: 'var(--fs-xs)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-faint)',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                >
                    <Crosshair size={14} />
                    Locate Me
                </button>
            </div>

            {/* Search Bar */}
            <div className="map-search-wrapper" style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
                <input
                    type="text"
                    className="settings-input"
                    placeholder="Search for an address..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    style={{ width: '100%', paddingLeft: '35px' }}
                />
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Search size={16} />
                </div>

                {showSuggestions && suggestions.length > 0 && (
                    <div className="map-suggestions" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '4px',
                        zIndex: 1000,
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        {suggestions.map((s, i) => (
                            <div
                                key={i}
                                onClick={() => selectSuggestion(s)}
                                style={{
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    fontSize: 'var(--fs-sm)',
                                    borderBottom: i === suggestions.length - 1 ? 'none' : '1px solid var(--border)',
                                    transition: 'background 0.2s',
                                    color: 'var(--text-main)'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-subtle)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {s.display_name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{
                height: height,
                width: '100%',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                position: 'relative'
            }}>
                <MapContainer
                    center={mapCenter}
                    zoom={position ? 15 : 5}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={mapCenter} />
                    <LocationMarker position={position} setPosition={handleSetPosition} />
                </MapContainer>
                {!position && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 400,
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            background: 'white',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--fs-xs)',
                            fontWeight: '600',
                            boxShadow: 'var(--shadow-md)',
                            color: 'var(--text-bold)'
                        }}>
                            Click on the map to pin location
                        </div>
                    </div>
                )}
            </div>
            {position && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} className="text-primary" />
                        Coordinates pinned: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                    </div>
                    {isResolving && (
                        <div style={{ color: 'var(--primary)', fontStyle: 'italic' }}>
                            Resolving address...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
