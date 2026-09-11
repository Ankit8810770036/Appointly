import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, Navigation, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

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
            map.fitBounds(bounds, { padding: [30, 30] });
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

    const destPos = [parseFloat(lat), parseFloat(lng)];
    const hasOrigin = originLat && originLng;
    const originPos = hasOrigin ? [parseFloat(originLat), parseFloat(originLng)] : null;

    useEffect(() => {
        if (!hasOrigin) {
            setRoute(null);
            setStats({ distance: 0, duration: 0 });
            return;
        }

        const fetchRoute = async () => {
            setLoading(true);
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${lng},${lat}?overview=full&geometries=geojson`;
                const resp = await fetch(url);
                const data = await resp.json();

                if (data.routes && data.routes.length > 0) {
                    const routeData = data.routes[0];
                    const coords = routeData.geometry.coordinates.map(c => [c[1], c[0]]);
                    setRoute(coords);
                    setStats({
                        distance: (routeData.distance / 1000).toFixed(1), // km
                        duration: Math.round(routeData.duration / 60)    // mins
                    });
                }
            } catch (err) {
                console.error("Routing error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoute();
    }, [lat, lng, originLat, originLng, hasOrigin]);

    if (!lat || !lng) return null;

    const googleMapsUrl = hasOrigin
        ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${lat},${lng}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    const bounds = route || (hasOrigin ? [originPos, destPos] : [destPos]);

    return (
        <div className="map-viewer-container" style={{ marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: 'var(--text-bold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Navigation size={16} className="text-primary" />
                    <span>{hasOrigin ? `Directions to ${label}` : label}</span>
                    {loading && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>(Calculating...)</span>}
                </div>
                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-button-mini"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'white',
                        textDecoration: 'none',
                        fontWeight: '600',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'var(--primary)',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px var(--primary-faint)'
                    }}
                >
                    <ExternalLink size={14} />
                    Open Maps
                </a>
            </div>

            <div style={{
                height: height,
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                background: 'var(--bg-subtle)'
            }}>
                <MapContainer
                    center={destPos}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                            pathOptions={{ color: 'var(--primary)', weight: 5, opacity: 0.7, lineJoin: 'round' }}
                        />
                    )}

                    <ChangeView bounds={bounds} />
                </MapContainer>

                {route && stats.distance > 0 && (
                    <div className="route-stats-card" style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        zIndex: 1000,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minWidth: '140px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-bold)', fontSize: '0.9rem', fontWeight: '700' }}>
                            <Navigation size={14} className="text-primary" />
                            Route Details
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                            <span>Distance:</span>
                            <span style={{ fontWeight: '600' }}>{stats.distance} km</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                            <span>Duration:</span>
                            <span style={{ fontWeight: '600' }}>~{stats.duration} mins</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
