import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, Navigation, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import CooperativeGestures from './CooperativeGestures';
import './MapViewer.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to auto-fit map bounds when route changes
function ChangeView({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [bounds, map]);
    return null;
}

export default function MapViewer({
    lat,
    lng,
    label = "Destination",
    height = "250px",
    originLat,
    originLng,
    originLabel = "Origin"
}) {
    const [route, setRoute] = useState(null);
    const [stats, setStats] = useState({ distance: 0, duration: 0 });
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [gestureHint, setGestureHint] = useState(null);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const isValidDest = !isNaN(parsedLat) && !isNaN(parsedLng);
    const destPos = isValidDest ? [parsedLat, parsedLng] : [0, 0];

    const parsedOriginLat = parseFloat(originLat);
    const parsedOriginLng = parseFloat(originLng);
    const hasOrigin = originLat != null && originLng != null && !isNaN(parsedOriginLat) && !isNaN(parsedOriginLng);
    const originPos = hasOrigin ? [parsedOriginLat, parsedOriginLng] : null;

    useEffect(() => {
        if (!hasOrigin) {
            setRoute(null);
            setStats({ distance: 0, duration: 0 });
            return;
        }

        const fallbackCoords = [[parsedOriginLat, parsedOriginLng], [parsedLat, parsedLng]];
        const abortController = new AbortController();

        const fetchRoute = async () => {
            setLoading(true);
            try {
                const timeoutId = setTimeout(() => abortController.abort(), 3500);
                const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${lng},${lat}?overview=simplified&geometries=geojson`;
                const resp = await fetch(url, { signal: abortController.signal });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    const data = await resp.json();
                    if (data.routes && data.routes.length > 0) {
                        const routeData = data.routes[0];
                        let coords = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
                        if (coords.length > 150) {
                            const step = Math.ceil(coords.length / 100);
                            coords = coords.filter((_, idx) => idx % step === 0 || idx === coords.length - 1);
                        }
                        setRoute(coords);
                        setStats({
                            distance: (routeData.distance / 1000).toFixed(1), // km
                            duration: Math.max(1, Math.round(routeData.duration / 60)) // mins
                        });
                        return;
                    }
                }
                // Fallback to straight line if no route returned
                setRoute(fallbackCoords);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.warn("Routing unavailable, falling back to direct line:", err);
                }
                setRoute(fallbackCoords);
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchRoute();

        return () => {
            abortController.abort();
        };
    }, [lat, lng, originLat, originLng, hasOrigin, parsedLat, parsedLng, parsedOriginLat, parsedOriginLng]);

    // Handle Escape key for fullscreen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Prevent body scroll when in fullscreen
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

    if (!lat || !lng || !isValidDest) return null;

    const googleMapsUrl = hasOrigin
        ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    const bounds = route || (hasOrigin ? [originPos, destPos] : [destPos]);

    return (
        <div className="map-viewer-container">
            {/* Topbar Header */}
            <div className="map-viewer-topbar">
                <div className="map-viewer-title">
                    <Navigation size={15} className="map-viewer-title-icon" />
                    <span>{hasOrigin ? `Directions to ${label}` : label}</span>
                    {loading && <span className="map-viewer-calc">(Calculating route...)</span>}
                </div>
                <div className="map-viewer-actions">
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-open-btn"
                        title="Open directions in Google Maps"
                    >
                        <ExternalLink size={13} />
                        Open Maps
                    </a>
                </div>
            </div>

            {/* Map Canvas Stage */}
            <div
                className={`map-viewer-stage ${isFullscreen ? 'is-fullscreen' : ''}`}
                style={isFullscreen ? {} : { height }}
            >
                {/* Discrete Expand / Exit Button */}
                <button
                    type="button"
                    className="map-expand-btn"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? "Exit full screen (Esc)" : "Expand map to full screen for route inspection"}
                    aria-label={isFullscreen ? "Exit full screen" : "Expand map to full screen"}
                >
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    <span>{isFullscreen ? "Exit" : "Expand"}</span>
                </button>

                {/* Fullscreen HUD Pill */}
                {isFullscreen && (
                    <div className="map-fullscreen-hud">
                        <Navigation size={13} style={{ color: 'var(--amber, #E2892F)' }} />
                        <span>Route Inspection Mode • Press Esc to exit</span>
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

                {/* Leaflet Map */}
                <MapContainer
                    center={destPos}
                    zoom={15}
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

                    {hasOrigin && (
                        <Marker position={originPos}>
                            <Popup>
                                <strong>{originLabel}</strong> <br />
                                (Start Point)
                            </Popup>
                        </Marker>
                    )}

                    <Marker position={destPos}>
                        <Popup>
                            <strong>{label}</strong> <br />
                            (Destination)
                        </Popup>
                    </Marker>

                    {route && (
                        <Polyline
                            positions={route}
                            pathOptions={{ color: 'var(--amber, #E2892F)', weight: 5, opacity: 0.85, lineJoin: 'round' }}
                        />
                    )}

                    <ChangeView bounds={bounds} />
                </MapContainer>

                {/* Route Summary Card */}
                {route && stats.distance > 0 && (
                    <div className="route-stats-card">
                        <div className="route-stats-header">
                            <Navigation size={13} />
                            <span>Route Details</span>
                        </div>
                        <div className="route-stats-row">
                            <span>Distance:</span>
                            <span className="route-stats-val">{stats.distance} km</span>
                        </div>
                        <div className="route-stats-row">
                            <span>Duration:</span>
                            <span className="route-stats-val">~{stats.duration} mins</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
